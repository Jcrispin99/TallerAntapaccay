<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Answer;
use App\Models\Attempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The attempt as seen by the student who took it (identified by its token).
 *
 * @mixin Attempt
 */
final class AttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $evaluation = $this->evaluation;
        $showReview = $evaluation->show_correct_answers && $this->submitted_at !== null;

        return [
            'token' => $this->token,
            'dni' => $this->dni,
            'full_name' => $this->full_name,
            'status' => $this->status,
            'score' => $this->score,
            'max_score' => $this->max_score,
            'passed' => $this->passed,
            'started_at' => $this->started_at->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'evaluation' => [
                'id' => $evaluation->id,
                'title' => $evaluation->title,
                'passing_score' => $evaluation->passing_score,
                'course_title' => $evaluation->course->title,
                'course_slug' => $evaluation->course->slug,
            ],
            'review' => $this->when($showReview, fn () => AnswerResource::collection(
                $this->answers->sortBy(fn (Answer $answer): int => $answer->question->position)->values(),
            )),
        ];
    }
}
