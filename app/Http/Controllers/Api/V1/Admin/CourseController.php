<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\CourseRequest;
use App\Http\Resources\Admin\CourseResource;
use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

final class CourseController extends ApiController
{
    /**
     * Admins see every course; teachers only their own.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        $courses = Course::query()
            ->unless($user->isAdmin(), fn ($query) => $query->whereBelongsTo($user, 'owner'))
            ->with('owner')
            ->withCount('materials')
            ->with(['evaluation' => fn (HasOne $query) => $query->withCount(['questions', 'attempts'])])
            ->latest()
            ->get();

        return $this->success(CourseResource::collection($courses));
    }

    public function store(CourseRequest $request): JsonResponse
    {
        $course = new Course($request->validated());
        $course->user_id = $request->integer('user_id') ?: $this->currentUser($request)->id;
        $course->save();

        return $this->created(new CourseResource($course->load('owner')));
    }

    public function show(Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        return $this->success(new CourseResource($this->loadDetails($course)));
    }

    public function update(CourseRequest $request, Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        $course->fill($request->validated());

        if ($request->has('user_id')) {
            $course->user_id = $request->integer('user_id');
        }

        $course->save();

        return $this->success(new CourseResource($this->loadDetails($course)), 'Curso actualizado');
    }

    public function destroy(Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        $course->delete();
        Storage::disk('public')->deleteDirectory('courses/'.$course->id);

        return $this->noContent();
    }

    private function loadDetails(Course $course): Course
    {
        return $course->load(['owner', 'materials', 'evaluation' => fn (HasOne $query) => $query->withCount(['questions', 'attempts'])]);
    }

    private function currentUser(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
