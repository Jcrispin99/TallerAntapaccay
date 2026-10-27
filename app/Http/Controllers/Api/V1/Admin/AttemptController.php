<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AttemptStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Admin\AttemptResource;
use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AttemptController extends ApiController
{
    /**
     * Submitted attempts of a course's evaluation.
     * Filters: filter[search] (DNI or name), filter[gerencia], filter[status].
     */
    public function index(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        $evaluation = $course->evaluation;

        if ($evaluation === null) {
            return $this->success(['items' => [], 'meta' => ['current_page' => 1, 'last_page' => 1, 'total' => 0], 'summary' => $this->summary(null), 'gerencias' => []]);
        }

        $page = QueryBuilder::for($evaluation->attempts()->whereNotNull('submitted_at'))
            ->allowedFilters(
                AllowedFilter::callback('search', fn (Builder $query, mixed $value) => $query->where(
                    fn (Builder $query) => $query->where('dni', 'like', '%'.$this->scalar($value).'%')->orWhere('full_name', 'like', '%'.$this->scalar($value).'%'),
                )),
                AllowedFilter::exact('gerencia'),
                AllowedFilter::exact('status'),
            )
            ->allowedSorts('submitted_at', 'score', 'dni')
            ->defaultSort('-submitted_at')
            ->paginate(25)
            ->withQueryString();

        return $this->success([
            'items' => AttemptResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'summary' => $this->summary($evaluation),
            'gerencias' => $evaluation->attempts()->whereNotNull('gerencia')->distinct()->orderBy('gerencia')->pluck('gerencia'),
        ]);
    }

    public function show(Attempt $attempt): JsonResponse
    {
        Gate::authorize('manage', $attempt->evaluation->course);

        $attempt->load(['answers.question.options' => fn ($query) => $query->withTrashed()]);

        return $this->success(new AttemptResource($attempt));
    }

    /**
     * One row per submitted attempt and one column per question, like a Forms export.
     */
    public function export(Course $course): StreamedResponse
    {
        Gate::authorize('manage', $course);

        $evaluationId = $course->evaluation?->id;

        // Removed questions are kept only if someone answered them.
        $questions = Question::withTrashed()
            ->where('evaluation_id', $evaluationId)
            ->where(fn (Builder $query) => $query->whereNull('deleted_at')->orWhereIn('id', Answer::query()->select('question_id')))
            ->with(['options' => fn ($query) => $query->withTrashed()])
            ->orderBy('position')
            ->get();

        $attempts = Attempt::query()
            ->where('evaluation_id', $evaluationId)
            ->whereNotNull('submitted_at')
            ->with('answers')
            ->oldest('submitted_at')
            ->get();

        return response()->streamDownload(function () use ($questions, $attempts): void {
            $out = fopen('php://output', 'w');
            assert($out !== false);

            // UTF-8 BOM so Excel shows accents correctly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['DNI', 'Nombre', 'Gerencia', 'Puesto', 'Enviado', 'Estado', 'Nota', 'Puntaje máximo', 'Aprobado', ...$questions->map(fn (Question $question): string => $question->prompt)->all()], escape: '');

            foreach ($attempts as $attempt) {
                $answers = $attempt->answers->keyBy('question_id');

                fputcsv($out, [
                    $attempt->dni,
                    $attempt->full_name,
                    $attempt->gerencia,
                    $attempt->puesto,
                    $attempt->submitted_at?->format('Y-m-d H:i'),
                    $attempt->status === AttemptStatus::PendingReview ? 'Pendiente de revisión' : 'Calificado',
                    $attempt->score,
                    $attempt->max_score,
                    match ($attempt->passed) {
                        true => 'Sí',
                        false => 'No',
                        null => '',
                    },
                    ...$questions->map(fn (Question $question): string => $this->answerText($question, $answers->get($question->id)))->all(),
                ], escape: '');
            }

            fclose($out);
        }, 'resultados-'.$course->slug.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{attempts: int, passed: int, pending_review: int, average_score: float|null, max_score: float}
     */
    private function summary(?Evaluation $evaluation): array
    {
        if (! $evaluation instanceof Evaluation) {
            return ['attempts' => 0, 'passed' => 0, 'pending_review' => 0, 'average_score' => null, 'max_score' => 0.0];
        }

        /** @var Builder<Attempt> $submitted */
        $submitted = $evaluation->attempts()->whereNotNull('submitted_at')->getQuery();
        $average = (clone $submitted)->where('status', AttemptStatus::Graded)->avg('score');

        return [
            'attempts' => (clone $submitted)->count(),
            'passed' => (clone $submitted)->where('passed', true)->count(),
            'pending_review' => (clone $submitted)->where('status', AttemptStatus::PendingReview)->count(),
            'average_score' => $average === null ? null : round((float) $average, 2),
            'max_score' => $evaluation->totalPoints(),
        ];
    }

    private function scalar(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }

    private function answerText(Question $question, ?Answer $answer): string
    {
        if (! $answer instanceof Answer) {
            return '';
        }

        if ($answer->text_value !== null) {
            return $answer->text_value;
        }

        return $question->options
            ->filter(fn (QuestionOption $option): bool => in_array($option->id, $answer->selected_option_ids ?? [], true))
            ->pluck('label')
            ->implode('; ');
    }
}
