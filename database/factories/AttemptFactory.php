<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AttemptStatus;
use App\Models\Attempt;
use App\Models\Evaluation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attempt>
 */
final class AttemptFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'evaluation_id' => Evaluation::factory(),
            'dni' => fake()->numerify('########'),
            'full_name' => fake()->name(),
            'status' => AttemptStatus::InProgress,
            'started_at' => now(),
        ];
    }

    public function submitted(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => AttemptStatus::Graded,
            'score' => 0,
            'max_score' => 0,
            'passed' => false,
            'submitted_at' => now(),
        ]);
    }
}
