<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Answers keyed by question id. Required questions are checked by the grader,
 * which knows the form.
 */
final class SubmitAttemptRequest extends FormRequest
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
            'answers' => ['present', 'array'],
            'answers.*' => ['nullable'],
        ];
    }

    /**
     * @return array<array-key, mixed>
     */
    public function answers(): array
    {
        return (array) $this->input('answers', []);
    }
}
