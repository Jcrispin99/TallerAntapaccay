<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\MaterialResource as PublicMaterialResource;
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
            ...new PublicMaterialResource($this->resource)->toArray($request),
            'conversion_error' => $this->conversion_error,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
