<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A question as shown to students: never includes the answer key.
 *
 * @mixin Question
 */
final class QuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'prompt' => $this->prompt,
            'help_text' => $this->help_text,
            'points' => $this->points,
            'required' => $this->required,
            'options' => $this->options->map(fn (QuestionOption $option): array => [
                'id' => $option->id,
                'label' => $option->label,
            ])->values(),
        ];
    }
}
