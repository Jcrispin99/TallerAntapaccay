<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('is only for admins', function (): void {
    actingAsTeacher();

    $this->getJson('/api/v1/admin/users')->assertForbidden();
    $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'secreto123', 'role' => 'teacher'])->assertForbidden();
});

it('creates teacher accounts', function (): void {
    actingAsAdmin();

    $this->postJson('/api/v1/admin/users', [
        'name' => 'Profe Luis',
        'email' => 'Luis@Example.com',
        'password' => 'secreto123',
        'role' => 'teacher',
    ])->assertCreated()->assertJsonPath('data.email', 'luis@example.com');

    $this->postJson('/api/v1/auth/login', ['email' => 'luis@example.com', 'password' => 'secreto123'])->assertOk();
});

it('rejects duplicated emails and short passwords', function (): void {
    actingAsAdmin();
    User::factory()->create(['email' => 'usado@example.com']);

    $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'usado@example.com', 'password' => 'corta', 'role' => 'teacher'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

it('lists accounts with their number of courses', function (): void {
    $admin = actingAsAdmin();
    Course::factory()->count(2)->for($admin, 'owner')->create();

    $this->getJson('/api/v1/admin/users')
        ->assertOk()
        ->assertJsonPath('data.0.courses_count', 2);
});

it('resets a password and signs that teacher out', function (): void {
    $teacher = User::factory()->create();
    $teacher->createToken('panel');
    actingAsAdmin();

    $this->patchJson("/api/v1/admin/users/{$teacher->id}", ['password' => 'nueva-clave-1'])->assertOk();

    expect($teacher->tokens()->count())->toBe(0);
    $this->postJson('/api/v1/auth/login', ['email' => $teacher->email, 'password' => 'nueva-clave-1'])->assertOk();
});

it('keeps the password when it is not sent', function (): void {
    $teacher = User::factory()->create();
    actingAsAdmin();

    $this->patchJson("/api/v1/admin/users/{$teacher->id}", ['name' => 'Otro nombre', 'password' => null])->assertOk();

    $this->postJson('/api/v1/auth/login', ['email' => $teacher->email, 'password' => 'password'])->assertOk();
});

it('deactivates an account', function (): void {
    $teacher = User::factory()->create();
    $teacher->createToken('panel');
    actingAsAdmin();

    $this->patchJson("/api/v1/admin/users/{$teacher->id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

    expect($teacher->tokens()->count())->toBe(0);
    $this->postJson('/api/v1/auth/login', ['email' => $teacher->email, 'password' => 'password'])->assertUnprocessable();
});

it('does not let an admin lock themselves out', function (): void {
    $admin = actingAsAdmin();

    $this->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'teacher', 'is_active' => false])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['role', 'is_active']);

    $this->deleteJson("/api/v1/admin/users/{$admin->id}")->assertUnprocessable();
});

it('hands the courses of a deleted teacher to the admin', function (): void {
    $teacher = User::factory()->create();
    $course = Course::factory()->for($teacher, 'owner')->create();
    $admin = actingAsAdmin();

    $this->deleteJson("/api/v1/admin/users/{$teacher->id}")->assertNoContent();

    expect(User::query()->find($teacher->id))->toBeNull()
        ->and($course->refresh()->user_id)->toBe($admin->id);
});
