<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Enums\MaterialType;
use App\Models\Course;
use App\Models\User;
use App\Services\ChunkedUploads;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

/**
 * The file comes in the request, or was sent before in chunks and comes as
 * the id of that upload (see UploadController).
 *
 * @property string|null $title
 */
final class StoreMaterialRequest extends FormRequest
{
    private ?UploadedFile $completedUpload = null;

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
            'file' => ['required_without:upload', 'file', 'extensions:'.implode(',', $extensions)],
            'upload' => ['required_without:file', 'prohibits:file', 'string'],
            'title' => ['nullable', 'string', 'max:255'],
            // Seconds, read by the browser before uploading a video.
            'duration' => ['nullable', 'integer', 'min:1', 'max:86400'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required_without' => 'Selecciona un archivo.',
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
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->uploadId() !== null) {
                    $course = $this->route('course');
                    $user = $this->user();
                    assert($course instanceof Course && $user instanceof User);
                    $this->completedUpload = resolve(ChunkedUploads::class)->completed($this->uploadId(), $user, $course);

                    if (! $this->completedUpload instanceof UploadedFile) {
                        $validator->errors()->add('upload', 'La subida no terminó o ya expiró. Vuelve a subir el archivo.');

                        return;
                    }
                }

                $maxMb = $this->materialType()->maxUploadMb();

                if ($this->uploadedFile()->getSize() > $maxMb * 1024 * 1024) {
                    $validator->errors()->add('file', "El archivo supera el máximo de {$maxMb} MB.");
                }
            },
        ];
    }

    public function uploadedFile(): UploadedFile
    {
        $file = $this->completedUpload ?? $this->file('file');
        assert($file instanceof UploadedFile);

        return $file;
    }

    public function uploadId(): ?string
    {
        return $this->filled('upload') ? $this->string('upload')->toString() : null;
    }

    public function materialType(): MaterialType
    {
        return MaterialType::fromExtension($this->uploadedFile()->getClientOriginalExtension()) ?? MaterialType::Presentation;
    }
}
