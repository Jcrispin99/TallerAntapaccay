<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property bool $is_published
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $owner
 * @property-read Collection<int, Material> $materials
 * @property-read Evaluation|null $evaluation
 * @property-read int|null $materials_count
 * @property-read int|null $videos_count
 * @property-read int|null $links_count
 */
#[Fillable([
    'title',
    'description',
    'is_published',
])]
final class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_published' => false,
    ];

    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'curso';
        $slug = $base;
        $suffix = 2;

        while (self::query()->where('slug', $slug)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }

    /**
     * The teacher who manages the course. Null when that account was deleted.
     *
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return HasMany<Material, $this>
     */
    public function materials(): HasMany
    {
        return $this->hasMany(Material::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasOne<Evaluation, $this>
     */
    public function evaluation(): HasOne
    {
        return $this->hasOne(Evaluation::class);
    }

    /**
     * Whether the student finished every material, which they must do before taking the evaluation.
     */
    public function isCompletedBy(Student $student): bool
    {
        return $this->materials()
            ->whereDoesntHave('views', fn (Builder $query) => $query->whereBelongsTo($student)->whereNotNull('completed_at'))
            ->doesntExist();
    }

    protected static function booted(): void
    {
        self::creating(function (Course $course): void {
            $course->slug ??= self::uniqueSlug($course->title);
        });

        self::updating(function (Course $course): void {
            if ($course->isDirty('title')) {
                $course->slug = self::uniqueSlug($course->title, $course->id);
            }
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
            'is_published' => 'boolean',
        ];
    }
}
