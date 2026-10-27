<?php

declare(strict_types=1);

namespace App\Enums;

enum AttemptStatus: string
{
    case InProgress = 'in_progress';
    case PendingReview = 'pending_review';
    case Graded = 'graded';
}
