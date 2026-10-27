<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\EvaluationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * @property int $id
 * @property int $course_id
 * @property string $title
 * @property string|null $description
 * @property float $passing_score
 * @property int|null $max_attempts
 * @property bool $show_correct_answers
 * @property bool $is_published
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Course $course
 * @property-read Collection<int, Question> $questions
 * @property-read Collection<int, Attempt> $attempts
 * @property-read int|null $questions_count
 * @property-read int|null $attempts_count
 */
#[Fillable([
    'title',
    'description',
    'passing_score',
    'max_attempts',
    'show_correct_answers',
    'is_published',
])]
final class Evaluation extends Model
{
    /** @use HasFactory<EvaluationFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'passing_score' => 0,
        'show_correct_answers' => false,
        'is_published' => false,
    ];

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return HasMany<Question, $this>
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasMany<Attempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(Attempt::class);
    }

    /**
     * Whether students can currently take this evaluation.
     */
    public function isAcceptingAttempts(): bool
    {
        return $this->is_published
            && $this->course->is_published
            && $this->questions()->exists();
    }

    public function totalPoints(): float
    {
        return (float) $this->questions()->sum('points');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'passing_score' => 'float',
            'max_attempts' => 'integer',
            'show_correct_answers' => 'boolean',
            'is_published' => 'boolean',
        ];
    }
}
