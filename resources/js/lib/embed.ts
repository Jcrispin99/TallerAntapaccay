/** How a link material is shown: in its provider's player, as a plain video or as an embedded page. */
export interface Embed {
    kind: 'player' | 'video' | 'page';
    src: string;
    /** What the student sees in the material list: "Video de YouTube", "Enlace"… */
    label: string;
    /** Who serves it, to tell the student what their network may be blocking. */
    provider: string;
}

const VIDEO_PATH = /\.(mp4|webm|m4v|mov)$/i;

export function embedOf(url: string): Embed {
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        return { kind: 'page', src: url, label: 'Enlace', provider: 'esa página' };
    }

    const host = parsed.hostname.replace(/^(www|m)\./, '');
    const [first, second, third] = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const id = host === 'youtu.be' ? first : (parsed.searchParams.get('v') ?? (['embed', 'shorts', 'live'].includes(first ?? '') ? second : undefined));

        if (id) {
            return { kind: 'player', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`, label: 'Video de YouTube', provider: 'YouTube' };
        }
    }

    if (host === 'vimeo.com' && /^\d+$/.test(first ?? '')) {
        // Unlisted videos carry their access hash after the id.
        const hash = second ?? parsed.searchParams.get('h');

        return { kind: 'player', src: `https://player.vimeo.com/video/${first}${hash ? `?h=${encodeURIComponent(hash)}` : ''}`, label: 'Video de Vimeo', provider: 'Vimeo' };
    }

    if (host === 'player.vimeo.com') {
        return { kind: 'player', src: url, label: 'Video de Vimeo', provider: 'Vimeo' };
    }

    if (host === 'drive.google.com' && first === 'file' && second === 'd' && third) {
        return { kind: 'player', src: `https://drive.google.com/file/d/${encodeURIComponent(third)}/preview`, label: 'Archivo de Google Drive', provider: 'Google Drive' };
    }

    if (VIDEO_PATH.test(parsed.pathname)) {
        return { kind: 'video', src: url, label: 'Video', provider: host };
    }

    return { kind: 'page', src: url, label: 'Enlace', provider: host };
}
