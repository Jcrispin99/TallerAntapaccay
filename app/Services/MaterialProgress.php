<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\MaterialType;
use App\Models\Material;
use App\Models\MaterialView;
use App\Models\Student;

/**
 * Records how far a student got in a material. The player already prevents
 * skipping ahead; here a video's position can only grow as fast as real time
 * allows, so a single request cannot mark it as watched.
 */
final class MaterialProgress
{
    /** Fastest playback speed the player allows. */
    private const float MAX_SPEED = 2.0;

    /** Margin for network delays and the first report. */
    private const int SLACK_SECONDS = 15;

    /** Players often stop a moment before the reported duration. */
    private const int END_TOLERANCE_SECONDS = 5;

    /**
     * @param  int  $position  Furthest second reached in the player (videos only).
     * @param  int|null  $reportedDuration  Duration seen by the player, used when the upload did not record one.
     */
    public function record(Material $material, Student $student, int $position, ?int $reportedDuration): MaterialView
    {
        $view = $material->views()->firstOrCreate(['student_id' => $student->id]);

        if ($view->completed_at !== null) {
            return $view;
        }

        // Presentations count as seen once opened.
        if ($material->type !== MaterialType::Video) {
            $view->update(['completed_at' => now()]);

            return $view;
        }

        $elapsed = max(0, (int) $view->updated_at?->diffInSeconds(now()));
        $reachable = $view->seconds_watched + (int) ceil($elapsed * self::MAX_SPEED) + self::SLACK_SECONDS;
        $view->seconds_watched = max($view->seconds_watched, min($position, $reachable));

        $duration = $material->duration_seconds ?? $reportedDuration;

        if ($duration !== null && $view->seconds_watched >= $duration - self::END_TOLERANCE_SECONDS) {
            $view->completed_at = now();
        }

        $view->save();

        return $view;
    }
}
