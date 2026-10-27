<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ConversionStatus;
use App\Models\Material;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Browsers cannot display PPT/PPTX, so presentations are converted to PDF
 * with LibreOffice and shown in the browser's PDF viewer.
 */
#[Tries(1)]
final class ConvertPresentationToPdf implements ShouldQueue
{
    use Queueable;

    public int $timeout;

    public function __construct(public Material $material)
    {
        $this->timeout = config()->integer('platform.conversion_timeout') + 30;
    }

    public function handle(): void
    {
        $this->material->update(['conversion_status' => ConversionStatus::Processing, 'conversion_error' => null]);

        $outputDir = storage_path('app/conversions/'.$this->material->id);

        try {
            $this->material->update([
                'pdf_path' => $this->convert($outputDir),
                'conversion_status' => ConversionStatus::Ready,
            ]);
        } catch (Throwable $throwable) {
            report($throwable);
            $this->failed($throwable);
        } finally {
            File::deleteDirectory($outputDir);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->material->update([
            'conversion_status' => ConversionStatus::Failed,
            'conversion_error' => $exception?->getMessage(),
        ]);
    }

    /**
     * Convert the presentation and return the path of the PDF on the public disk.
     */
    private function convert(string $outputDir): string
    {
        $disk = Storage::disk('public');
        $binary = config()->string('platform.libreoffice_path');

        throw_unless(is_executable($binary), RuntimeException::class, "No se encontró LibreOffice en {$binary}. Instálalo o configura LIBREOFFICE_PATH.");

        File::ensureDirectoryExists($outputDir);

        // A dedicated profile per run lets several conversions run in parallel.
        $result = Process::timeout(config()->integer('platform.conversion_timeout'))->run([
            $binary,
            '-env:UserInstallation=file://'.$outputDir.'/profile',
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', $outputDir,
            $disk->path($this->material->path),
        ]);

        $pdf = $outputDir.'/'.pathinfo($this->material->path, PATHINFO_FILENAME).'.pdf';

        if ($result->failed() || ! is_file($pdf)) {
            throw new RuntimeException(mb_trim('LibreOffice no pudo convertir el archivo. '.$result->errorOutput()));
        }

        $pdfPath = dirname($this->material->path).'/'.basename($pdf);
        $disk->put($pdfPath, (string) file_get_contents($pdf));

        return $pdfPath;
    }
}
