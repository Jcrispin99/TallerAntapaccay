<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\UpdatePasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Login for teachers and admins of the panel (Sanctum bearer tokens).
 */
final class AuthController extends ApiController
{
    private const int TOKEN_DAYS = 7;

    /**
     * @throws ValidationException
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', mb_strtolower($request->email))->first();

        if ($user === null || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['email' => 'El correo o la contraseña no son correctos.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Tu cuenta está desactivada. Habla con un administrador.']);
        }

        $token = $user->createToken('panel', expiresAt: now()->addDays(self::TOKEN_DAYS))->plainTextToken;

        return $this->success(['user' => new UserResource($user), 'token' => $token], 'Sesión iniciada');
    }

    public function logout(Request $request): JsonResponse
    {
        $this->user($request)->currentAccessToken()->delete();

        return $this->success(message: 'Sesión cerrada');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success(new UserResource($this->user($request)));
    }

    /**
     * Changing the password signs out every other session.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $this->user($request);
        $user->update(['password' => $request->password]);

        $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();

        return $this->success(message: 'Contraseña actualizada');
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
