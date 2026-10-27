<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Course;
use App\Models\Evaluation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Evaluation>
 */
final class EvaluationFactory extends Factory
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
            'title' => fake()->sentence(3),
            'description' => null,
            'passing_score' => 0,
            'max_attempts' => null,
            'show_correct_answers' => false,
            'is_published' => true,
        ];
    }
}
