<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Enums\QuestionType;
use App\Services\EvaluationFormSync;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The whole form as built in the admin, see {@see EvaluationFormSync}.
 */
final class SaveEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'passing_score' => ['required', 'numeric', 'min:0'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
            'show_correct_answers' => ['boolean'],
            'is_published' => ['boolean'],
            'questions' => ['present', 'array', 'max:200'],
            'questions.*.id' => ['nullable', 'integer'],
            'questions.*.type' => ['required', Rule::enum(QuestionType::class)],
            'questions.*.prompt' => ['required', 'string', 'max:2000'],
            'questions.*.help_text' => ['nullable', 'string', 'max:2000'],
            'questions.*.points' => ['required', 'numeric', 'min:0', 'max:1000'],
            'questions.*.required' => ['boolean'],
            'questions.*.accepted_answers' => ['nullable', 'array'],
            'questions.*.accepted_answers.*' => ['string', 'max:255'],
            'questions.*.options' => ['array', 'max:50'],
            'questions.*.options.*.id' => ['nullable', 'integer'],
            'questions.*.options.*.label' => ['required', 'string', 'max:500'],
            'questions.*.options.*.is_correct' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'La evaluación necesita un título.',
            'questions.*.prompt.required' => 'Escribe el enunciado de la pregunta.',
            'questions.*.options.*.label.required' => 'Las opciones no pueden estar vacías.',
        ];
    }

    /**
     * Checks that need the whole question: options and answer key.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var list<array{type: string, points: float|int|string, options?: list<array{is_correct?: bool}>}> $questions */
                $questions = $this->input('questions', []);
                $total = 0.0;

                foreach ($questions as $index => $question) {
                    $type = QuestionType::from($question['type']);
                    $points = (float) $question['points'];
                    $total += $points;

                    if (! $type->hasOptions()) {
                        continue;
                    }

                    $options = $question['options'] ?? [];
                    $correct = count(array_filter($options, fn (array $option): bool => (bool) ($option['is_correct'] ?? false)));
                    $number = $index + 1;

                    if ($options === []) {
                        $validator->errors()->add("questions.{$index}.options", "La pregunta {$number} necesita al menos una opción.");
                    } elseif ($points > 0 && $correct === 0) {
                        $validator->errors()->add("questions.{$index}.options", "Marca la respuesta correcta de la pregunta {$number}.");
                    } elseif ($type !== QuestionType::MultipleChoice && $correct > 1) {
                        $validator->errors()->add("questions.{$index}.options", "La pregunta {$number} solo admite una respuesta correcta.");
                    }
                }

                if ($this->float('passing_score') > $total) {
                    $validator->errors()->add('passing_score', 'La nota mínima no puede ser mayor que el puntaje total ('.$total.').');
                }
            },
        ];
    }
}
