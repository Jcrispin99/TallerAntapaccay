<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Material;
use App\Models\MaterialView;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaterialView>
 */
final class MaterialViewFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'material_id' => Material::factory(),
            'student_id' => Student::factory(),
            'seconds_watched' => 0,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes): array => ['completed_at' => now()]);
    }
}
