<?php

declare(strict_types=1);

use App\Enums\QuestionType;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Question;
use App\Models\User;
use Database\Seeders\TalleresSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates the workshops as drafts owned by the first admin', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();

    $this->seed(TalleresSeeder::class);

    expect(Course::query()->count())->toBe(9)
        ->and(Course::query()->where('is_published', true)->exists())->toBeFalse()
        ->and(Course::query()->whereNot('user_id', $admin->id)->exists())->toBeFalse()
        ->and(Question::query()->count())->toBe(46);

    Evaluation::query()->each(function (Evaluation $evaluation): void {
        expect($evaluation->totalPoints())->toBe(20.0)
            ->and($evaluation->passing_score)->toBe(14.0)
            ->and($evaluation->max_attempts)->toBe(2)
            ->and($evaluation->show_correct_answers)->toBeFalse();
    });
});

it('marks one correct option per question, except the multiple choice ones', function (): void {
    User::factory()->admin()->create();

    $this->seed(TalleresSeeder::class);

    Question::query()->with('options')->each(function (Question $question): void {
        $correct = $question->options->where('is_correct', true)->count();

        expect($question->options->count())->toBeGreaterThanOrEqual(2);
        $question->type === QuestionType::MultipleChoice
            ? expect($correct)->toBeGreaterThan(1)
            : expect($correct)->toBe(1);
    });

    $causes = Question::query()->where('type', QuestionType::MultipleChoice)->sole();
    expect($causes->options->where('is_correct', true)->pluck('label')->all())
        ->toBe(['Cargar peso de manera inadecuada.', 'Mantener malas posturas.']);
});

it('skips workshops that already exist', function (): void {
    User::factory()->admin()->create();
    $this->seed(TalleresSeeder::class);

    $course = Course::query()->where('slug', 'iras-y-edas')->sole();
    $course->update(['description' => 'Editada por el profe']);

    $this->seed(TalleresSeeder::class);

    expect(Course::query()->count())->toBe(9)
        ->and(Question::query()->count())->toBe(46)
        ->and($course->refresh()->description)->toBe('Editada por el profe');
});

it('requires an admin to own the workshops', function (): void {
    User::factory()->create();

    $this->seed(TalleresSeeder::class);
})->throws(RuntimeException::class, 'app:create-admin');
