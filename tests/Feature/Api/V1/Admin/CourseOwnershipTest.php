<?php

declare(strict_types=1);

use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->otherCourse = Course::factory()->create(['title' => 'De otro profe']);
});

it('lists only the teacher own courses', function (): void {
    $teacher = actingAsTeacher();
    Course::factory()->for($teacher, 'owner')->create(['title' => 'Mío']);

    $this->getJson('/api/v1/admin/courses')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Mío')
        ->assertJsonPath('data.0.owner.id', $teacher->id);
});

it('assigns new courses to the teacher who creates them', function (): void {
    $teacher = actingAsTeacher();

    $this->postJson('/api/v1/admin/courses', ['title' => 'Nuevo'])
        ->assertCreated()
        ->assertJsonPath('data.owner.id', $teacher->id);
});

it('forbids teachers from touching other teachers courses', function (): void {
    actingAsTeacher();
    $course = $this->otherCourse;
    $material = Material::factory()->for($course)->create();
    $attempt = Attempt::factory()->for(Evaluation::factory()->for($course))->submitted()->create();

    $this->getJson("/api/v1/admin/courses/{$course->id}")->assertForbidden();
    $this->patchJson("/api/v1/admin/courses/{$course->id}", ['title' => 'Mío ahora'])->assertForbidden();
    $this->deleteJson("/api/v1/admin/courses/{$course->id}")->assertForbidden();
    $this->getJson("/api/v1/admin/courses/{$course->id}/evaluation")->assertForbidden();
    $this->getJson("/api/v1/admin/courses/{$course->id}/attempts")->assertForbidden();
    $this->get("/api/v1/admin/courses/{$course->id}/attempts/export", ['Accept' => 'application/json'])->assertForbidden();
    $this->deleteJson("/api/v1/admin/materials/{$material->id}")->assertForbidden();
    $this->getJson("/api/v1/admin/attempts/{$attempt->id}")->assertForbidden();
});

it('lets admins see and edit every course', function (): void {
    actingAsAdmin();

    $this->getJson('/api/v1/admin/courses')->assertOk()->assertJsonCount(1, 'data');
    $this->patchJson("/api/v1/admin/courses/{$this->otherCourse->id}", ['title' => 'Editado por admin'])->assertOk();
});

it('lets only admins hand a course to another teacher', function (): void {
    $newOwner = User::factory()->create();

    actingAsTeacher();
    $this->postJson('/api/v1/admin/courses', ['title' => 'X', 'user_id' => $newOwner->id])->assertUnprocessable();

    actingAsAdmin();
    $this->patchJson("/api/v1/admin/courses/{$this->otherCourse->id}", ['user_id' => $newOwner->id])
        ->assertOk()
        ->assertJsonPath('data.owner.id', $newOwner->id);
});
