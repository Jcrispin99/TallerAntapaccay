<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Enums\MaterialType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

/**
 * @property string|null $title
 */
final class StoreMaterialRequest extends FormRequest
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
        $extensions = [
            ...MaterialType::extensionsFor(MaterialType::Video),
            ...MaterialType::extensionsFor(MaterialType::Presentation),
        ];

        return [
            'file' => ['required', 'file', 'extensions:'.implode(',', $extensions)],
            'title' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Selecciona un archivo.',
            'file.uploaded' => 'El archivo no se pudo subir. Revisa upload_max_filesize y post_max_size de PHP.',
            'file.extensions' => 'Formato no soportado. Usa un video (mp4, webm, m4v, mov) o una presentación (ppt, pptx, odp, pdf).',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $file = $this->file('file');

                if ($validator->errors()->isNotEmpty() || ! $file instanceof UploadedFile) {
                    return;
                }

                $type = $this->materialType();
                $maxMb = $type === MaterialType::Video
                    ? config()->integer('platform.max_video_mb')
                    : config()->integer('platform.max_presentation_mb');

                if ($file->getSize() > $maxMb * 1024 * 1024) {
                    $validator->errors()->add('file', "El archivo supera el máximo de {$maxMb} MB.");
                }
            },
        ];
    }

    public function uploadedFile(): UploadedFile
    {
        $file = $this->file('file');
        assert($file instanceof UploadedFile);

        return $file;
    }

    public function materialType(): MaterialType
    {
        return MaterialType::fromExtension($this->uploadedFile()->getClientOriginalExtension()) ?? MaterialType::Presentation;
    }
}
