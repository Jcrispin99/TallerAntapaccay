<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Services\ChunkedUploads;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

final class UploadChunkRequest extends FormRequest
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
            // Byte where this chunk starts in the whole file.
            'offset' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file', 'max:'.intdiv(ChunkedUploads::CHUNK_BYTES, 1024)],
        ];
    }

    public function chunk(): UploadedFile
    {
        $chunk = $this->file('chunk');
        assert($chunk instanceof UploadedFile);

        return $chunk;
    }
}
