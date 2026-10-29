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
 * Makes an uploaded video start quickly and play without pauses:
 *
 * - A heavy video (over 720p or 2.5 Mbps) or one not every browser plays
 *   (HEVC from iPhones, WebM…) is encoded again as a light H.264 720p MP4.
 *   Screen recordings and slides end up 10 to 20 times lighter.
 * - A light one only gets its index (the "moov" box) moved to the start, in
 *   seconds and without re-encoding. With the index at the end, the browser
 *   cannot start until it reaches it: minutes of black screen in a large file.
 *
 * FFmpeg runs at the lowest priority, so pages keep loading while it works.
 * The result gets a new name, because Cloudflare keeps serving what it cached.
 */
#[Tries(1)]
#[Timeout(3600)]
#[DeleteWhenMissingModels]
final class OptimizeVideoForStreaming implements ShouldQueue
{
    use Queueable;

    /** Formats that store their index in boxes (MP4 and QuickTime). */
    private const array EXTENSIONS = ['mp4', 'm4v', 'mov'];

    private const int MAX_HEIGHT = 720;

    private const int MAX_BITRATE = 2_500_000;

    public function __construct(public Material $material) {}

    public function handle(): void
    {
        $source = Storage::disk('public')->path($this->material->path);
        $video = $this->probe($source);

        if ($video !== null && ($video['codec'] !== 'h264' || $video['height'] > self::MAX_HEIGHT || $video['bitrate'] > self::MAX_BITRATE)) {
            $this->replaceWith('mp4', 'video/mp4', [
                '-map', '0:v:0', '-map', '0:a:0?',
                // 720p at most, never enlarged, with the even size H.264 requires.
                '-vf', "scale=-2:'min(720,trunc(ih/2)*2)'",
                '-pix_fmt', 'yuv420p',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
                // Caps the peaks, so it plays steadily on connections of about 2 Mbps.
                '-maxrate', '2000k', '-bufsize', '4000k',
                '-c:a', 'aac', '-b:a', '128k',
                '-movflags', '+faststart',
            ]);

            return;
        }

        $extension = mb_strtolower(pathinfo($this->material->path, PATHINFO_EXTENSION));

        if (in_array($extension, self::EXTENSIONS, true) && $this->indexIsAtTheEnd($source)) {
            $this->replaceWith($extension, $this->material->mime, [
                // Video and audio only: some phones add data tracks that MP4 cannot hold.
                '-map', '0:v', '-map', '0:a?',
                '-c', 'copy',
                '-movflags', '+faststart',
            ]);
        }
    }

    /**
     * @param  list<string>  $arguments  FFmpeg options between the input and the output.
     */
    private function replaceWith(string $extension, ?string $mime, array $arguments): void
    {
        $disk = Storage::disk('public');
        $path = dirname($this->material->path).'/'.Str::uuid().'.'.$extension;

        // A bit under the job's timeout, so a stuck FFmpeg is stopped and logged.
        $result = Process::timeout(3570)->run([
            'nice', '-n', '19',
            config()->string('platform.ffmpeg_path'),
            '-v', 'error',
            '-i', $disk->path($this->material->path),
            ...$arguments,
            $disk->path($path),
        ]);

        if ($result->failed() || ! $disk->exists($path)) {
            $disk->delete($path);
            // The original still plays, only slower to start.
            Log::warning("No se pudo optimizar el video {$this->material->id}: ".mb_trim($result->errorOutput()));

            return;
        }

        $previous = $this->material->path;
        $this->material->update(['path' => $path, 'size' => $disk->size($path), 'mime' => $mime]);
        $disk->delete($previous);
    }

    /**
     * The first video stream and the overall bitrate, or null when FFprobe is missing or cannot read the file.
     *
     * @return array{codec: string, height: int, bitrate: int}|null
     */
    private function probe(string $file): ?array
    {
        $result = Process::timeout(60)->run([
            config()->string('platform.ffprobe_path'),
            '-v', 'error',
            '-print_format', 'json',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,height:format=bit_rate',
            $file,
        ]);

        $data = json_decode($result->output(), true);
        $codec = data_get($data, 'streams.0.codec_name');
        $height = data_get($data, 'streams.0.height');
        $bitrate = data_get($data, 'format.bit_rate');

        if ($result->failed() || ! is_string($codec)) {
            return null;
        }

        return [
            'codec' => $codec,
            'height' => is_int($height) ? $height : 0,
            'bitrate' => is_numeric($bitrate) ? (int) $bitrate : 0,
        ];
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
