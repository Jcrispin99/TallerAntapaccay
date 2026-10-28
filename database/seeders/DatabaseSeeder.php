<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Accounts are not seeded: create the first admin with
     * `php artisan app:create-admin {email}` and the rest from the panel.
     * The workshops are assigned to that admin.
     */
    public function run(): void
    {
        $this->call(TalleresSeeder::class);
    }
}
