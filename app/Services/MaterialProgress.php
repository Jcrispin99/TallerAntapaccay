<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\MaterialType;
use App\Models\Material;
use App\Models\MaterialView;
use App\Models\Student;

/**
 * Records how far a student got in a material. Videos must be watched at
 * normal speed: the player has no pause, seek or speed controls, and here a
 * video's position can only grow as fast as real time passes, so the whole
 * duration has to be spent on it.
 */
final class MaterialProgress
{
    /** The player reports every few seconds, so its first report may already be this far in. */
    private const int FIRST_REPORT_SECONDS = 15;

    /** Rounding of timestamps and network delays. */
    private const int MARGIN_SECONDS = 2;

    /** Durations are whole seconds, so the last second counts as the end. */
    private const int END_TOLERANCE_SECONDS = 1;

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

        // Presentations and links count as seen once opened.
        if ($material->type !== MaterialType::Video) {
            $view->update(['completed_at' => now()]);

            return $view;
        }

        $reachable = $view->wasRecentlyCreated
            ? self::FIRST_REPORT_SECONDS
            : $view->seconds_watched + max(0, (int) $view->updated_at?->diffInSeconds(now())) + self::MARGIN_SECONDS;
        $view->seconds_watched = max($view->seconds_watched, min($position, $reachable));

        $duration = $material->duration_seconds ?? $reportedDuration;

        if ($duration !== null && $view->seconds_watched >= $duration - self::END_TOLERANCE_SECONDS) {
            $view->completed_at = now();
        }

        $view->save();

        return $view;
    }
}
