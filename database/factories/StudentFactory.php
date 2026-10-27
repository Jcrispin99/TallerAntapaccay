<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
final class StudentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dni' => fake()->unique()->numerify('########'),
            'full_name' => fake()->name(),
            'gerencia' => fake()->randomElement(['Operaciones', 'Finanzas', 'Recursos Humanos']),
            'puesto' => fake()->jobTitle(),
        ];
    }
}
