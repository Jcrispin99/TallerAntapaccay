<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\QuestionType;
use App\Models\Evaluation;
use App\Models\Question;
use Illuminate\Support\Facades\DB;

/**
 * Saves the whole evaluation form at once, as the admin builder sends it.
 *
 * Existing questions and options are updated in place (matched by id) and the
 * ones missing from the payload are soft-deleted, so past attempts keep
 * pointing at the questions they answered.
 *
 * @phpstan-type OptionData array{id?: int|null, label: string, is_correct?: bool}
 * @phpstan-type QuestionData array{id?: int|null, type: string, prompt: string, help_text?: string|null, points: float|int|string, required?: bool, accepted_answers?: list<string>|null, options?: list<OptionData>}
 */
final class EvaluationFormSync
{
    /**
     * @param  array{title: string, description?: string|null, passing_score: float|int|string, max_attempts?: int|null, show_correct_answers?: bool, is_published?: bool, questions: list<QuestionData>}  $data
     */
    public function sync(Evaluation $evaluation, array $data): Evaluation
    {
        return DB::transaction(function () use ($evaluation, $data): Evaluation {
            $evaluation->fill([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'passing_score' => $data['passing_score'],
                'max_attempts' => $data['max_attempts'] ?? null,
                'show_correct_answers' => $data['show_correct_answers'] ?? false,
                'is_published' => $data['is_published'] ?? false,
            ])->save();

            $existing = $evaluation->questions()->get()->keyBy('id');
            $keptIds = [];

            foreach ($data['questions'] as $position => $questionData) {
                $question = $existing->get($questionData['id'] ?? 0) ?? $evaluation->questions()->make();
                $type = QuestionType::from($questionData['type']);
                $acceptedAnswers = $questionData['accepted_answers'] ?? [];

                $question->fill([
                    'type' => $type,
                    'prompt' => $questionData['prompt'],
                    'help_text' => $questionData['help_text'] ?? null,
                    'points' => $questionData['points'],
                    'required' => $questionData['required'] ?? true,
                    'position' => $position,
                    'settings' => $type === QuestionType::ShortText && $acceptedAnswers !== []
                        ? ['accepted_answers' => $acceptedAnswers]
                        : null,
                ])->save();

                $this->syncOptions($question, $type->hasOptions() ? $questionData['options'] ?? [] : []);

                $keptIds[] = $question->id;
            }

            $evaluation->questions()->whereNotIn('id', $keptIds)->get()->each->delete();

            return $evaluation->load('questions.options');
        });
    }

    /**
     * @param  list<OptionData>  $options
     */
    private function syncOptions(Question $question, array $options): void
    {
        $existing = $question->options()->get()->keyBy('id');
        $keptIds = [];

        foreach ($options as $position => $optionData) {
            $option = $existing->get($optionData['id'] ?? 0) ?? $question->options()->make();

            $option->fill([
                'label' => $optionData['label'],
                'is_correct' => $optionData['is_correct'] ?? false,
                'position' => $position,
            ])->save();

            $keptIds[] = $option->id;
        }

        $question->options()->whereNotIn('id', $keptIds)->get()->each->delete();
    }
}
