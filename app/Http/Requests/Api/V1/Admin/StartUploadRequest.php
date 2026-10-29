<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Enums\MaterialType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Announces a file that will arrive in chunks, so its format and size are
 * checked before anything is sent.
 *
 * @property string $name
 * @property string|null $mime
 */
final class StartUploadRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'size' => ['required', 'integer', 'min:1'],
            'mime' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $type = $this->materialType();

                if (! $type instanceof MaterialType) {
                    $validator->errors()->add('name', 'Formato no soportado. Usa un video (mp4, webm, m4v, mov) o una presentación (ppt, pptx, odp, pdf).');

                    return;
                }

                $maxMb = $type->maxUploadMb();

                if ($this->integer('size') > $maxMb * 1024 * 1024) {
                    $validator->errors()->add('size', "El archivo supera el máximo de {$maxMb} MB.");
                }
            },
        ];
    }

    public function materialType(): ?MaterialType
    {
        return MaterialType::fromExtension(pathinfo($this->name, PATHINFO_EXTENSION));
    }
}
