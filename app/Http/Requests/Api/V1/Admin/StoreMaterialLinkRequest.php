<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $url
 * @property string $title
 */
final class StoreMaterialLinkRequest extends FormRequest
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
            // https only: the browser blocks http content inside an https page.
            'url' => ['required', 'string', 'max:2048', 'url:https'],
            'title' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'url.required' => 'Pega el enlace.',
            'url.url' => 'El enlace debe empezar con https://',
            'title.required' => 'Ponle un título.',
        ];
    }
}
