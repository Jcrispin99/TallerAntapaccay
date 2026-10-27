<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Http\JsonResponse;

final class CourseController extends ApiController
{
    public function index(): JsonResponse
    {
        $courses = Course::query()
            ->where('is_published', true)
            ->withCount('materials')
            ->with(['evaluation' => fn (HasOne $query) => $query->withCount('questions')])
            ->latest()
            ->get();

        return $this->success(CourseResource::collection($courses));
    }

    public function show(Course $course): JsonResponse
    {
        abort_unless($course->is_published, 404);

        $course->load(['materials', 'evaluation' => fn (HasOne $query) => $query->withCount('questions')]);

        return $this->success(new CourseResource($course));
    }
}
