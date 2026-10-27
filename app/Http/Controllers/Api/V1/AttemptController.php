<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\AttemptStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\StartAttemptRequest;
use App\Http\Requests\Api\V1\SubmitAttemptRequest;
use App\Http\Resources\AttemptResource;
use App\Models\Attempt;
use App\Models\Evaluation;
use App\Models\Student;
use App\Services\EvaluationGrader;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Students are identified only by their DNI (it must be on the student list);
 * the attempt token returned on start is what lets them submit and see their result.
 */
final class AttemptController extends ApiController
{
    public function store(StartAttemptRequest $request, Evaluation $evaluation): JsonResponse
    {
        if (! $evaluation->isAcceptingAttempts()) {
            return $this->notFound('Esta evaluación no está disponible.');
        }

        $student = Student::query()->where('dni', $request->dni)->firstOrFail();

        // A copy of the student's data, as it is today, stays with the attempt.
        $snapshot = [
            'full_name' => $student->full_name,
            'gerencia' => $student->gerencia,
            'puesto' => $student->puesto,
        ];

        // Reopening the form resumes the unfinished attempt instead of starting another one.
        $inProgress = $evaluation->attempts()
            ->where('dni', $request->dni)
            ->where('status', AttemptStatus::InProgress)
            ->first();

        if ($inProgress !== null) {
            $inProgress->update($snapshot);

            return $this->success(new AttemptResource($inProgress), 'Intento retomado');
        }

        $used = $evaluation->attempts()->where('dni', $request->dni)->whereNotNull('submitted_at')->count();

        if ($evaluation->max_attempts !== null && $used >= $evaluation->max_attempts) {
            return $this->error(
                "Ya usaste los {$evaluation->max_attempts} intento(s) permitidos para esta evaluación.",
                Response::HTTP_UNPROCESSABLE_ENTITY,
                ['dni' => ['Alcanzaste el número máximo de intentos.']],
            );
        }

        $attempt = $evaluation->attempts()->make([
            ...$snapshot,
            'dni' => $request->dni,
            'status' => AttemptStatus::InProgress,
            'started_at' => now(),
            'ip' => $request->ip(),
        ]);
        $attempt->student()->associate($student)->save();

        return $this->created(new AttemptResource($attempt), 'Intento iniciado');
    }

    public function submit(SubmitAttemptRequest $request, Attempt $attempt, EvaluationGrader $grader): JsonResponse
    {
        if ($attempt->status !== AttemptStatus::InProgress) {
            return $this->error('Este intento ya fue enviado.', Response::HTTP_CONFLICT);
        }

        if (! $attempt->evaluation->isAcceptingAttempts()) {
            return $this->notFound('Esta evaluación ya no está disponible.');
        }

        $attempt = $grader->submit($attempt, $request->answers());

        return $this->success(new AttemptResource($attempt->load('answers.question.options')), 'Respuestas enviadas');
    }

    public function show(Attempt $attempt): JsonResponse
    {
        return $this->success(new AttemptResource($attempt->load('answers.question.options')));
    }
}
