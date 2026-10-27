<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Material;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lists only published courses', function (): void {
    Course::factory()->create(['title' => 'Visible']);
    Course::factory()->draft()->create(['title' => 'Borrador']);

    $this->getJson('/api/v1/courses')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Visible');
});

it('shows a published course with its materials and evaluation', function (): void {
    $course = Course::factory()->create();
    Material::factory()->for($course)->create(['title' => 'Video 1']);
    $evaluation = Evaluation::factory()->for($course)->create();
    Question::factory()->for($evaluation)->create();

    $this->getJson("/api/v1/courses/{$course->slug}")
        ->assertOk()
        ->assertJsonPath('data.materials.0.title', 'Video 1')
        ->assertJsonPath('data.evaluation.id', $evaluation->id)
        ->assertJsonPath('data.evaluation.questions_count', 1);
});

it('hides draft courses', function (): void {
    $course = Course::factory()->draft()->create();

    $this->getJson("/api/v1/courses/{$course->slug}")->assertNotFound();
});

it('hides an evaluation that is not published', function (): void {
    $course = Course::factory()->create();
    $evaluation = Evaluation::factory()->for($course)->create(['is_published' => false]);
    Question::factory()->for($evaluation)->create();

    $this->getJson("/api/v1/courses/{$course->slug}")->assertJsonPath('data.evaluation', null);
    $this->getJson("/api/v1/courses/{$course->slug}/evaluation")->assertNotFound();
});

it('never exposes the answer key to students', function (): void {
    $course = Course::factory()->create();
    $evaluation = Evaluation::factory()->for($course)->create();
    $question = Question::factory()->for($evaluation)->create(['settings' => ['accepted_answers' => ['secreto']]]);
    QuestionOption::factory()->for($question)->correct()->create();

    $response = $this->getJson("/api/v1/courses/{$course->slug}/evaluation")->assertOk();

    expect($response->json('data.questions.0.options.0'))->toHaveKeys(['id', 'label'])->not->toHaveKey('is_correct')
        ->and($response->getContent())->not->toContain('is_correct')->not->toContain('secreto');
});
