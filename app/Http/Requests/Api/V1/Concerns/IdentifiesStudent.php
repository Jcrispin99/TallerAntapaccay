<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Concerns;

use App\Models\Student;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Students identify themselves only with their DNI, which must be on the student list.
 *
 * @property string $dni
 */
trait IdentifiesStudent
{
    public function student(): Student
    {
        return Student::query()->where('dni', $this->dni)->firstOrFail();
    }

    /**
     * @return list<string|Exists>
     */
    protected function dniRules(): array
    {
        return ['required', 'string', 'regex:/^[A-Z0-9]{6,12}$/', Rule::exists('students', 'dni')];
    }

    /**
     * @return array<string, string>
     */
    protected function dniMessages(): array
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
