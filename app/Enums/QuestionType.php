<?php

declare(strict_types=1);

namespace App\Enums;

enum QuestionType: string
{
    case ShortText = 'short_text';
    case Paragraph = 'paragraph';
    case SingleChoice = 'single_choice';
    case MultipleChoice = 'multiple_choice';
    case Dropdown = 'dropdown';

    public function hasOptions(): bool
    {
        return in_array($this, [self::SingleChoice, self::MultipleChoice, self::Dropdown], true);
    }
}
