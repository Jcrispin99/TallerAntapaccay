<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Material
 */
final class MaterialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'duration_seconds' => $this->duration_seconds,
            'url' => $this->url(),
            'pdf_url' => $this->pdfUrl(),
            'conversion_status' => $this->conversion_status,
            'position' => $this->position,
        ];
    }
}
