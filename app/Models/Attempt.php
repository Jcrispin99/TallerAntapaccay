<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AttemptStatus;
use Database\Factories\AttemptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $evaluation_id
 * @property int|null $student_id
 * @property string $token
 * @property string $dni
 * @property string|null $full_name
 * @property string|null $gerencia
 * @property string|null $puesto
 * @property AttemptStatus $status
 * @property float|null $score
 * @property float|null $max_score
 * @property bool|null $passed
 * @property Carbon $started_at
 * @property Carbon|null $submitted_at
 * @property string|null $ip
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Evaluation $evaluation
 * @property-read Student|null $student
 * @property-read Collection<int, Answer> $answers
 */
#[Fillable([
    'dni',
    'full_name',
    'gerencia',
    'puesto',
    'status',
    'score',
    'max_score',
    'passed',
    'started_at',
    'submitted_at',
    'ip',
])]
final class Attempt extends Model
{
    /** @use HasFactory<AttemptFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Evaluation, $this>
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return HasMany<Answer, $this>
     */
    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class);
    }

    protected static function booted(): void
    {
        self::creating(function (Attempt $attempt): void {
            $attempt->token = (string) Str::ulid();
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AttemptStatus::class,
            'score' => 'float',
            'max_score' => 'float',
            'passed' => 'boolean',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }
}
