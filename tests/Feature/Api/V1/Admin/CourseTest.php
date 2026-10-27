<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(fn (): User => actingAsAdmin());

it('creates a course with a unique slug', function (): void {
    Course::factory()->create(['title' => 'Primeros Auxilios']);

    $this->postJson('/api/v1/admin/courses', ['title' => 'Primeros Auxilios', 'description' => 'Básico'])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'primeros-auxilios-2')
        ->assertJsonPath('data.is_published', false);
});

it('lists every course, published or not', function (): void {
    Course::factory()->create();
    Course::factory()->draft()->create();

    $this->getJson('/api/v1/admin/courses')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('updates and publishes a course', function (): void {
    $course = Course::factory()->draft()->create(['title' => 'Viejo']);

    $this->patchJson("/api/v1/admin/courses/{$course->id}", ['title' => 'Nuevo título', 'is_published' => true])
        ->assertOk()
        ->assertJsonPath('data.title', 'Nuevo título')
        ->assertJsonPath('data.slug', 'nuevo-titulo')
        ->assertJsonPath('data.is_published', true);
});

it('deletes a course with its files', function (): void {
    Storage::fake('public');
    $course = Course::factory()->create();
    Storage::disk('public')->put("courses/{$course->id}/video.mp4", 'video');
    Material::factory()->for($course)->create(['path' => "courses/{$course->id}/video.mp4"]);

    $this->deleteJson("/api/v1/admin/courses/{$course->id}")->assertNoContent();

    expect(Course::query()->count())->toBe(0)
        ->and(Material::query()->count())->toBe(0);
    Storage::disk('public')->assertMissing("courses/{$course->id}/video.mp4");
});

it('validates the title', function (): void {
    $this->postJson('/api/v1/admin/courses', ['title' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});
