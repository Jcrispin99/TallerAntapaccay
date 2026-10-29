<?php

declare(strict_types=1);

namespace App\Http\Resources;

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
            'materials_count' => $this->whenCounted('materials'),
            'videos_count' => $this->whenCounted('videos_count'),
            'materials' => MaterialResource::collection($this->whenLoaded('materials')),
            'evaluation' => $this->whenLoaded('evaluation', fn (): ?array => $evaluation !== null && $evaluation->is_published && $evaluation->questions_count > 0
                ? ['id' => $evaluation->id, 'title' => $evaluation->title, 'questions_count' => $evaluation->questions_count, 'passing_score' => $evaluation->passing_score]
                : null),
        ];
    }
}
