<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Evaluation;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The form a student fills in.
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
            'title' => $this->title,
            'description' => $this->description,
            'passing_score' => $this->passing_score,
            'max_attempts' => $this->max_attempts,
            'total_points' => $this->questions->sum(fn (Question $question): float => $question->points),
            'course' => [
                'title' => $this->course->title,
                'slug' => $this->course->slug,
            ],
            'questions' => QuestionResource::collection($this->questions),
        ];
    }
}
