<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\MaterialProgressRequest;
use App\Http\Requests\Api\V1\StartAttemptRequest;
use App\Http\Resources\MaterialProgressResource;
use App\Models\Course;
use App\Models\Material;
use App\Services\MaterialProgress;
use Illuminate\Http\JsonResponse;

/**
 * Students go through the course material before taking its evaluation. They
 * identify with their DNI on the course page, and the player reports their progress.
 */
final class MaterialProgressController extends ApiController
{
    public function show(StartAttemptRequest $request, Course $course): JsonResponse
    {
        abort_unless($course->is_published, 404);

        $student = $request->student();

        return $this->success([
            'student' => ['dni' => $student->dni, 'full_name' => $student->full_name],
            'progress' => MaterialProgressResource::collection(
                $student->materialViews()->whereIn('material_id', $course->materials()->select('id'))->get(),
            ),
        ]);
    }

    public function update(MaterialProgressRequest $request, Material $material, MaterialProgress $progress): JsonResponse
    {
        abort_unless($material->course->is_published, 404);

        $view = $progress->record($material, $request->student(), $request->position(), $request->reportedDuration());

        return $this->success(new MaterialProgressResource($view));
    }
}
