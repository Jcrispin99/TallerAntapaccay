import { CheckIcon, LockIcon, MaximizeIcon, PlayIcon, RectangleHorizontalIcon, PanelRightIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { errorMessage, isNotFound, validationErrors } from '@/api/client';
import { useCourse, useCourseProgress, useLearnerProgress, useRecordProgress } from '@/api/public';
import type { Course, Material, MaterialProgress } from '@/api/types';
import { DniForm } from '@/components/public/DniForm';
import { useLearner } from '@/components/public/LearnerContext';
import { MaterialViewer, type Tracking } from '@/components/public/MaterialViewer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration, formatScore } from '@/lib/format';
import { readSession, writeSession } from '@/lib/session';
import { courseContents, standingOf } from '@/lib/standing';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function CoursePage() {
    const { slug = '' } = useParams();
    const { data: course, isPending, error } = useCourse(slug);
    const { learner } = useLearner();

    if (isPending) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    if (error || !course) {
        return isNotFound(error) ? <NotFoundPage title="Taller no encontrado" /> : <p className="text-destructive">No se pudo cargar el taller.</p>;
    }

    // With an evaluation, the material is followed per student: it must be completed before taking it.
    const tracked = Boolean(course.evaluation) && (course.materials?.length ?? 0) > 0;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <nav aria-label="Ruta" className="text-sm text-muted-foreground">
                    <Link to="/" className="font-semibold text-primary hover:underline">
                        Mis talleres
                    </Link>
                    <span aria-hidden="true" className="mx-2">
                        /
                    </span>
                    <span>{course.title}</span>
                </nav>
                <h1 className="font-condensed text-3xl leading-tight font-bold sm:text-5xl">{course.title}</h1>
                <p className="text-muted-foreground">{courseContents(course)}</p>
            </div>

            {tracked && !learner ? (
                <DniForm
                    className="max-w-2xl"
                    title="Identifícate para empezar"
                    description="Ingresa tu DNI para ver el material. Tu avance queda registrado y, cuando termines todo el material, se habilita la evaluación."
                />
            ) : tracked && learner ? (
                <TrackedCourse course={course} dni={learner.dni} />
            ) : (
                <CourseContent course={course} />
            )}

            {course.description && (
                <section className="max-w-3xl space-y-2">
                    <h2 className="font-condensed text-sm font-semibold tracking-widest text-muted-foreground uppercase">Sobre este taller</h2>
                    <p className="leading-relaxed whitespace-pre-line text-foreground/85">{course.description}</p>
                </section>
            )}
        </div>
    );
}

function TrackedCourse({ course, dni }: { course: Course; dni: string }) {
    const { setLearner } = useLearner();
    const { data, isPending, error } = useCourseProgress(course.slug, dni);
    const record = useRecordProgress(course.slug, dni);

    // The DNI was removed from the list since it was entered.
    useEffect(() => {
        if (error && Object.keys(validationErrors(error)).length > 0) {
            setLearner(null);
        }
    }, [error, setLearner]);

    if (isPending) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    if (!data) {
        return <p className="text-destructive">{errorMessage(error, 'No se pudo cargar tu avance.')}</p>;
    }

    const progress = new Map(data.progress.map((p) => [p.material_id, p]));

    return (
        <CourseContent
            course={course}
            progress={progress}
            dni={dni}
            tracking={(material) => ({
                secondsWatched: progress.get(material.id)?.seconds_watched ?? 0,
                completed: progress.get(material.id)?.completed ?? false,
                onReport: (seconds, duration) => record.mutate({ materialId: material.id, seconds, duration }),
            })}
        />
    );
}

interface CourseContentProps {
    course: Course;
    progress?: Map<number, MaterialProgress>;
    dni?: string;
    tracking?: (material: Material) => Tracking;
}

function CourseContent({ course, progress, dni, tracking }: CourseContentProps) {
    const materials = course.materials ?? [];
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [cinema, setCinema] = useState(() => readSession<boolean>('cinema') ?? false);
    const stage = useRef<HTMLDivElement>(null);
    const selected = materials.find((m) => m.id === selectedId) ?? materials.find((m) => !progress?.get(m.id)?.completed) ?? materials[0];
    const missing = progress ? materials.filter((m) => !progress.get(m.id)?.completed) : [];

    const scrollToStage = useRef(false);

    function toggleCinema() {
        writeSession('cinema', !cinema);
        setCinema(!cinema);
        scrollToStage.current = !cinema;
    }

    // Entering cinema mode brings the player to the top of the screen, like YouTube.
    useEffect(() => {
        if (cinema && scrollToStage.current) {
            scrollToStage.current = false;
            stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [cinema]);

    const sidebar = (
        <>
            {(materials.length > 1 || progress) && (
                <MaterialList materials={materials} progress={progress} selectedId={selected?.id} onSelect={setSelectedId} />
            )}
            {course.evaluation && <EvaluationCard course={course} missing={missing} progress={progress} dni={dni} />}
        </>
    );

    if (!selected) {
        return (
            <div className="flex flex-wrap items-start gap-7">
                <p className="min-w-0 flex-[999_1_600px] rounded-xl bg-card p-8 text-center text-muted-foreground">Este taller todavía no tiene material.</p>
                <aside className="flex flex-[1_1_320px] flex-col gap-4">{sidebar}</aside>
            </div>
        );
    }

    const player = (
        <div ref={stage} className={cn('material-stage overflow-hidden', !cinema && 'rounded-xl')}>
            <MaterialViewer material={selected} tracking={tracking?.(selected)} />
        </div>
    );

    const toolbar = (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
                <h2 className="font-condensed text-xl font-semibold">{selected.title}</h2>
                {progress && <MaterialStatus material={selected} progress={progress.get(selected.id)} />}
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="hidden lg:inline-flex" onClick={toggleCinema} aria-pressed={cinema}>
                    {cinema ? <PanelRightIcon /> : <RectangleHorizontalIcon />}
                    {cinema ? 'Vista normal' : 'Modo cine'}
                </Button>
                {document.fullscreenEnabled && (
                    <Button variant="outline" onClick={() => void stage.current?.requestFullscreen()}>
                        <MaximizeIcon />
                        Pantalla completa
                    </Button>
                )}
            </div>
        </div>
    );

    // Cinema mode: the material takes the whole width, as tall as the screen allows; the rest goes below.
    // Both modes keep the same element tree, so switching never restarts the video.
    return (
        <div className={cinema ? 'space-y-5' : 'flex flex-wrap items-start gap-7'}>
            <section aria-label="Material" className={cn('space-y-4', !cinema && 'min-w-0 flex-[999_1_600px]')}>
                <div className={cn(cinema && 'mx-[calc(50%_-_50vw)] bg-black')}>
                    <div
                        className={cn(
                            cinema && 'mx-auto',
                            cinema && (selected.type === 'video' ? 'max-w-[calc((100svh_-_7rem)*16/9)]' : 'max-w-[calc((100svh_-_1rem)*4/3)]'),
                        )}
                    >
                        {player}
                    </div>
                </div>
                {toolbar}
            </section>
            <aside className={cinema ? 'grid items-start gap-4 md:grid-cols-2' : 'flex flex-[1_1_320px] flex-col gap-4'}>{sidebar}</aside>
        </div>
    );
}

function MaterialStatus({ material, progress }: { material: Material; progress?: MaterialProgress }) {
    if (progress?.completed) {
        return (
            <p className="flex items-center gap-1.5 text-sm text-success-foreground">
                <CheckIcon className="size-4" />
                {material.type === 'video' ? 'Video completado' : 'Visto'}
            </p>
        );
    }

    if (material.type !== 'video') {
        return <p className="text-sm text-muted-foreground">Ábrela para marcarla como vista.</p>;
    }

    return (
        <p className="text-sm text-muted-foreground">
            Míralo completo para habilitar la evaluación
            {material.duration_seconds ? ` · ${formatDuration(progress?.seconds_watched ?? 0)} de ${formatDuration(material.duration_seconds)}` : ''}
        </p>
    );
}

function MaterialList({
    materials,
    progress,
    selectedId,
    onSelect,
}: {
    materials: Material[];
    progress?: Map<number, MaterialProgress>;
    selectedId?: number;
    onSelect: (id: number) => void;
}) {
    const completed = materials.filter((m) => progress?.get(m.id)?.completed).length;

    return (
        <section className="space-y-2 rounded-xl bg-card p-4">
            <h2 className="mb-1 font-condensed text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                Material{progress ? ` · ${completed} de ${materials.length}` : ''}
            </h2>
            <ul className="space-y-1.5">
                {materials.map((material) => {
                    const view = progress?.get(material.id);
                    const current = material.id === selectedId;
                    const kind = material.type === 'video' ? `Video${material.duration_seconds ? ` ${formatDuration(material.duration_seconds)}` : ''}` : 'Presentación';
                    const detail = view?.completed
                        ? `${kind} · completado`
                        : current && progress
                          ? material.type === 'video'
                              ? `Viendo ahora${material.duration_seconds ? ` · faltan ${formatDuration(material.duration_seconds - (view?.seconds_watched ?? 0))}` : ''}`
                              : 'Abierta ahora'
                          : `${kind}${progress ? ' · pendiente' : ''}`;

                    return (
                        <li key={material.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(material.id)}
                                aria-current={current ? 'true' : undefined}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                                    view?.completed ? 'border-transparent bg-success-surface' : current ? 'border-primary' : 'border-transparent hover:bg-muted/60',
                                )}
                            >
                                {view?.completed ? (
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-background">
                                        <CheckIcon className="size-4" strokeWidth={3} />
                                    </span>
                                ) : current ? (
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <PlayIcon className="size-3 fill-current" />
                                    </span>
                                ) : (
                                    <span className="size-7 shrink-0 rounded-full border-2 border-muted-foreground/50" />
                                )}
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold">{material.title}</span>
                                    <span className={cn('block text-sm', view?.completed ? 'text-success-foreground' : current && progress ? 'text-primary' : 'text-muted-foreground')}>
                                        {detail}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function EvaluationCard({ course, missing, progress, dni }: { course: Course; missing: Material[]; progress?: Map<number, MaterialProgress>; dni?: string }) {
    const evaluation = course.evaluation!;
    const locked = missing.length > 0;
    const learnerProgress = useLearnerProgress(dni ?? null);
    const standing = dni ? standingOf(course, learnerProgress.data?.courses.find((c) => c.course_id === course.id)) : null;

    return (
        <section className="overflow-hidden rounded-xl bg-card">
            {locked && <div aria-hidden="true" className="h-2 bg-[repeating-linear-gradient(-45deg,var(--primary)_0_10px,var(--background)_10px_20px)]" />}
            <div className="space-y-3 p-4">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-condensed text-2xl font-bold">Evaluación</h2>
                    <span className="text-sm text-muted-foreground">
                        {evaluation.questions_count} pregunta{evaluation.questions_count === 1 ? '' : 's'}
                        {evaluation.passing_score > 0 && ` · mínimo ${formatScore(evaluation.passing_score)}`}
                    </span>
                </div>

                {standing && standing.status !== 'pending' && standing.status !== 'in_progress' && standing.status !== 'ready' && (
                    <p className={cn('text-sm', standing.status === 'approved' ? 'text-success-foreground' : 'text-muted-foreground')}>{standing.detail}</p>
                )}

                {locked ? (
                    <>
                        <div className="space-y-1.5 text-sm">
                            <p className="text-muted-foreground">Para desbloquearla te falta:</p>
                            <ul className="space-y-1">
                                {missing.map((material) => {
                                    const remaining = material.duration_seconds ? material.duration_seconds - (progress?.get(material.id)?.seconds_watched ?? 0) : null;

                                    return (
                                        <li key={material.id}>
                                            · {material.type === 'video' ? 'Terminar' : 'Abrir'} <strong>{material.title}</strong>
                                            {material.type === 'video' && remaining !== null && ` (${formatDuration(remaining)})`}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <Button size="lg" className="h-12 w-full font-condensed text-base font-bold tracking-wide uppercase" disabled>
                            <LockIcon />
                            Rendir evaluación
                        </Button>
                    </>
                ) : standing?.done ? null : (
                    <Button asChild size="lg" className="h-12 w-full font-condensed text-base font-bold tracking-wide uppercase">
                        <Link to={`/cursos/${course.slug}/evaluacion`}>{standing?.status === 'retry' ? 'Reintentar evaluación' : 'Rendir evaluación'}</Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
