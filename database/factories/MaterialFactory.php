<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ConversionStatus;
use App\Enums\MaterialType;
use App\Models\Course;
use App\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Material>
 */
final class MaterialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'type' => MaterialType::Video,
            'title' => fake()->sentence(3),
            'original_name' => 'clase.mp4',
            'path' => 'courses/materials/'.fake()->uuid().'.mp4',
            'mime' => 'video/mp4',
            'size' => 1024,
            'conversion_status' => ConversionStatus::Ready,
            'position' => 0,
        ];
    }

    public function presentation(ConversionStatus $status = ConversionStatus::Pending): static
    {
        return $this->state(fn (array $attributes): array => [
            'type' => MaterialType::Presentation,
            'original_name' => 'clase.pptx',
            'path' => 'courses/materials/'.fake()->uuid().'.pptx',
            'mime' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'conversion_status' => $status,
        ]);
    }

    public function link(string $url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'): static
    {
        return $this->state(fn (array $attributes): array => [
            'type' => MaterialType::Link,
            'original_name' => $url,
            'path' => '',
            'external_url' => $url,
            'mime' => null,
            'size' => 0,
        ]);
    }
}
