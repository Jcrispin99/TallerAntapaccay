<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Large files sent in parts. Cloudflare cuts any request over 100 MB, so the
 * browser sends the file in chunks that are appended here in order; once all
 * bytes arrived, the file is stored as material like a regular upload.
 *
 * @phpstan-type UploadMeta array{user_id: int, course_id: int, name: string, mime: string|null, size: int}
 */
final class ChunkedUploads
{
    /** Well under Cloudflare's 100 MB per request. */
    public const int CHUNK_BYTES = 20 * 1024 * 1024;

    /** Uploads left unfinished for this long are deleted. */
    private const int EXPIRES_SECONDS = 24 * 60 * 60;

    private const string DIRECTORY = 'uploads';

    public function start(User $user, Course $course, string $name, ?string $mime, int $size): string
    {
        $this->deleteExpired();

        $id = (string) Str::uuid();

        $this->disk()->put($this->metaPath($id), (string) json_encode([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'name' => $name,
            'mime' => $mime,
            'size' => $size,
        ]));
        $this->disk()->put($this->partPath($id), '');

        return $id;
    }

    /**
     * @return UploadMeta|null
     */
    public function find(string $id, User $user): ?array
    {
        if (! Str::isUuid($id) || ! $this->disk()->exists($this->metaPath($id))) {
            return null;
        }

        /** @var UploadMeta $meta */
        $meta = json_decode((string) $this->disk()->get($this->metaPath($id)), true);

        return $meta['user_id'] === $user->id ? $meta : null;
    }

    /**
     * Appends a chunk if it starts where the file currently ends. A retried chunk
     * that already arrived is skipped, so the browser can resume from the result.
     *
     * @param  UploadMeta  $meta
     * @return int|null Bytes received so far, or null when the chunk would go past the declared size.
     */
    public function append(string $id, array $meta, int $offset, UploadedFile $chunk): ?int
    {
        $out = fopen($this->disk()->path($this->partPath($id)), 'ab');
        assert($out !== false);

        try {
            flock($out, LOCK_EX);
            $stat = fstat($out);
            $received = $stat === false ? 0 : $stat['size'];

            if ($offset !== $received) {
                return $received;
            }

            if ($received + (int) $chunk->getSize() > $meta['size']) {
                return null;
            }

            $in = fopen((string) $chunk->getRealPath(), 'rb');
            assert($in !== false);
            $received += (int) stream_copy_to_stream($in, $out);
            fclose($in);

            return $received;
        } finally {
            flock($out, LOCK_UN);
            fclose($out);
        }
    }

    /** The assembled file, once every byte arrived for this course. */
    public function completed(string $id, User $user, Course $course): ?UploadedFile
    {
        $meta = $this->find($id, $user);

        if ($meta === null || $meta['course_id'] !== $course->id || $this->disk()->size($this->partPath($id)) !== $meta['size']) {
            return null;
        }

        return new UploadedFile($this->disk()->path($this->partPath($id)), $meta['name'], $meta['mime'], null, true);
    }

    public function discard(string $id): void
    {
        $this->disk()->delete([$this->metaPath($id), $this->partPath($id)]);
    }

    private function deleteExpired(): void
    {
        foreach ($this->disk()->files(self::DIRECTORY) as $file) {
            // Every chunk touches the part file, so it tells when the upload was last active.
            if (str_ends_with($file, '.part') && $this->disk()->lastModified($file) < now()->getTimestamp() - self::EXPIRES_SECONDS) {
                $this->discard(basename($file, '.part'));
            }
        }
    }

    private function disk(): FilesystemAdapter
    {
        return Storage::disk('local');
    }

    private function metaPath(string $id): string
    {
        return self::DIRECTORY."/{$id}.json";
    }

    private function partPath(string $id): string
    {
        return self::DIRECTORY."/{$id}.part";
    }
}
