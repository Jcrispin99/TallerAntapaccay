// Upload limits from config/platform.php, rendered by the server in app.blade.php.
const dataset = document.getElementById('app')?.dataset ?? {};

export const maxUploadMb = {
    video: Number(dataset.maxVideoMb) || 1024,
    presentation: Number(dataset.maxPresentationMb) || 100,
};

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'm4v', 'mov'];

export function isVideoFile(file: File): boolean {
    return VIDEO_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() ?? '');
}

/** Duration in seconds read by the browser, or null if it cannot play the file (for example some .mov). */
export function readVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        const done = (seconds: number | null) => {
            URL.revokeObjectURL(url);
            resolve(seconds);
        };

        video.preload = 'metadata';
        video.onloadedmetadata = () => done(Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null);
        video.onerror = () => done(null);
        video.src = url;
    });
}
