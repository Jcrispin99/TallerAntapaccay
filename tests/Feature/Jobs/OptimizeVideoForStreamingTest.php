<?php

declare(strict_types=1);

use App\Jobs\OptimizeVideoForStreaming;
use App\Models\Material;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/** A minimal MP4: its top-level boxes in the given order. */
function mp4(string ...$types): string
{
    return implode('', array_map(fn (string $type): string => pack('N', 12).$type.'data', $types));
}

beforeEach(function (): void {
    Storage::fake('public');
});

it('moves the index of a video to the start under a new name', function (): void {
    $material = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'mdat', 'moov'));

    Process::fake(function (PendingProcess $process) {
        file_put_contents((string) end($process->command), mp4('ftyp', 'moov', 'mdat').'!');

        return Process::result();
    });

    new OptimizeVideoForStreaming($material)->handle();

    $material->refresh();
    expect($material->path)->not->toBe('courses/1/clase.mp4')->toStartWith('courses/1/')->toEndWith('.mp4')
        ->and($material->size)->toBe(37);
    Storage::disk('public')->assertMissing('courses/1/clase.mp4');
    Storage::disk('public')->assertExists($material->path);
    Process::assertRan(fn (PendingProcess $process): bool => in_array('+faststart', $process->command, true));
});

it('reads box lengths as bytes, also when they look like text', function (): void {
    // 00 00 C3 A9 is "é" in UTF-8: counting characters instead of bytes would miss the next box.
    $free = pack('N', 0xC3A9).'free'.str_repeat("\0", 0xC3A9 - 8);
    $material = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp').$free.mp4('mdat', 'moov'));
    Process::fake();

    new OptimizeVideoForStreaming($material)->handle();

    Process::assertRan(fn (PendingProcess $process): bool => in_array('+faststart', $process->command, true));
});

it('leaves videos that already start with their index', function (): void {
    $material = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'moov', 'mdat'));
    Process::fake();

    new OptimizeVideoForStreaming($material)->handle();

    expect($material->refresh()->path)->toBe('courses/1/clase.mp4');
    Process::assertNothingRan();
});

it('keeps the original video when FFmpeg fails', function (): void {
    $material = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'mdat', 'moov'));
    Process::fake(fn () => Process::result(errorOutput: 'ffmpeg: not found', exitCode: 127));

    new OptimizeVideoForStreaming($material)->handle();

    expect($material->refresh()->path)->toBe('courses/1/clase.mp4');
    Storage::disk('public')->assertExists('courses/1/clase.mp4');
});

it('optimizes the videos uploaded before with a command', function (): void {
    $video = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'mdat', 'moov'));
    Material::factory()->presentation()->create();

    Process::fake(function (PendingProcess $process) {
        file_put_contents((string) end($process->command), mp4('ftyp', 'moov', 'mdat'));

        return Process::result();
    });

    $this->artisan('app:optimize-videos')
        ->expectsOutputToContain('Optimizado')
        ->assertSuccessful();

    expect($video->refresh()->path)->not->toBe('courses/1/clase.mp4');
    Process::assertRanTimes(fn (PendingProcess $process): bool => in_array('+faststart', $process->command, true), 1);
});
