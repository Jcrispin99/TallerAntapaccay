<?php

declare(strict_types=1);

use App\Enums\AttemptStatus;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Material;
use App\Models\MaterialView;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('summarizes the student progress in every published course', function (): void {
    $student = Student::factory()->create(['dni' => '12345678', 'full_name' => 'QUISPE ROJAS, ROSA']);

    $started = Course::factory()->create(['is_published' => true]);
    $video = Material::factory()->for($started)->create();
    Material::factory()->for($started)->create();
    MaterialView::factory()->for($video)->for($student)->completed()->create();
    $evaluation = Evaluation::factory()->for($started)->create(['max_attempts' => 2]);
    Attempt::factory()->for($evaluation)->create(['dni' => '12345678', 'status' => AttemptStatus::Graded, 'score' => 12, 'max_score' => 20, 'passed' => false, 'submitted_at' => now()]);
    Attempt::factory()->for($evaluation)->create(['dni' => '12345678', 'status' => AttemptStatus::Graded, 'score' => 18, 'max_score' => 20, 'passed' => true, 'submitted_at' => now()]);
    Attempt::factory()->for($evaluation)->create(['dni' => '87654321', 'status' => AttemptStatus::Graded, 'score' => 20, 'max_score' => 20, 'passed' => true, 'submitted_at' => now()]);

    $untouched = Course::factory()->create(['is_published' => true]);
    Course::factory()->create(['is_published' => false]);

    $response = $this->postJson('/api/v1/progress', ['dni' => '12345678'])
        ->assertOk()
        ->assertJsonPath('data.student.full_name', 'QUISPE ROJAS, ROSA')
        ->assertJsonCount(2, 'data.courses');

    $courses = collect($response->json('data.courses'))->keyBy('course_id');

    expect($courses[$started->id])->toMatchArray([
        'materials_total' => 2,
        'materials_completed' => 1,
        'started' => true,
        'evaluation' => ['attempts_used' => 2, 'max_attempts' => 2, 'passed' => true, 'pending_review' => false, 'best_score' => 18, 'max_score' => 20],
    ])->and($courses[$untouched->id])->toMatchArray([
        'materials_total' => 0,
        'materials_completed' => 0,
        'started' => false,
        'evaluation' => null,
    ]);
});

it('rejects a DNI that is not on the list', function (): void {
    $this->postJson('/api/v1/progress', ['dni' => '11112222'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');
});

it('counts the videos of each course in the catalog', function (): void {
    $course = Course::factory()->create(['is_published' => true]);
    Material::factory()->for($course)->count(2)->create();
    Material::factory()->for($course)->presentation()->create();

    $this->getJson('/api/v1/courses')
        ->assertJsonPath('data.0.materials_count', 3)
        ->assertJsonPath('data.0.videos_count', 2);
});
