<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Api\V1\Admin\AnswerController;
use App\Http\Controllers\Api\V1\Admin\MaterialController;
use App\Http\Controllers\Api\V1\Admin\StudentController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use App\Http\Controllers\Api\V1\AttemptController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CourseController;
use App\Http\Controllers\Api\V1\EvaluationController;
use App\Http\Controllers\Api\V1\MaterialProgressController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
|
| Routes for API version 1. Students have no account (they are identified
| by their DNI); teachers and admins log in to the panel (/admin).
|
*/

// Public: course catalog and evaluations
Route::middleware('throttle:api')->name('api.v1.')->group(function (): void {
    Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
    Route::get('courses/{course:slug}', [CourseController::class, 'show'])->name('courses.show');
    Route::get('courses/{course:slug}/evaluation', [EvaluationController::class, 'show'])->name('courses.evaluation');

    Route::get('attempts/{attempt:token}', [AttemptController::class, 'show'])->name('attempts.show');

    Route::middleware('throttle:attempts')->group(function (): void {
        Route::post('evaluations/{evaluation}/attempts', [AttemptController::class, 'store'])->name('attempts.store');
        Route::post('attempts/{attempt:token}/submit', [AttemptController::class, 'submit'])->name('attempts.submit');
    });
});

// Public: progress in the course material, required before the evaluation.
// The player reports every few seconds, so it is limited per DNI rather than per IP.
Route::middleware('throttle:progress')->name('api.v1.')->group(function (): void {
    Route::post('courses/{course:slug}/progress', [MaterialProgressController::class, 'show'])->name('courses.progress');
    Route::post('materials/{material}/progress', [MaterialProgressController::class, 'update'])->name('materials.progress');
});

// Panel login (Sanctum bearer tokens)
Route::prefix('auth')->name('api.v1.auth.')->group(function (): void {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');

    Route::middleware(['auth:sanctum', 'throttle:admin'])->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::put('password', [AuthController::class, 'updatePassword'])->name('password');
    });
});

// Panel: teachers manage their own courses, admins every course (see CoursePolicy)
Route::prefix('admin')->middleware(['auth:sanctum', 'throttle:admin'])->name('api.v1.admin.')->group(function (): void {
    Route::apiResource('courses', Admin\CourseController::class);

    Route::post('courses/{course}/materials', [MaterialController::class, 'store'])->name('materials.store');
    Route::patch('courses/{course}/materials/order', [MaterialController::class, 'reorder'])->name('materials.reorder');
    Route::patch('materials/{material}', [MaterialController::class, 'update'])->name('materials.update');
    Route::delete('materials/{material}', [MaterialController::class, 'destroy'])->name('materials.destroy');
    Route::post('materials/{material}/retry', [MaterialController::class, 'retryConversion'])->name('materials.retry');

    Route::get('courses/{course}/evaluation', [Admin\EvaluationController::class, 'show'])->name('evaluation.show');
    Route::put('courses/{course}/evaluation', [Admin\EvaluationController::class, 'update'])->name('evaluation.update');

    Route::get('courses/{course}/attempts', [Admin\AttemptController::class, 'index'])->name('attempts.index');
    Route::get('courses/{course}/attempts/export', [Admin\AttemptController::class, 'export'])->name('attempts.export');
    Route::get('attempts/{attempt}', [Admin\AttemptController::class, 'show'])->name('attempts.show');
    Route::patch('answers/{answer}/grade', [AnswerController::class, 'grade'])->name('answers.grade');

    // Admins only: teacher accounts and the list of students allowed to take evaluations
    Route::middleware('can:admin')->group(function (): void {
        Route::apiResource('users', UserController::class)->except('show');
        Route::post('students/import', [StudentController::class, 'import'])->name('students.import');
        Route::apiResource('students', StudentController::class)->except('show');
    });
});
