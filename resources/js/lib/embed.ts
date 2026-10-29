/** How a link material is shown: in its provider's player, as a plain video or as an embedded page. */
export interface Embed {
    kind: 'player' | 'video' | 'page';
    src: string;
    /** The real address, without the redirect of a search result or an email. */
    href: string;
    /** What the student sees in the material list: "Video de YouTube", "Enlace"… */
    label: string;
    /** Who serves it, to tell the student what their network may be blocking. */
    provider: string;
}

const VIDEO_PATH = /\.(mp4|webm|m4v|mov)$/i;

export function embedOf(url: string): Embed {
    let parsed: URL;

    try {
        parsed = unwrapRedirect(new URL(url));
    } catch {
        return { kind: 'page', src: url, href: url, label: 'Enlace', provider: 'esa página' };
    }

    const href = parsed.href;
    const host = parsed.hostname.replace(/^(www|m)\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);
    const [first, second, third] = segments;

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const id = host === 'youtu.be' ? first : (parsed.searchParams.get('v') ?? (['embed', 'shorts', 'live'].includes(first ?? '') ? second : undefined));

        if (id) {
            return { kind: 'player', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`, href, label: 'Video de YouTube', provider: 'YouTube' };
        }
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        // The id is the last number in the path: vimeo.com/123, /channels/x/123, /reviews/…/videos/123, player.vimeo.com/video/123.
        const id = segments.filter((segment) => /^\d+$/.test(segment)).pop();

        if (id) {
            // Unlisted videos carry their access hash right after the id.
            const next = segments[segments.lastIndexOf(id) + 1];
            const hash = next && /^[0-9a-f]+$/i.test(next) ? next : parsed.searchParams.get('h');

            return { kind: 'player', src: `https://player.vimeo.com/video/${id}${hash ? `?h=${encodeURIComponent(hash)}` : ''}`, href, label: 'Video de Vimeo', provider: 'Vimeo' };
        }
    }

    if (host === 'drive.google.com' || host === 'docs.google.com') {
        const id = first === 'file' && second === 'd' ? third : parsed.searchParams.get('id');

        if (id) {
            return { kind: 'player', src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`, href, label: 'Archivo de Google Drive', provider: 'Google Drive' };
        }
    }

    if (VIDEO_PATH.test(parsed.pathname)) {
        return { kind: 'video', src: href, href, label: 'Video', provider: host };
    }

    return { kind: 'page', src: href, href, label: 'Enlace', provider: host };
}

/** Links copied from Google results, Outlook or Facebook go through a redirect that carries the real address. */
function unwrapRedirect(url: URL): URL {
    const host = url.hostname.replace(/^www\./, '');
    const target = /^google\.[a-z.]+$/.test(host) && url.pathname === '/url'
        ? (url.searchParams.get('url') ?? url.searchParams.get('q'))
        : host.endsWith('safelinks.protection.outlook.com')
          ? url.searchParams.get('url')
          : host === 'l.facebook.com' || host === 'lm.facebook.com'
            ? url.searchParams.get('u')
            : null;

    try {
        return target ? new URL(target) : url;
    } catch {
        return url;
    }
}
