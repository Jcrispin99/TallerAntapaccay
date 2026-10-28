import { DownloadIcon, FileWarningIcon } from 'lucide-react';
import { useEffect, useRef, type SyntheticEvent } from 'react';
import { toast } from 'sonner';

import type { Material } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/** Progress of the identified student. Without it the material is shown freely. */
export interface Tracking {
    secondsWatched: number;
    completed: boolean;
    /** Videos send the furthest second reached and their duration; presentations just report they were opened. */
    onReport: (seconds?: number, duration?: number | null) => void;
}

const REPORT_EVERY_SECONDS = 15;
const MAX_SPEED = 2;

export function MaterialViewer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    if (material.type === 'video') {
        return <VideoPlayer key={material.id} material={material} tracking={tracking} />;
    }

    return <PresentationViewer material={material} tracking={tracking} />;
}

/**
 * Until the video is completed it can be paused and rewound, but not moved past
 * the furthest point already watched. It resumes there on the next visit.
 */
function VideoPlayer({ material, tracking }: { material: Material; tracking?: Tracking }) {
    const locked = tracking !== undefined && !tracking.completed;
    const furthest = useRef(tracking?.secondsWatched ?? 0);
    const reported = useRef(furthest.current);

    useEffect(() => {
        furthest.current = Math.max(furthest.current, tracking?.secondsWatched ?? 0);
    }, [tracking?.secondsWatched]);

    function report(video: HTMLVideoElement, now = false) {
        const seconds = Math.floor(furthest.current);

        if (locked && (now ? seconds > reported.current : seconds - reported.current >= REPORT_EVERY_SECONDS)) {
            reported.current = seconds;
            tracking.onReport(seconds, Number.isFinite(video.duration) ? Math.round(video.duration) : null);
        }
    }

    const handlers = locked
        ? {
              onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
                  if (furthest.current > 1) {
                      e.currentTarget.currentTime = furthest.current;
                  }
              },
              onSeeking: (e: SyntheticEvent<HTMLVideoElement>) => {
                  if (e.currentTarget.currentTime > furthest.current + 1) {
                      e.currentTarget.currentTime = furthest.current;
                      toast.info('Mira el video completo: no se puede adelantar.', { id: 'no-skip' });
                  }
              },
              onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => {
                  const video = e.currentTarget;

                  if (!video.seeking && video.currentTime <= furthest.current + 1.5) {
                      furthest.current = Math.max(furthest.current, video.currentTime);
                      report(video);
                  }
              },
              onRateChange: (e: SyntheticEvent<HTMLVideoElement>) => {
                  if (e.currentTarget.playbackRate > MAX_SPEED) {
                      e.currentTarget.playbackRate = MAX_SPEED;
                  }
              },
              onPause: (e: SyntheticEvent<HTMLVideoElement>) => report(e.currentTarget, true),
              onEnded: (e: SyntheticEvent<HTMLVideoElement>) => {
                  furthest.current = Math.max(furthest.current, e.currentTarget.duration);
                  report(e.currentTarget, true);
              },
          }
        : {};

    return (
        <video src={material.url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black" {...handlers}>
            Tu navegador no puede reproducir este video.
        </video>
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
