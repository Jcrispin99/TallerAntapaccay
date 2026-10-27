<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QuestionType;
use Database\Factories\QuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * @property int $id
 * @property int $evaluation_id
 * @property QuestionType $type
 * @property string $prompt
 * @property string|null $help_text
 * @property float $points
 * @property bool $required
 * @property int $position
 * @property array{accepted_answers?: list<string>}|null $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Evaluation $evaluation
 * @property-read Collection<int, QuestionOption> $options
 */
#[Fillable([
    'type',
    'prompt',
    'help_text',
    'points',
    'required',
    'position',
    'settings',
])]
final class Question extends Model
{
    /** @use HasFactory<QuestionFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * @return BelongsTo<Evaluation, $this>
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    /**
     * @return HasMany<QuestionOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return list<string>
     */
    public function acceptedAnswers(): array
    {
        return array_values(array_filter(
            $this->settings['accepted_answers'] ?? [],
            fn (string $answer): bool => mb_trim($answer) !== '',
        ));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => QuestionType::class,
            'points' => 'float',
            'required' => 'boolean',
            'position' => 'integer',
            'settings' => 'array',
        ];
    }
}
