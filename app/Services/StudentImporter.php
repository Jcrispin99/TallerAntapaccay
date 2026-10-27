<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Student;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use OpenSpout\Reader\CSV\Options as CsvOptions;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\ODS\Reader as OdsReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Loads the student list from an Excel (.xlsx), .ods or .csv file.
 *
 * Columns are found by their header, in any order: DNI, Nombre (or "Apellidos y
 * nombres", or separate "Nombres" and "Apellidos"), Gerencia and Puesto (or "Cargo").
 * Rows are matched by DNI: existing students are updated, new ones created.
 */
final class StudentImporter
{
    private const int MAX_REPORTED_ERRORS = 50;

    /**
     * @return array{created: int, updated: int, skipped: int, errors: list<array{row: int, message: string}>}
     *
     * @throws ValidationException
     */
    public function import(string $path, string $extension): array
    {
        $rows = $this->readRows($path, mb_strtolower($extension));
        $columns = null;
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        DB::transaction(function () use ($rows, &$columns, &$result): void {
            foreach ($rows as $number => $cells) {
                if ($columns === null) {
                    $columns = $this->detectColumns($cells);

                    continue;
                }

                $error = $this->importRow($cells, $columns, $result);

                if ($error !== null) {
                    $result['skipped']++;

                    if (count($result['errors']) < self::MAX_REPORTED_ERRORS) {
                        $result['errors'][] = ['row' => $number, 'message' => $error];
                    }
                }
            }
        });

        if ($columns === null) {
            throw ValidationException::withMessages(['file' => 'El archivo está vacío.']);
        }

        return $result;
    }

    /**
     * Non-empty rows of the first sheet, keyed by their row number in the file.
     *
     * @return iterable<int, list<mixed>>
     */
    private function readRows(string $path, string $extension): iterable
    {
        $reader = $this->readerFor($path, $extension);
        $reader->open($path);

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $key => $row) {
                    $cells = array_values($row->toArray());

                    if (array_filter($cells, fn (mixed $cell): bool => $this->text($cell) !== '') !== []) {
                        yield (is_int($key) ? $key : 0) => $cells;
                    }
                }

                break; // Only the first sheet.
            }
        } finally {
            $reader->close();
        }
    }

    private function readerFor(string $path, string $extension): XlsxReader|OdsReader|CsvReader
    {
        if ($extension === 'xlsx') {
            return new XlsxReader;
        }

        if ($extension === 'ods') {
            return new OdsReader;
        }

        // Excel in Spanish saves CSV with ";" and often in Windows-1252.
        $sample = (string) file_get_contents($path, length: 4096);
        $firstLine = strtok($sample, "\r\n") ?: '';

        return new CsvReader(new CsvOptions(
            FIELD_DELIMITER: mb_substr_count($firstLine, ';') > mb_substr_count($firstLine, ',') ? ';' : ',',
            ENCODING: mb_check_encoding($sample, 'UTF-8') ? 'UTF-8' : 'Windows-1252',
        ));
    }

    /**
     * @param  list<mixed>  $header
     * @return array{dni: int, name: int|null, first_names: int|null, last_names: int|null, gerencia: int|null, puesto: int|null}
     *
     * @throws ValidationException
     */
    private function detectColumns(array $header): array
    {
        $columns = ['dni' => null, 'name' => null, 'first_names' => null, 'last_names' => null, 'gerencia' => null, 'puesto' => null];

        foreach ($header as $index => $cell) {
            $title = Str::of($this->text($cell))->ascii()->lower()->squish()->toString();

            $key = match (true) {
                str_contains($title, 'dni') || str_contains($title, 'documento') => 'dni',
                str_contains($title, 'apellido') && str_contains($title, 'nombre'),
                in_array($title, ['nombre', 'nombre completo', 'colaborador', 'trabajador', 'alumno', 'participante'], true) => 'name',
                str_contains($title, 'apellido') => 'last_names',
                str_contains($title, 'nombre') => 'first_names',
                str_contains($title, 'gerencia') => 'gerencia',
                str_contains($title, 'puesto') || str_contains($title, 'cargo') => 'puesto',
                default => null,
            };

            if ($key !== null && $columns[$key] === null) {
                $columns[$key] = $index;
            }
        }

        // A lone "Nombres" column is the full name.
        if ($columns['name'] === null && $columns['last_names'] === null) {
            [$columns['name'], $columns['first_names']] = [$columns['first_names'], null];
        }

        if ($columns['dni'] === null || ($columns['name'] === null && $columns['first_names'] === null)) {
            throw ValidationException::withMessages([
                'file' => 'No encontré las columnas "DNI" y "Nombre" en la primera fila. Descarga la plantilla para ver el formato.',
            ]);
        }

        return $columns;
    }

    /**
     * @param  list<mixed>  $cells
     * @param  array{dni: int, name: int|null, first_names: int|null, last_names: int|null, gerencia: int|null, puesto: int|null}  $columns
     * @param  array{created: int, updated: int, skipped: int, errors: list<array{row: int, message: string}>}  $result
     * @return string|null Why the row was skipped.
     */
    private function importRow(array $cells, array $columns, array &$result): ?string
    {
        $cell = fn (?int $index): string => $index === null ? '' : $this->text($cells[$index] ?? null);

        $dni = Student::normalizeDni($cells[$columns['dni']] ?? null);
        $name = $columns['name'] !== null
            ? $cell($columns['name'])
            : mb_trim($cell($columns['first_names']).' '.$cell($columns['last_names']));

        if ($dni === '') {
            return 'Falta el DNI.';
        }

        if (! Student::isValidDni($dni)) {
            return "DNI inválido: {$dni}.";
        }

        if ($name === '') {
            return "Falta el nombre (DNI {$dni}).";
        }

        $student = Student::query()->firstOrNew(['dni' => $dni]);
        $student->fill([
            'full_name' => Str::limit($name, 255, ''),
            'gerencia' => Str::limit($cell($columns['gerencia']), 255, '') ?: null,
            'puesto' => Str::limit($cell($columns['puesto']), 255, '') ?: null,
        ]);

        if (! $student->exists) {
            $result['created']++;
        } elseif ($student->isDirty()) {
            $result['updated']++;
        }

        $student->save();

        return null;
    }

    private function text(mixed $value): string
    {
        return match (true) {
            is_float($value) && floor($value) === $value => (string) (int) $value,
            is_scalar($value) => Str::squish((string) $value),
            $value instanceof DateTimeInterface => $value->format('Y-m-d'),
            default => '',
        };
    }
}
