<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | LibreOffice
    |--------------------------------------------------------------------------
    |
    | Binary used to convert PPT/PPTX/ODP presentations to PDF so they can be
    | displayed in the browser.
    |
    */

    'libreoffice_path' => env('LIBREOFFICE_PATH', '/Applications/LibreOffice.app/Contents/MacOS/soffice'),

    'conversion_timeout' => (int) env('LIBREOFFICE_TIMEOUT', 300),

    /*
    |--------------------------------------------------------------------------
    | FFmpeg
    |--------------------------------------------------------------------------
    |
    | Makes uploaded videos start quickly: heavy ones are encoded again as a
    | light 720p MP4, and the index of the rest is moved to the start of the
    | file (see OptimizeVideoForStreaming).
    |
    */

    'ffmpeg_path' => env('FFMPEG_PATH', 'ffmpeg'),

    'ffprobe_path' => env('FFPROBE_PATH', 'ffprobe'),

    /*
    |--------------------------------------------------------------------------
    | Upload Limits (MB)
    |--------------------------------------------------------------------------
    |
    | PHP's upload_max_filesize and post_max_size must be at least as large.
    |
    */

    'max_video_mb' => (int) env('MAX_VIDEO_MB', 1024),

    'max_presentation_mb' => (int) env('MAX_PRESENTATION_MB', 100),

];
