<?php

declare(strict_types=1);

use App\Enums\ConversionStatus;
use App\Jobs\ConvertPresentationToPdf;
use App\Models\Course;
use App\Models\Material;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    actingAsAdmin();
    Storage::fake('public');
    Queue::fake();
});

it('uploads a video ready to play', function (): void {
    $course = Course::factory()->create();

    $response = $this->post("/api/v1/admin/courses/{$course->id}/materials", [
        'file' => UploadedFile::fake()->create('Clase 1.mp4', 2048, 'video/mp4'),
    ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'video')
        ->assertJsonPath('data.title', 'Clase 1')
        ->assertJsonPath('data.conversion_status', 'ready');

    Storage::disk('public')->assertExists(Material::query()->sole()->path);
    expect($response->json('data.url'))->toContain("/storage/courses/{$course->id}/");
    Queue::assertNothingPushed();
});

it('queues the PDF conversion of a presentation', function (): void {
    $course = Course::factory()->create();

    $this->post("/api/v1/admin/courses/{$course->id}/materials", [
        'file' => UploadedFile::fake()->create('tema.pptx', 500),
        'title' => 'Tema 1',
    ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'presentation')
        ->assertJsonPath('data.conversion_status', 'pending');

    Queue::assertPushed(ConvertPresentationToPdf::class);
});

it('serves an uploaded PDF without converting it', function (): void {
    $course = Course::factory()->create();

    $response = $this->post("/api/v1/admin/courses/{$course->id}/materials", [
        'file' => UploadedFile::fake()->create('tema.pdf', 100, 'application/pdf'),
    ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'presentation')
        ->assertJsonPath('data.conversion_status', 'ready');

    expect($response->json('data.pdf_url'))->not->toBeNull();
    Queue::assertNothingPushed();
});

it('rejects unsupported files and files over the limit', function (): void {
    $course = Course::factory()->create();
    config(['platform.max_presentation_mb' => 1]);

    $this->post("/api/v1/admin/courses/{$course->id}/materials", [
        'file' => UploadedFile::fake()->create('script.php', 1),
    ], ['Accept' => 'application/json'])->assertJsonValidationErrors('file');

    $this->post("/api/v1/admin/courses/{$course->id}/materials", [
        'file' => UploadedFile::fake()->create('grande.pptx', 2048),
    ], ['Accept' => 'application/json'])->assertJsonValidationErrors('file');
});

it('renames, reorders and deletes materials', function (): void {
    $course = Course::factory()->create();
    Storage::disk('public')->put('courses/a.mp4', 'a');
    $first = Material::factory()->for($course)->create(['position' => 0, 'path' => 'courses/a.mp4']);
    $second = Material::factory()->for($course)->create(['position' => 1]);

    $this->patchJson("/api/v1/admin/materials/{$first->id}", ['title' => 'Introducción'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Introducción');

    $this->patchJson("/api/v1/admin/courses/{$course->id}/materials/order", ['ids' => [$second->id, $first->id]])
        ->assertOk()
        ->assertJsonPath('data.0.id', $second->id);

    $this->deleteJson("/api/v1/admin/materials/{$first->id}")->assertNoContent();
    Storage::disk('public')->assertMissing('courses/a.mp4');
});

it('retries a failed conversion', function (): void {
    $material = Material::factory()->presentation(ConversionStatus::Failed)->create(['conversion_error' => 'boom']);

    $this->postJson("/api/v1/admin/materials/{$material->id}/retry")
        ->assertOk()
        ->assertJsonPath('data.conversion_status', 'pending')
        ->assertJsonPath('data.conversion_error', null);

    Queue::assertPushed(ConvertPresentationToPdf::class);
});
