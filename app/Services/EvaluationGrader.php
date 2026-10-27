<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AttemptStatus;
use App\Enums\QuestionType;
use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Question;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class EvaluationGrader
{
    /**
     * Store and grade the responses of an attempt.
     *
     * @param  array<array-key, mixed>  $responses  Keyed by question id: a string for text
     *                                              questions, option id(s) for choice questions.
     *
     * @throws ValidationException
     */
    public function submit(Attempt $attempt, array $responses): Attempt
    {
        $questions = $attempt->evaluation->questions()->with('options')->get();

        $errors = [];
        $graded = [];

        foreach ($questions as $question) {
            $answer = $this->normalize($question, $responses[$question->id] ?? null);

            if ($question->required && $answer['text_value'] === null && $answer['selected_option_ids'] === null) {
                $errors['answers.'.$question->id] = ['Esta pregunta es obligatoria.'];
            }

            $graded[] = [...$answer, ...$this->grade($question, $answer), 'question_id' => $question->id];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return DB::transaction(function () use ($attempt, $questions, $graded): Attempt {
            $attempt->answers()->createMany($graded);

            $attempt->submitted_at = now();
            $attempt->max_score = $questions->sum(fn (Question $question): float => $question->points);

            return $this->recalculate($attempt);
        });
    }

    /**
     * Manually set the points of an answer (open questions, or overriding the automatic grade).
     */
    public function gradeManually(Answer $answer, float $points): Attempt
    {
        $answer->points_awarded = $points;
        $answer->is_correct = $answer->question->points > 0 ? $points >= $answer->question->points : null;
        $answer->graded_manually = true;
        $answer->save();

        return $this->recalculate($answer->attempt);
    }

    public function recalculate(Attempt $attempt): Attempt
    {
        $answers = $attempt->answers()->get();
        $pending = $answers->contains(fn (Answer $answer): bool => $answer->points_awarded === null);

        $attempt->score = round($answers->sum(fn (Answer $answer): float => $answer->points_awarded ?? 0.0), 2);
        $attempt->status = $pending ? AttemptStatus::PendingReview : AttemptStatus::Graded;
        $attempt->passed = $pending ? null : $attempt->score >= $attempt->evaluation->passing_score;
        $attempt->save();

        return $attempt;
    }

    /**
     * @return array{text_value: string|null, selected_option_ids: list<int>|null}
     */
    private function normalize(Question $question, mixed $value): array
    {
        if (! $question->type->hasOptions()) {
            $text = is_scalar($value) ? mb_trim((string) $value) : '';

            return ['text_value' => $text === '' ? null : $text, 'selected_option_ids' => null];
        }

        $validIds = $question->options->pluck('id')->all();
        $selected = array_values(array_unique(array_filter(
            array_map(intval(...), array_filter((array) $value, is_numeric(...))),
            fn (int $id): bool => in_array($id, $validIds, true),
        )));

        if ($question->type !== QuestionType::MultipleChoice) {
            $selected = array_slice($selected, 0, 1);
        }

        return ['text_value' => null, 'selected_option_ids' => $selected === [] ? null : $selected];
    }

    /**
     * A null points_awarded means the answer needs manual review.
     *
     * @param  array{text_value: string|null, selected_option_ids: list<int>|null}  $answer
     * @return array{points_awarded: float|null, is_correct: bool|null}
     */
    private function grade(Question $question, array $answer): array
    {
        // Questions worth nothing (e.g. a survey question) are never graded.
        if ($question->points <= 0) {
            return ['points_awarded' => 0.0, 'is_correct' => null];
        }

        $correct = match ($question->type) {
            QuestionType::SingleChoice, QuestionType::Dropdown, QuestionType::MultipleChoice => $this->matchesCorrectOptions($question, $answer['selected_option_ids'] ?? []),
            QuestionType::ShortText => $this->matchesAcceptedAnswer($question, $answer['text_value']),
            QuestionType::Paragraph => $answer['text_value'] === null ? false : null,
        };

        return [
            'points_awarded' => match ($correct) {
                true => $question->points,
                false => 0.0,
                null => null,
            },
            'is_correct' => $correct,
        ];
    }

    /**
     * All-or-nothing: the selection must be exactly the set of correct options.
     *
     * @param  list<int>  $selected
     */
    private function matchesCorrectOptions(Question $question, array $selected): bool
    {
        $correct = $question->options->where('is_correct', true)->pluck('id')->sort()->values()->all();
        sort($selected);

        return $correct !== [] && $selected === $correct;
    }

    /**
     * Null when the question has no accepted answers and must be reviewed by hand.
     */
    private function matchesAcceptedAnswer(Question $question, ?string $text): ?bool
    {
        if ($text === null) {
            return false;
        }

        $accepted = $question->acceptedAnswers();

        if ($accepted === []) {
            return null;
        }

        return in_array($this->normalizeText($text), array_map($this->normalizeText(...), $accepted), true);
    }

    private function normalizeText(string $text): string
    {
        return Str::of($text)->ascii()->lower()->squish()->toString();
    }
}
