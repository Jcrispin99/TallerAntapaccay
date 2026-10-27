<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Models\Student;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Students identify themselves only with their DNI, which must be on the student list.
 *
 * @property string $dni
 */
final class StartAttemptRequest extends FormRequest
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
            'dni' => ['required', 'string', 'regex:/^[A-Z0-9]{6,12}$/', Rule::exists('students', 'dni')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'dni.required' => 'Ingresa tu DNI.',
            'dni.regex' => 'El DNI debe tener entre 6 y 12 letras o números.',
            'dni.exists' => 'Tu DNI no está en la lista de alumnos habilitados. Consulta con tu área.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'dni' => is_string($this->input('dni')) ? Student::normalizeDni($this->input('dni')) : $this->input('dni'),
        ]);
    }
}
