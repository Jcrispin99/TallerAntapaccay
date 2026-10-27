<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Evaluation;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The evaluation with its answer key, in the shape the form builder edits.
 *
 * @mixin Evaluation
 */
final class EvaluationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'description' => $this->description,
            'passing_score' => $this->passing_score,
            'max_attempts' => $this->max_attempts,
            'show_correct_answers' => $this->show_correct_answers,
            'is_published' => $this->is_published,
            'attempts_count' => $this->attempts()->count(),
            'questions' => $this->questions->map(fn (Question $question): array => [
                'id' => $question->id,
                'type' => $question->type,
                'prompt' => $question->prompt,
                'help_text' => $question->help_text,
                'points' => $question->points,
                'required' => $question->required,
                'accepted_answers' => $question->acceptedAnswers(),
                'options' => $question->options->map(fn (QuestionOption $option): array => [
                    'id' => $option->id,
                    'label' => $option->label,
                    'is_correct' => $option->is_correct,
                ])->values(),
            ])->values(),
        ];
    }
}
