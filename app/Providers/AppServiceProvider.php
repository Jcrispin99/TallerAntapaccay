<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        Gate::define('admin', fn (User $user): bool => $user->isAdmin());
    }

    /**
     * Configure the rate limiters for the application.
     */
    private function configureRateLimiting(): void
    {
        // Default API rate limiter - 60 requests per minute
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        // Login - per email and IP (brute force protection)
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(mb_strtolower($request->string('email')->toString()).'|'.$request->ip()));

        // Starting and submitting evaluations
        RateLimiter::for('attempts', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        // Material progress - per DNI, so a group on the same network is not blocked, with a cap per IP
        RateLimiter::for('progress', fn (Request $request): array => [
            Limit::perMinute(30)->by('dni:'.$request->string('dni')->upper()->toString().'|'.$request->ip()),
            Limit::perMinute(600)->by('ip:'.$request->ip()),
        ]);

        // Panel for teachers and admins
        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->getAuthIdentifier() ?? $request->ip()));
    }
}
