<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AnswerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $attempt_id
 * @property int $question_id
 * @property string|null $text_value
 * @property list<int>|null $selected_option_ids
 * @property float|null $points_awarded
 * @property bool|null $is_correct
 * @property bool $graded_manually
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Attempt $attempt
 * @property-read Question $question
 */
#[Fillable([
    'question_id',
    'text_value',
    'selected_option_ids',
    'points_awarded',
    'is_correct',
    'graded_manually',
])]
final class Answer extends Model
{
    /** @use HasFactory<AnswerFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Attempt, $this>
     */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(Attempt::class);
    }

    /**
     * Questions removed from the form keep their answers readable.
     *
     * @return BelongsTo<Question, $this>
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class)->withTrashed();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'selected_option_ids' => 'array',
            'points_awarded' => 'float',
            'is_correct' => 'boolean',
            'graded_manually' => 'boolean',
        ];
    }
}
