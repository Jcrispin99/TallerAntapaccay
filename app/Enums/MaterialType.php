<?php

declare(strict_types=1);

namespace App\Enums;

enum MaterialType: string
{
    case Video = 'video';
    case Presentation = 'presentation';
    /** A video or page hosted elsewhere (YouTube, Vimeo, Drive…), shown embedded. */
    case Link = 'link';

    /**
     * @return list<string>
     */
    public static function extensionsFor(self $type): array
    {
        return match ($type) {
            self::Video => ['mp4', 'webm', 'm4v', 'mov'],
            self::Presentation => ['ppt', 'pptx', 'odp', 'pdf'],
            self::Link => [],
        };
    }

    public static function fromExtension(string $extension): ?self
    {
        $extension = mb_strtolower($extension);

        foreach (self::cases() as $type) {
            if (in_array($extension, self::extensionsFor($type), true)) {
                return $type;
            }
        }

        return null;
    }

    /** Largest file accepted for this type, in MB (config/platform.php). */
    public function maxUploadMb(): int
    {
        return $this === self::Video ? config()->integer('platform.max_video_mb') : config()->integer('platform.max_presentation_mb');
    }
}
