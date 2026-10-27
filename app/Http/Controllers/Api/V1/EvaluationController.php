<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\EvaluationResource;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

final class EvaluationController extends ApiController
{
    public function show(Course $course): JsonResponse
    {
        $evaluation = $course->evaluation;

        if ($evaluation === null || ! $evaluation->isAcceptingAttempts()) {
            return $this->notFound('Este curso no tiene una evaluación disponible.');
        }

        return $this->success(new EvaluationResource($evaluation->load('questions.options')));
    }
}
