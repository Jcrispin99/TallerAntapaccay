<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\AnswerResource;
use App\Models\Answer;
use App\Models\Attempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Attempt
 */
final class AttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'dni' => $this->dni,
            'full_name' => $this->full_name,
            'gerencia' => $this->gerencia,
            'puesto' => $this->puesto,
            'status' => $this->status,
            'score' => $this->score,
            'max_score' => $this->max_score,
            'passed' => $this->passed,
            'started_at' => $this->started_at->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'ip' => $this->ip,
            'answers' => $this->whenLoaded('answers', fn () => AnswerResource::collection(
                $this->answers->sortBy(fn (Answer $answer): int => $answer->question->position)->values(),
            )),
        ];
    }
}
