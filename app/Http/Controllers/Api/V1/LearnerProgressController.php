<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\AttemptStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\StartAttemptRequest;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\MaterialView;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Http\JsonResponse;

/**
 * Where a student stands in every published course: how much material they
 * finished and how their evaluation went. Drives the "Mis talleres" page.
 */
final class LearnerProgressController extends ApiController
{
    public function show(StartAttemptRequest $request): JsonResponse
    {
        $student = $request->student();

        $courses = Course::query()
            ->where('is_published', true)
            ->withCount('materials')
            ->with(['evaluation' => fn (HasOne $query) => $query->withCount('questions')])
            ->get();

        $views = $student->materialViews()->with('material:id,course_id')->get()
            ->groupBy(fn (MaterialView $view): int => $view->material->course_id);

        $attempts = Attempt::query()
            ->where('dni', $student->dni)
            ->whereNotNull('submitted_at')
            ->get()
            ->groupBy('evaluation_id');

        return $this->success([
            'student' => ['dni' => $student->dni, 'full_name' => $student->full_name, 'gerencia' => $student->gerencia],
            'courses' => $courses->map(fn (Course $course): array => [
                'course_id' => $course->id,
                'materials_total' => $course->materials_count ?? 0,
                'materials_completed' => $views->get($course->id)?->whereNotNull('completed_at')->count() ?? 0,
                'started' => $views->has($course->id),
                'evaluation' => $course->evaluation instanceof Evaluation
                    ? $this->evaluationSummary($course->evaluation, $attempts->get($course->evaluation->id) ?? new Collection)
                    : null,
            ])->values(),
        ]);
    }

    /**
     * @param  Collection<int, Attempt>  $attempts  The student's submitted attempts.
     * @return array<string, mixed>
     */
    private function evaluationSummary(Evaluation $evaluation, Collection $attempts): array
    {
        $best = $attempts->sortByDesc('score')->first();

        return [
            'attempts_used' => $attempts->count(),
            'max_attempts' => $evaluation->max_attempts,
            'passed' => $attempts->contains('passed', true),
            'pending_review' => $attempts->contains('status', AttemptStatus::PendingReview),
            'best_score' => $best?->score,
            'max_score' => $best?->max_score,
        ];
    }
}
