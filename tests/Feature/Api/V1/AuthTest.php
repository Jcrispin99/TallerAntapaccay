<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create(['email' => 'profe@example.com', 'password' => 'secreto123']);
});

it('logs in with email and password', function (): void {
    $token = $this->postJson('/api/v1/auth/login', ['email' => 'PROFE@example.com', 'password' => 'secreto123'])
        ->assertOk()
        ->assertJsonPath('data.user.email', 'profe@example.com')
        ->assertJsonPath('data.user.role', 'teacher')
        ->json('data.token');

    $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
        ->assertOk()
        ->assertJsonPath('data.id', $this->user->id);
});

it('rejects a wrong password', function (): void {
    $this->postJson('/api/v1/auth/login', ['email' => 'profe@example.com', 'password' => 'otra-cosa'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('rejects deactivated accounts', function (): void {
    $this->user->update(['is_active' => false]);

    $this->postJson('/api/v1/auth/login', ['email' => 'profe@example.com', 'password' => 'secreto123'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('logs out by revoking the token', function (): void {
    $token = $this->postJson('/api/v1/auth/login', ['email' => 'profe@example.com', 'password' => 'secreto123'])->json('data.token');

    $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])->assertOk();

    expect($this->user->tokens()->count())->toBe(0);
});

it('protects the panel', function (): void {
    $this->getJson('/api/v1/admin/courses')->assertUnauthorized();
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
});

it('changes the own password', function (): void {
    actingAsTeacher();

    $this->putJson('/api/v1/auth/password', [
        'current_password' => 'password',
        'password' => 'nueva-clave-1',
        'password_confirmation' => 'nueva-clave-1',
    ])->assertOk();

    $this->putJson('/api/v1/auth/password', [
        'current_password' => 'incorrecta',
        'password' => 'nueva-clave-2',
        'password_confirmation' => 'nueva-clave-2',
    ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
});

it('creates the first admin from the command line', function (): void {
    $this->artisan('app:create-admin', ['email' => 'Jefa@example.com', '--password' => 'super-secreto'])->assertSuccessful();

    expect(User::query()->where('email', 'jefa@example.com')->sole()->isAdmin())->toBeTrue();
});
