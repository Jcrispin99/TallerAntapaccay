<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\GradeAnswerRequest;
use App\Http\Resources\Admin\AttemptResource;
use App\Models\Answer;
use App\Services\EvaluationGrader;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class AnswerController extends ApiController
{
    public function grade(GradeAnswerRequest $request, Answer $answer, EvaluationGrader $grader): JsonResponse
    {
        Gate::authorize('manage', $answer->attempt->evaluation->course);

        $attempt = $grader->gradeManually($answer, $request->points());

        $attempt->load(['answers.question.options' => fn ($query) => $query->withTrashed()]);

        return $this->success(new AttemptResource($attempt), 'Calificación guardada');
    }
}
