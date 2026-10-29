<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Material;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->teacher = actingAsTeacher();
    $this->course = Course::factory()->for($this->teacher, 'owner')->create();
    Storage::fake('public');
    Storage::fake('local');
    Queue::fake();
});

function startUpload(Course $course, string $name, int $size): TestResponse
{
    return test()->postJson("/api/v1/admin/courses/{$course->id}/uploads", ['name' => $name, 'size' => $size, 'mime' => 'video/mp4']);
}

function sendChunk(string $id, int $offset, string $bytes): TestResponse
{
    return test()->post("/api/v1/admin/uploads/{$id}/chunks", [
        'offset' => $offset,
        'chunk' => UploadedFile::fake()->createWithContent('blob', $bytes),
    ], ['Accept' => 'application/json']);
}

it('assembles a video sent in chunks into a material', function (): void {
    $content = str_repeat('a', 10).str_repeat('b', 10).'c';
    $id = startUpload($this->course, 'Charla de 5 minutos.mp4', 21)->assertCreated()->json('data.id');

    sendChunk($id, 0, mb_substr($content, 0, 10))->assertOk()->assertJsonPath('data.received', 10);
    sendChunk($id, 10, mb_substr($content, 10, 10))->assertJsonPath('data.received', 20);
    sendChunk($id, 20, mb_substr($content, 20))->assertJsonPath('data.received', 21);

    $this->postJson("/api/v1/admin/courses/{$this->course->id}/materials", ['upload' => $id, 'duration' => 300])
        ->assertCreated()
        ->assertJsonPath('data.type', 'video')
        ->assertJsonPath('data.title', 'Charla de 5 minutos')
        ->assertJsonPath('data.size', 21)
        ->assertJsonPath('data.duration_seconds', 300);

    expect(Storage::disk('public')->get(Material::query()->sole()->path))->toBe($content)
        ->and(Storage::disk('local')->files('uploads'))->toBeEmpty();
});

it('continues from the bytes already received', function (): void {
    $id = startUpload($this->course, 'clase.mp4', 20)->json('data.id');

    sendChunk($id, 0, str_repeat('a', 10))->assertJsonPath('data.received', 10);

    // The response was lost and the browser sends the same chunk again: it is not added twice.
    sendChunk($id, 0, str_repeat('a', 10))->assertJsonPath('data.received', 10);

    sendChunk($id, 10, str_repeat('b', 11))->assertJsonValidationErrors('chunk');
});

it('checks the format and size before receiving any chunk', function (): void {
    config(['platform.max_video_mb' => 1]);

    startUpload($this->course, 'script.php', 10)->assertJsonValidationErrors('name');
    startUpload($this->course, 'clase.mp4', 2 * 1024 * 1024)->assertJsonValidationErrors('size');
});

it('creates the material only once every chunk arrived', function (): void {
    $id = startUpload($this->course, 'clase.mp4', 20)->json('data.id');
    sendChunk($id, 0, str_repeat('a', 10));

    $this->postJson("/api/v1/admin/courses/{$this->course->id}/materials", ['upload' => $id])
        ->assertJsonValidationErrors('upload');

    expect(Material::query()->count())->toBe(0);
});

it('keeps each upload to the teacher who started it', function (): void {
    $id = startUpload($this->course, 'clase.mp4', 10)->json('data.id');
    sendChunk($id, 0, str_repeat('a', 10));

    $other = actingAsTeacher();
    $otherCourse = Course::factory()->for($other, 'owner')->create();

    startUpload($this->course, 'clase.mp4', 10)->assertForbidden();
    sendChunk($id, 0, str_repeat('a', 10))->assertNotFound();
    $this->postJson("/api/v1/admin/courses/{$otherCourse->id}/materials", ['upload' => $id])
        ->assertJsonValidationErrors('upload');
});

it('deletes uploads left unfinished for a day', function (): void {
    $id = startUpload($this->course, 'clase.mp4', 20)->json('data.id');

    $this->travel(25)->hours();
    startUpload($this->course, 'otra.mp4', 20);

    expect(Storage::disk('local')->exists("uploads/{$id}.part"))->toBeFalse()
        ->and(Storage::disk('local')->exists("uploads/{$id}.json"))->toBeFalse();
});
