<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\IdentifiesStudent;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Identifies the student by DNI, to start an evaluation or to follow their progress in a course.
 *
 * @property string $dni
 */
final class StartAttemptRequest extends FormRequest
{
    use IdentifiesStudent;

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
            'dni' => $this->dniRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->dniMessages();
    }
}
