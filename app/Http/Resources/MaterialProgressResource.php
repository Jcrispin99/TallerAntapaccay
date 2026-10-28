<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\MaterialView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MaterialView
 */
final class MaterialProgressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'material_id' => $this->material_id,
            'seconds_watched' => $this->seconds_watched,
            'completed' => $this->completed_at !== null,
        ];
    }
}
