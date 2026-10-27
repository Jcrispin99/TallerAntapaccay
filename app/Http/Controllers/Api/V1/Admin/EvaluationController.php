<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\SaveEvaluationRequest;
use App\Http\Resources\Admin\EvaluationResource;
use App\Models\Course;
use App\Models\Evaluation;
use App\Services\EvaluationFormSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class EvaluationController extends ApiController
{
    public function show(Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        return $this->success(new EvaluationResource($this->evaluationFor($course)->load('questions.options')));
    }

    public function update(SaveEvaluationRequest $request, Course $course, EvaluationFormSync $sync): JsonResponse
    {
        Gate::authorize('manage', $course);

        /** @var array{title: string, description?: string|null, passing_score: float|int|string, max_attempts?: int|null, show_correct_answers?: bool, is_published?: bool, questions: list<array{id?: int|null, type: string, prompt: string, help_text?: string|null, points: float|int|string, required?: bool, accepted_answers?: list<string>|null, options?: list<array{id?: int|null, label: string, is_correct?: bool}>}>} $data */
        $data = $request->validated();

        $evaluation = $sync->sync($this->evaluationFor($course), $data);

        return $this->success(new EvaluationResource($evaluation), 'Evaluación guardada');
    }

    /**
     * Every course has exactly one evaluation, created on first use.
     */
    private function evaluationFor(Course $course): Evaluation
    {
        return $course->evaluation()->firstOrCreate([], ['title' => 'Evaluación: '.$course->title]);
    }
}
