<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\MaterialType;
use App\Jobs\OptimizeVideoForStreaming;
use App\Models\Material;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * New videos are optimized when they are uploaded; this does the same for the
 * ones uploaded before, or again after installing FFmpeg.
 */
#[Signature('app:optimize-videos')]
#[Description('Pone el índice de cada video al principio, para que empiece a reproducirse mientras carga')]
final class OptimizeVideos extends Command
{
    public function handle(): int
    {
        Material::query()->where('type', MaterialType::Video)->each(function (Material $material): void {
            $path = $material->path;
            dispatch_sync(new OptimizeVideoForStreaming($material));
            $this->line(($material->refresh()->path === $path ? 'Sin cambios  ' : 'Optimizado   ').$material->title);
        });

        return self::SUCCESS;
    }
}
