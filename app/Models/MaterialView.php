<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\MaterialViewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A student's progress in one material: the furthest point of a video they
 * reached without skipping ahead, and when they finished it.
 *
 * @property int $id
 * @property int $material_id
 * @property int $student_id
 * @property int $seconds_watched
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Material $material
 * @property-read Student $student
 */
#[Fillable([
    'student_id',
    'seconds_watched',
    'completed_at',
])]
final class MaterialView extends Model
{
    /** @use HasFactory<MaterialViewFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'seconds_watched' => 0,
    ];

    /**
     * @return BelongsTo<Material, $this>
     */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'seconds_watched' => 'integer',
            'completed_at' => 'datetime',
        ];
    }
}
