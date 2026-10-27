<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Someone allowed to take evaluations. Only DNIs on this list can start an attempt.
 *
 * @property int $id
 * @property string $dni
 * @property string $full_name
 * @property string|null $gerencia
 * @property string|null $puesto
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Attempt> $attempts
 */
#[Fillable([
    'dni',
    'full_name',
    'gerencia',
    'puesto',
])]
final class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    /**
     * Same DNI however it was typed or exported: no spaces, dots or dashes, uppercase,
     * and numeric DNIs padded back to 8 digits (Excel drops leading zeros).
     */
    public static function normalizeDni(mixed $value): string
    {
        if (is_float($value)) {
            $value = (int) $value;
        }

        $dni = mb_strtoupper((string) preg_replace('/[\s.\-]+/u', '', is_scalar($value) ? (string) $value : ''));

        return ctype_digit($dni) && mb_strlen($dni) < 8 ? mb_str_pad($dni, 8, '0', STR_PAD_LEFT) : $dni;
    }

    public static function isValidDni(string $dni): bool
    {
        return preg_match('/^[A-Z0-9]{6,12}$/', $dni) === 1;
    }

    /**
     * @return HasMany<Attempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(Attempt::class);
    }

    protected static function booted(): void
    {
        self::saving(function (Student $student): void {
            $student->dni = self::normalizeDni($student->dni);
        });
    }
}
