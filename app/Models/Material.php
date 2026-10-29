<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ConversionStatus;
use App\Enums\MaterialType;
use Database\Factories\MaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $course_id
 * @property MaterialType $type
 * @property string $title
 * @property string $original_name
 * @property string $path
 * @property string|null $external_url
 * @property string|null $mime
 * @property int $size
 * @property int|null $duration_seconds
 * @property string|null $pdf_path
 * @property ConversionStatus $conversion_status
 * @property string|null $conversion_error
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Course $course
 * @property-read Collection<int, MaterialView> $views
 */
#[Fillable([
    'type',
    'title',
    'original_name',
    'path',
    'external_url',
    'mime',
    'size',
    'duration_seconds',
    'pdf_path',
    'conversion_status',
    'conversion_error',
    'position',
])]
final class Material extends Model
{
    /** @use HasFactory<MaterialFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return HasMany<MaterialView, $this>
     */
    public function views(): HasMany
    {
        return $this->hasMany(MaterialView::class);
    }

    public function url(): string
    {
        return $this->external_url ?? Storage::disk('public')->url($this->path);
    }

    public function pdfUrl(): ?string
    {
        return $this->pdf_path !== null ? Storage::disk('public')->url($this->pdf_path) : null;
    }

    protected static function booted(): void
    {
        self::deleted(function (Material $material): void {
            Storage::disk('public')->delete(array_filter([$material->path, $material->pdf_path]));
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MaterialType::class,
            'conversion_status' => ConversionStatus::class,
            'size' => 'integer',
            'duration_seconds' => 'integer',
            'position' => 'integer',
        ];
    }
}
