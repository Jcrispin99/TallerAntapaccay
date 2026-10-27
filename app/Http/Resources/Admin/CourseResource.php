<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Course
 */
final class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $evaluation = $this->evaluation;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_published' => $this->is_published,
            'owner' => $this->whenLoaded('owner', fn (): ?array => $this->owner === null ? null : [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ]),
            'materials_count' => $this->whenCounted('materials'),
            'materials' => MaterialResource::collection($this->whenLoaded('materials')),
            'evaluation' => $this->whenLoaded('evaluation', fn (): ?array => $evaluation === null ? null : [
                'id' => $evaluation->id,
                'is_published' => $evaluation->is_published,
                'questions_count' => $evaluation->questions_count,
                'attempts_count' => $evaluation->attempts_count,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
