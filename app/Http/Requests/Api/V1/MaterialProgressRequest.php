<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\IdentifiesStudent;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A progress report from the player: the furthest second reached in a video
 * and its duration. Presentations only send the DNI.
 *
 * @property string $dni
 */
final class MaterialProgressRequest extends FormRequest
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
            'seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'duration' => ['nullable', 'integer', 'min:1', 'max:86400'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->dniMessages();
    }

    public function position(): int
    {
        return $this->integer('seconds');
    }

    public function reportedDuration(): ?int
    {
        return $this->filled('duration') ? $this->integer('duration') : null;
    }
}
