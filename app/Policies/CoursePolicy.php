<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Course;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Teachers manage only their own courses (with their materials, evaluation
 * and results); admins manage every course.
 */
final class CoursePolicy
{
    public function manage(User $user, Course $course): Response
    {
        return $user->isAdmin() || $course->user_id === $user->id
            ? Response::allow()
            : Response::deny('Este curso pertenece a otro profesor.');
    }
}
