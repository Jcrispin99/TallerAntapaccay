import { DownloadIcon, ExternalLinkIcon, FileWarningIcon, InfoIcon, PlayIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Material } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { embedOf } from '@/lib/embed';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Progress of the identified student. Without it the material is shown freely. */
export interface Tracking {
    secondsWatched: number;
    completed: boolean;
    /** Videos send the furthest second reached and their duration; presentations and links just report they were opened. */
    onReport: (seconds?: number, duration?: number | null) => void;
}

const REPORT_EVERY_SECONDS = 10;
const CONFIRM_END_EVERY_MS = 4000;

/**
 * The material on screen. It is meant to sit inside the course page's stage
 * (`.material-stage`), which handles cinema mode and full screen for every type:
 * `data-stage-fill` marks what grows to fill the screen.
 */
export function MaterialViewer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    if (material.type === 'link') {
        return <LinkViewer key={material.id} material={material} tracking={tracking} />;
    }

    if (material.type !== 'video') {
        return <PresentationViewer material={material} tracking={tracking} />;
    }

    // Until the video is completed it plays start to finish; afterwards it can be reviewed freely.
    if (tracking && !tracking.completed) {
        return <RequiredVideo key={material.id} material={material} tracking={tracking} />;
    }

    return (
        <video key={material.id} src={material.url} controls preload="metadata" data-stage-fill className="aspect-video w-full bg-black">
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
    const video = useRef<HTMLVideoElement>(null);
    const furthest = useRef(tracking.secondsWatched);
    const reported = useRef(tracking.secondsWatched);
    const onReport = useRef(tracking.onReport);
    onReport.current = tracking.onReport;

    const [state, setState] = useState<PlayerState>('idle');
    const [position, setPosition] = useState(tracking.secondsWatched);
    const [duration, setDuration] = useState(material.duration_seconds ?? 0);
    const [muted, setMuted] = useState(false);

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

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', stop);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', stop);
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
        <div className="flex flex-col bg-black">
            <div data-stage-fill className="relative aspect-video min-h-0 w-full">
                <video
                    ref={video}
                    src={material.url}
                    preload="metadata"
                    playsInline
                    disablePictureInPicture
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    className="absolute inset-0 h-full w-full object-contain"
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

                {state === 'playing' && (
                    <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-sm bg-primary px-2 py-1 font-condensed text-xs font-bold tracking-wider text-primary-foreground">
                        <span className="size-1.5 rounded-full bg-primary-foreground" />
                        REPRODUCIENDO
                    </span>
                )}

                {(state === 'idle' || state === 'stopped') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 p-6 text-center">
                        <p className="max-w-md text-sm text-white/90 sm:text-base">
                            {state === 'idle'
                                ? 'Este video debe verse completo, sin pausas y sin salir de esta página. Si cambias de pestaña o de aplicación, se detiene y ese tiempo no cuenta.'
                                : 'El video se detuvo porque saliste de la página. Para que cuente, tiene que reproducirse completo.'}
                        </p>
                        <Button size="lg" className="h-12 px-6 font-condensed text-base font-bold tracking-wide uppercase" onClick={play}>
                            <PlayIcon className="fill-current" />
                            {furthest.current > 1 ? `Continuar desde ${formatDuration(furthest.current)}` : 'Reproducir'}
                        </Button>
                    </div>
                )}

                {state === 'ended' && !tracking.completed && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/75 text-sm text-white">
                        <Spinner />
                        Registrando que terminaste el video…
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 bg-[#0e0f12] py-1.5 pr-2 pl-4 text-white">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-primary" style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }} />
                </div>
                <span className="text-sm text-white/80 tabular-nums">
                    {formatDuration(position)} / {formatDuration(duration)}
                </span>
                <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-md hover:bg-white/10"
                    aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                    onClick={() => {
                        if (video.current) {
                            video.current.muted = !muted;
                            setMuted(!muted);
                        }
                    }}
                >
                    {muted ? <VolumeXIcon className="size-5" /> : <Volume2Icon className="size-5" />}
                </button>
            </div>
            <p className="flex gap-2.5 bg-card px-4 py-2.5 text-sm text-card-foreground/85">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                Sin pausa ni adelantar. Si cambias de pestaña o de aplicación, el video se detiene y ese tiempo no cuenta.
            </p>
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
        return <iframe key={material.id} src={material.pdf_url} title={material.title} data-stage-fill className="aspect-[4/3] w-full bg-white" />;
    }

    if (material.conversion_status === 'failed') {
        return (
            <Placeholder>
                <FileWarningIcon className="size-8" />
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

/**
 * A video or page hosted elsewhere, embedded as is: its own player and
 * controls, so it counts as seen once opened, like a presentation.
 */
function LinkViewer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    const embed = embedOf(material.url);
    const pending = tracking !== undefined && !tracking.completed;
    const onReport = useRef(tracking?.onReport);
    onReport.current = tracking?.onReport;

    useEffect(() => {
        if (pending) {
            onReport.current?.();
        }
    }, [pending]);

    return (
        <div className="flex flex-col bg-black">
            {embed.kind === 'video' ? (
                <video src={embed.src} controls preload="metadata" playsInline data-stage-fill className="aspect-video w-full bg-black">
                    Tu navegador no puede reproducir este video.
                </video>
            ) : (
                <iframe
                    src={embed.src}
                    title={material.title}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    // YouTube refuses to play embeds that don't say which site they are on.
                    referrerPolicy="strict-origin-when-cross-origin"
                    data-stage-fill
                    className={cn('aspect-video w-full', embed.kind === 'page' ? 'bg-white' : 'bg-black')}
                />
            )}
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-card px-4 py-2.5 text-sm text-card-foreground/85">
                <InfoIcon className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">¿No se ve? Puede que la red de tu empresa bloquee {embed.provider}.</span>
                <a href={material.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">
                    Abrir en otra pestaña
                    <ExternalLinkIcon className="size-3.5" />
                </a>
            </p>
        </div>
    );
}

function Placeholder({ children }: { children: React.ReactNode }) {
    return (
        <div data-stage-fill className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-card p-6 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}
