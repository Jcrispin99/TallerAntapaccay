<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Teacher accounts, managed by admins only.
 */
final class UserController extends ApiController
{
    public function index(): JsonResponse
    {
        $users = User::query()->withCount('courses')->orderBy('name')->get();

        return $this->success(UserResource::collection($users));
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = User::query()->create([
            ...$request->validated(),
            'email' => mb_strtolower($request->string('email')->toString()),
        ]);

        return $this->created(new UserResource($user->loadCount('courses')), 'Cuenta creada');
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = array_filter($request->validated(), fn (mixed $value, string $key): bool => $key !== 'password' || $value !== null, ARRAY_FILTER_USE_BOTH);

        if (isset($data['email']) && is_string($data['email'])) {
            $data['email'] = mb_strtolower($data['email']);
        }

        $user->update($data);

        // A new password or a deactivated account signs that person out everywhere.
        if ($user->wasChanged('password') || ! $user->is_active) {
            $user->tokens()->delete();
        }

        return $this->success(new UserResource($user->loadCount('courses')), 'Cuenta actualizada');
    }

    /**
     * The deleted teacher's courses are handed over to the admin who deletes the account.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $admin = $request->user();
        assert($admin instanceof User);

        if ($user->is($admin)) {
            return $this->error('No puedes eliminar tu propia cuenta.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($user, $admin): void {
            $user->courses()->update(['user_id' => $admin->id]);
            $user->tokens()->delete();
            $user->delete();
        });

        return $this->noContent();
    }
}
