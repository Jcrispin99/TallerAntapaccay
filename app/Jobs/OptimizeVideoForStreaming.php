<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Material;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\DeleteWhenMissingModels;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A video whose index (the "moov" box) sits after its data cannot start until
 * the browser reaches the index, which in a large file means minutes of black
 * screen. FFmpeg moves the index to the start ("faststart") without
 * re-encoding, in seconds. The result gets a new name, because Cloudflare
 * keeps serving what it cached under the old one.
 */
#[Tries(1)]
#[Timeout(600)]
#[DeleteWhenMissingModels]
final class OptimizeVideoForStreaming implements ShouldQueue
{
    use Queueable;

    /** Formats that store their index in boxes (MP4 and QuickTime). */
    private const array EXTENSIONS = ['mp4', 'm4v', 'mov'];

    public function __construct(public Material $material) {}

    public function handle(): void
    {
        $disk = Storage::disk('public');
        $extension = mb_strtolower(pathinfo($this->material->path, PATHINFO_EXTENSION));

        if (! in_array($extension, self::EXTENSIONS, true) || ! $this->indexIsAtTheEnd($disk->path($this->material->path))) {
            return;
        }

        $path = dirname($this->material->path).'/'.Str::uuid().'.'.$extension;

        // A bit under the job's timeout, so a stuck FFmpeg is stopped and logged.
        $result = Process::timeout(570)->run([
            config()->string('platform.ffmpeg_path'),
            '-v', 'error',
            '-i', $disk->path($this->material->path),
            // Video and audio only: some phones add data tracks that MP4 cannot hold.
            '-map', '0:v', '-map', '0:a?',
            '-c', 'copy',
            '-movflags', '+faststart',
            $disk->path($path),
        ]);

        if ($result->failed() || ! $disk->exists($path)) {
            $disk->delete($path);
            // The video still plays, it only takes longer to start.
            Log::warning("No se pudo optimizar el video {$this->material->id}: ".mb_trim($result->errorOutput()));

            return;
        }

        $previous = $this->material->path;
        $this->material->update(['path' => $path, 'size' => $disk->size($path)]);
        $disk->delete($previous);
    }

    /**
     * Whether the media data ("mdat") comes before the index ("moov"), going through the top-level boxes.
     * The header is binary: it is read with fread and byte offsets, never with string functions
     * (Pint turns those into mb_* ones, which count UTF-8 characters instead of bytes).
     */
    private function indexIsAtTheEnd(string $file): bool
    {
        $handle = fopen($file, 'rb');
        $size = (int) filesize($file);

        if ($handle === false) {
            return false;
        }

        try {
            for ($position = 0; $position + 8 <= $size;) {
                fseek($handle, $position);
                $length = $this->bigEndian((string) fread($handle, 4));
                $type = (string) fread($handle, 4);

                if ($type === 'moov' || $type === 'mdat') {
                    return $type === 'mdat';
                }

                // 1: the real length follows as 64 bits; 0: the box runs to the end of the file.
                $length = match ($length) {
                    1 => $this->bigEndian((string) fread($handle, 8)),
                    0 => $size - $position,
                    default => $length,
                };

                if ($length < 8) {
                    return false;
                }

                $position += $length;
            }

            return false;
        } finally {
            fclose($handle);
        }
    }

    private function bigEndian(string $bytes): int
    {
        $value = 0;

        for ($i = 0; isset($bytes[$i]); $i++) {
            $value = ($value << 8) | ord($bytes[$i]);
        }

        return $value;
    }
}
