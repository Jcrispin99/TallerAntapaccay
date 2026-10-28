<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name') }}</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    </head>
    <body class="antialiased">
        <div
            id="app"
            data-max-video-mb="{{ config('platform.max_video_mb') }}"
            data-max-presentation-mb="{{ config('platform.max_presentation_mb') }}"
        ></div>
    </body>
</html>
