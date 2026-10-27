<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Models\Student;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StudentRequest extends FormRequest
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
        $student = $this->route('student');

        return [
            'dni' => ['required', 'string', 'regex:/^[A-Z0-9]{6,12}$/', Rule::unique('students', 'dni')->ignore($student instanceof Student ? $student->id : null)],
            'full_name' => ['required', 'string', 'max:255'],
            'gerencia' => ['nullable', 'string', 'max:255'],
            'puesto' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'dni.regex' => 'El DNI debe tener entre 6 y 12 letras o números.',
            'dni.unique' => 'Ya hay un alumno con ese DNI.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('dni'))) {
            $this->merge(['dni' => Student::normalizeDni($this->input('dni'))]);
        }
    }
}
