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

/**
 * FFprobe answers with this video stream (or fails without one); FFmpeg writes its output file, or fails.
 *
 * @param  array{codec_name: string, height: int}|null  $stream
 */
function fakeFfmpeg(?array $stream, int $bitrate = 1_000_000, bool $fails = false): void
{
    Process::fake(function (PendingProcess $process) use ($stream, $bitrate, $fails) {
        $command = (array) $process->command;

        if (in_array('-print_format', $command, true)) {
            return $stream === null
                ? Process::result(errorOutput: 'ffprobe: not found', exitCode: 127)
                : Process::result((string) json_encode(['streams' => [$stream], 'format' => ['bit_rate' => (string) $bitrate]]));
        }

        if ($fails) {
            return Process::result(errorOutput: 'Conversion failed', exitCode: 1);
        }

        file_put_contents((string) end($command), mp4('ftyp', 'moov', 'mdat').'!');

        return Process::result();
    });
}

function ranFfmpegWith(string $option): Closure
{
    return fn (PendingProcess $process): bool => in_array($option, (array) $process->command, true);
}

beforeEach(function (): void {
    Storage::fake('public');
    $this->material = Material::factory()->create(['path' => 'courses/1/clase.mp4']);
});

it('makes a light 720p version of a heavy video', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'moov', 'mdat'));
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 1080], bitrate: 4_400_000);

    new OptimizeVideoForStreaming($this->material)->handle();

    $this->material->refresh();
    expect($this->material->path)->not->toBe('courses/1/clase.mp4')->toStartWith('courses/1/')->toEndWith('.mp4')
        ->and($this->material->size)->toBe(37)
        ->and($this->material->mime)->toBe('video/mp4');
    Storage::disk('public')->assertMissing('courses/1/clase.mp4');
    Storage::disk('public')->assertExists($this->material->path);
    Process::assertRan(ranFfmpegWith('libx264'));
});

it('converts videos that not every browser plays', function (): void {
    $this->material->update(['path' => 'courses/1/iphone.mov', 'mime' => 'video/quicktime']);
    Storage::disk('public')->put('courses/1/iphone.mov', mp4('ftyp', 'moov', 'mdat'));
    fakeFfmpeg(['codec_name' => 'hevc', 'height' => 720]);

    new OptimizeVideoForStreaming($this->material)->handle();

    expect($this->material->refresh())
        ->path->toEndWith('.mp4')
        ->mime->toBe('video/mp4');
    Process::assertRan(ranFfmpegWith('libx264'));
});

it('only moves the index of a light video to the start', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'mdat', 'moov'));
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 720]);

    new OptimizeVideoForStreaming($this->material)->handle();

    expect($this->material->refresh()->path)->not->toBe('courses/1/clase.mp4');
    Process::assertRan(ranFfmpegWith('+faststart'));
    Process::assertDidntRun(ranFfmpegWith('libx264'));
});

it('reads box lengths as bytes, also when they look like text', function (): void {
    // 00 00 C3 A9 is "é" in UTF-8: counting characters instead of bytes would miss the next box.
    $free = pack('N', 0xC3A9).'free'.str_repeat("\0", 0xC3A9 - 8);
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp').$free.mp4('mdat', 'moov'));
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 720]);

    new OptimizeVideoForStreaming($this->material)->handle();

    Process::assertRan(ranFfmpegWith('+faststart'));
});

it('leaves light videos that already start with their index', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'moov', 'mdat'));
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 720]);

    new OptimizeVideoForStreaming($this->material)->handle();

    expect($this->material->refresh()->path)->toBe('courses/1/clase.mp4');
    Process::assertDidntRun(ranFfmpegWith('-movflags'));
});

it('still moves the index when FFprobe cannot read the video', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'mdat', 'moov'));
    fakeFfmpeg(null);

    new OptimizeVideoForStreaming($this->material)->handle();

    Process::assertRan(ranFfmpegWith('+faststart'));
});

it('keeps the original video when FFmpeg fails', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'moov', 'mdat'));
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 1080], fails: true);

    new OptimizeVideoForStreaming($this->material)->handle();

    expect($this->material->refresh()->path)->toBe('courses/1/clase.mp4');
    Storage::disk('public')->assertExists('courses/1/clase.mp4');
    expect(Storage::disk('public')->allFiles('courses/1'))->toBe(['courses/1/clase.mp4']);
});

it('optimizes the videos uploaded before with a command', function (): void {
    Storage::disk('public')->put('courses/1/clase.mp4', mp4('ftyp', 'moov', 'mdat'));
    Material::factory()->presentation()->create();
    fakeFfmpeg(['codec_name' => 'h264', 'height' => 1080], bitrate: 4_400_000);

    $this->artisan('app:optimize-videos')
        ->expectsOutputToContain('Optimizado')
        ->assertSuccessful();

    expect($this->material->refresh()->path)->not->toBe('courses/1/clase.mp4');
    Process::assertRanTimes(ranFfmpegWith('libx264'), 1);
});
