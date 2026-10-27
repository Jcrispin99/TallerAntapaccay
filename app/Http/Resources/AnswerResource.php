<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Answer;
use App\Models\QuestionOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An answer next to its answer key. Only exposed to students when the
 * evaluation shows correct answers, and always to the admin.
 *
 * @mixin Answer
 */
final class AnswerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $question = $this->question;
        $selected = $this->selected_option_ids ?? [];

        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'question' => [
                'type' => $question->type,
                'prompt' => $question->prompt,
                'points' => $question->points,
                'accepted_answers' => $question->acceptedAnswers(),
                'deleted' => $question->trashed(),
            ],
            'text_value' => $this->text_value,
            'selected_option_ids' => $selected,
            'options' => $question->options
                ->filter(fn (QuestionOption $option): bool => ! $option->trashed() || in_array($option->id, $selected, true))
                ->map(fn (QuestionOption $option): array => [
                    'id' => $option->id,
                    'label' => $option->label,
                    'is_correct' => $option->is_correct,
                ])->values(),
            'points_awarded' => $this->points_awarded,
            'is_correct' => $this->is_correct,
            'graded_manually' => $this->graded_manually,
        ];
    }
}
