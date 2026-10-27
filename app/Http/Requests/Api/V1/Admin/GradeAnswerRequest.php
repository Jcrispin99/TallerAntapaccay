<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Models\Answer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

final class GradeAnswerRequest extends FormRequest
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
        $answer = $this->route('answer');
        $max = $answer instanceof Answer ? $answer->question->points : 0;

        return [
            'points' => ['required', 'numeric', 'min:0', 'max:'.$max],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'points.max' => 'El puntaje no puede superar el valor de la pregunta (:max).',
        ];
    }

    public function points(): float
    {
        return round($this->float('points'), 2);
    }
}
