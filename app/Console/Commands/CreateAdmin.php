<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Creates the first admin (or promotes an existing account). Every other
 * account is created from the panel.
 */
#[Signature('app:create-admin {email} {--name= : Nombre visible} {--password= : Si no se indica, se pregunta}')]
#[Description('Crea una cuenta de administrador (o convierte una existente en admin)')]
final class CreateAdmin extends Command
{
    public function handle(): int
    {
        $email = mb_strtolower((string) $this->argument('email'));

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error('Correo inválido.');

            return self::FAILURE;
        }

        $password = $this->option('password');

        if (! is_string($password) || $password === '') {
            $secret = $this->secret('Contraseña (mínimo 8 caracteres)');
            $password = is_string($secret) ? $secret : '';
        }

        if (mb_strlen($password) < 8) {
            $this->error('La contraseña debe tener al menos 8 caracteres.');

            return self::FAILURE;
        }

        $user = User::query()->firstOrNew(['email' => $email]);
        $user->fill([
            'name' => $this->option('name') ?: ($user->name ?? mb_strstr($email, '@', true)),
            'password' => $password,
            'role' => UserRole::Admin,
            'is_active' => true,
        ])->save();

        $this->info(($user->wasRecentlyCreated ? 'Admin creado: ' : 'Cuenta actualizada como admin: ').$email);

        return self::SUCCESS;
    }
}
