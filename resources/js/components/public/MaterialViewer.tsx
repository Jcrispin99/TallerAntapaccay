import { DownloadIcon, FileWarningIcon, MaximizeIcon, MinimizeIcon, PlayIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Material } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatDuration } from '@/lib/format';

/** Progress of the identified student. Without it the material is shown freely. */
export interface Tracking {
    secondsWatched: number;
    completed: boolean;
    /** Videos send the furthest second reached and their duration; presentations just report they were opened. */
    onReport: (seconds?: number, duration?: number | null) => void;
}

const REPORT_EVERY_SECONDS = 10;
const CONFIRM_END_EVERY_MS = 4000;

export function MaterialViewer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    if (material.type !== 'video') {
        return <PresentationViewer material={material} tracking={tracking} />;
    }

    // Until the video is completed it plays start to finish; afterwards it can be reviewed freely.
    if (tracking && !tracking.completed) {
        return <RequiredVideo key={material.id} material={material} tracking={tracking} />;
    }

    return (
        <video key={material.id} src={material.url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black">
            Tu navegador no puede reproducir este video.
        </video>
    );
}

type PlayerState = 'idle' | 'playing' | 'stopped' | 'ended';

/**
 * A video that must be watched whole, at normal speed and while on screen: no
 * pause, seek or speed controls, and leaving the page (another tab or app, or
 * minimizing) stops it until the student comes back and continues.
 */
function RequiredVideo({ material, tracking }: { material: Material; tracking: Tracking }) {
    const container = useRef<HTMLDivElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const furthest = useRef(tracking.secondsWatched);
    const reported = useRef(tracking.secondsWatched);
    const onReport = useRef(tracking.onReport);
    onReport.current = tracking.onReport;

    const [state, setState] = useState<PlayerState>('idle');
    const [position, setPosition] = useState(tracking.secondsWatched);
    const [duration, setDuration] = useState(material.duration_seconds ?? 0);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    function report(force = false) {
        const seconds = Math.floor(furthest.current);

        if (force ? seconds > reported.current : seconds - reported.current >= REPORT_EVERY_SECONDS) {
            reported.current = seconds;
            onReport.current(seconds, video.current && Number.isFinite(video.current.duration) ? Math.round(video.current.duration) : null);
        }
    }

    function play() {
        video.current?.play().catch(() => setState('stopped'));
    }

    // The time only counts while the video is on screen.
    useEffect(() => {
        const stop = () => video.current?.pause();
        const onVisibility = () => document.hidden && stop();
        const onFullscreen = () => setFullscreen(document.fullscreenElement === container.current);

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', stop);
        document.addEventListener('fullscreenchange', onFullscreen);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', stop);
            document.removeEventListener('fullscreenchange', onFullscreen);
            // Switching to another material keeps what was watched.
            report(true);
        };
    }, []);

    // The server confirms the end once the real time has passed; keep asking until it does.
    useEffect(() => {
        if (state !== 'ended') {
            return;
        }

        const end = () => {
            reported.current = Math.ceil(furthest.current);
            onReport.current(reported.current, Math.round(furthest.current));
        };
        end();
        const timer = window.setInterval(end, CONFIRM_END_EVERY_MS);

        return () => window.clearInterval(timer);
    }, [state]);

    return (
        <div ref={container} className="overflow-hidden rounded-lg bg-black data-[fullscreen=true]:flex data-[fullscreen=true]:flex-col" data-fullscreen={fullscreen}>
            <div className="relative aspect-video w-full data-[fullscreen=true]:aspect-auto data-[fullscreen=true]:flex-1" data-fullscreen={fullscreen}>
                <video
                    ref={video}
                    src={material.url}
                    preload="metadata"
                    playsInline
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    className="h-full w-full object-contain"
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadedMetadata={(e) => {
                        if (Number.isFinite(e.currentTarget.duration)) {
                            setDuration(e.currentTarget.duration);
                        }
                        // Continue where the student left off.
                        e.currentTarget.currentTime = furthest.current;
                    }}
                    onPlay={() => setState('playing')}
                    onPause={(e) => {
                        if (!e.currentTarget.ended) {
                            setState('stopped');
                            report(true);
                        }
                    }}
                    onTimeUpdate={(e) => {
                        const current = e.currentTarget.currentTime;

                        // Only normal playback moves forward; anything else goes back to where it was.
                        if (current > furthest.current + 1.5) {
                            e.currentTarget.currentTime = furthest.current;
                            return;
                        }

                        furthest.current = Math.max(furthest.current, current);
                        setPosition(current);
                        report();
                    }}
                    onRateChange={(e) => {
                        if (e.currentTarget.playbackRate !== 1) {
                            e.currentTarget.playbackRate = 1;
                        }
                    }}
                    onEnded={(e) => {
                        furthest.current = e.currentTarget.duration;
                        setPosition(e.currentTarget.duration);
                        setState('ended');
                    }}
                >
                    Tu navegador no puede reproducir este video.
                </video>

                {(state === 'idle' || state === 'stopped') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-sm text-white">
                        <p className="max-w-md">
                            {state === 'idle'
                                ? 'Este video debe verse completo, sin pausas y sin salir de esta página. Si cambias de pestaña o de aplicación, se detiene y ese tiempo no cuenta.'
                                : 'El video se detuvo porque saliste de la página. Para que cuente, tiene que reproducirse completo.'}
                        </p>
                        <Button size="lg" onClick={play}>
                            <PlayIcon />
                            {furthest.current > 1 ? `Continuar desde ${formatDuration(furthest.current)}` : 'Reproducir'}
                        </Button>
                    </div>
                )}

                {state === 'ended' && !tracking.completed && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 text-sm text-white">
                        <Spinner />
                        Registrando que terminaste el video…
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 bg-black px-3 py-2 text-xs text-white">
                <Progress value={duration > 0 ? (position / duration) * 100 : 0} className="h-1.5 flex-1 bg-white/20" />
                <span className="tabular-nums">
                    {formatDuration(position)} / {formatDuration(duration)}
                </span>
                <button
                    type="button"
                    className="rounded p-1 hover:bg-white/10"
                    aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                    onClick={() => {
                        if (video.current) {
                            video.current.muted = !muted;
                            setMuted(!muted);
                        }
                    }}
                >
                    {muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
                </button>
                {document.fullscreenEnabled && (
                    <button
                        type="button"
                        className="rounded p-1 hover:bg-white/10"
                        aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        onClick={() => (fullscreen ? document.exitFullscreen() : container.current?.requestFullscreen())}
                    >
                        {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
                    </button>
                )}
            </div>
        </div>
    );
}

function PresentationViewer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    const pending = tracking !== undefined && !tracking.completed;
    const onReport = useRef(tracking?.onReport);
    onReport.current = tracking?.onReport;

    // A presentation counts as seen once it is on screen.
    useEffect(() => {
        if (pending && material.pdf_url) {
            onReport.current?.();
        }
    }, [pending, material.id, material.pdf_url]);

    if (material.pdf_url) {
        return <iframe key={material.id} src={material.pdf_url} title={material.title} className="aspect-[4/3] w-full rounded-lg border bg-background" />;
    }

    if (material.conversion_status === 'failed') {
        return (
            <Placeholder>
                <FileWarningIcon className="size-8 text-muted-foreground" />
                <p>No se pudo mostrar esta presentación en el navegador.</p>
                <Button asChild variant="outline">
                    <a href={material.url} download={material.original_name} onClick={() => pending && tracking.onReport()}>
                        <DownloadIcon />
                        Descargar {material.original_name}
                    </a>
                </Button>
            </Placeholder>
        );
    }

    return (
        <Placeholder>
            <Spinner className="size-6" />
            <p>Estamos preparando la presentación, aparecerá en unos segundos…</p>
        </Placeholder>
    );
}

function Placeholder({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}
