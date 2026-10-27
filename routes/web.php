<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The React SPA (resources/js) handles every page and talks to /api/v1.
| API, docs (/docs/api), storage files and the health check are excluded.
|
*/

Route::view('/{path?}', 'app')
    ->where('path', '^(?!api|docs|storage|up).*$')
    ->name('spa');
