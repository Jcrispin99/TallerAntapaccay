<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\StartUploadRequest;
use App\Http\Requests\Api\V1\Admin\UploadChunkRequest;
use App\Models\Course;
use App\Models\User;
use App\Services\ChunkedUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Files sent in chunks (see ChunkedUploads). Once every chunk arrived, the
 * upload id is sent to MaterialController@store instead of the file.
 */
final class UploadController extends ApiController
{
    public function __construct(private readonly ChunkedUploads $uploads) {}

    public function store(StartUploadRequest $request, Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        $id = $this->uploads->start($this->currentUser($request), $course, $request->name, $request->mime, $request->integer('size'));

        return $this->created(['id' => $id, 'chunk_size' => ChunkedUploads::CHUNK_BYTES], 'Subida iniciada');
    }

    /**
     * Always answers with the bytes received so far: the browser continues from
     * there, which also skips a chunk that arrived although its response was lost.
     */
    public function chunk(UploadChunkRequest $request, string $upload): JsonResponse
    {
        $meta = $this->uploads->find($upload, $this->currentUser($request));

        if ($meta === null) {
            return $this->notFound('La subida no existe o ya expiró. Vuelve a subir el archivo.');
        }

        $received = $this->uploads->append($upload, $meta, $request->integer('offset'), $request->chunk());

        if ($received === null) {
            return $this->validationError(['chunk' => ['Esta parte supera el tamaño del archivo.']]);
        }

        return $this->success(['received' => $received, 'size' => $meta['size']]);
    }

    private function currentUser(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
