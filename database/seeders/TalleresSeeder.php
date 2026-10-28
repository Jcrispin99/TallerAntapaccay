<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\QuestionType;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Creates the 2026 health workshops (see data/talleres.php) with their
 * evaluations. Courses are drafts without materials: the teacher uploads the
 * presentation and publishes the course. Safe to run again: courses that
 * already exist are skipped, so edits and attempts are never touched.
 */
final class TalleresSeeder extends Seeder
{
    private const int PASSING_SCORE = 14;

    private const int MAX_ATTEMPTS = 2;

    public function run(): void
    {
        $owner = User::query()->where('role', UserRole::Admin)->oldest('id')->first()
            ?? throw new RuntimeException('Primero crea un admin con: php artisan app:create-admin {email}');

        /** @var list<array{title: string, description: string, questions: list<array{prompt: string, help_text?: string, type?: QuestionType, points: int, options: array<string, bool>}>}> $talleres */
        $talleres = require __DIR__.'/data/talleres.php';

        foreach ($talleres as $taller) {
            $slug = Str::slug($taller['title']);

            if (Course::query()->where('slug', $slug)->exists()) {
                $this->command?->line('Ya existe, se omite: '.$taller['title']);

                continue;
            }

            DB::transaction(function () use ($taller, $slug, $owner): void {
                $course = new Course(['title' => $taller['title'], 'description' => $taller['description']]);
                // Set here because DatabaseSeeder runs without model events.
                $course->slug = $slug;
                $course->owner()->associate($owner);
                $course->save();

                // Published, but students only see it once the course is published too.
                $evaluation = $course->evaluation()->create([
                    'title' => 'Evaluación: '.$taller['title'],
                    'description' => 'Marca la alternativa correcta.',
                    'passing_score' => self::PASSING_SCORE,
                    'max_attempts' => self::MAX_ATTEMPTS,
                    'show_correct_answers' => false,
                    'is_published' => true,
                ]);

                foreach ($taller['questions'] as $position => $data) {
                    $question = $evaluation->questions()->create([
                        'type' => $data['type'] ?? QuestionType::SingleChoice,
                        'prompt' => $data['prompt'],
                        'help_text' => $data['help_text'] ?? null,
                        'points' => $data['points'],
                        'required' => true,
                        'position' => $position,
                    ]);

                    $optionPosition = 0;

                    foreach ($data['options'] as $label => $isCorrect) {
                        $question->options()->create(['label' => $label, 'is_correct' => $isCorrect, 'position' => $optionPosition++]);
                    }
                }
            });

            $this->command?->info('Curso creado: '.$taller['title']);
        }
    }
}
