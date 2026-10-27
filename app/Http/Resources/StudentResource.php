<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Student
 */
final class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'dni' => $this->dni,
            'full_name' => $this->full_name,
            'gerencia' => $this->gerencia,
            'puesto' => $this->puesto,
            'attempts_count' => $this->whenCounted('attempts'),
        ];
    }
}
