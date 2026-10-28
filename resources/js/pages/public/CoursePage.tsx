import { ArrowLeftIcon, CheckCircle2Icon, CircleIcon, ClipboardCheckIcon, IdCardIcon, LockIcon, PresentationIcon, VideoIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';

import { errorMessage, isNotFound, validationErrors } from '@/api/client';
import { useCourse, useCourseProgress, useIdentify, useRecordProgress } from '@/api/public';
import type { Course, Learner, Material, MaterialProgress } from '@/api/types';
import { MaterialViewer, type Tracking } from '@/components/public/MaterialViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatDuration } from '@/lib/format';
import { LEARNER_KEY, readSession, writeSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function CoursePage() {
    const { slug = '' } = useParams();
    const { data: course, isPending, error } = useCourse(slug);
    const [learner, setLearner] = useState<Learner | null>(() => readSession<Learner>(LEARNER_KEY));

    function changeLearner(next: Learner | null) {
        writeSession(LEARNER_KEY, next);
        setLearner(next);
    }

    if (isPending) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    if (error || !course) {
        return isNotFound(error) ? <NotFoundPage title="Curso no encontrado" /> : <p className="text-destructive">No se pudo cargar el curso.</p>;
    }

    // With an evaluation, the material is followed per student: it must be completed before taking it.
    const tracked = Boolean(course.evaluation) && (course.materials?.length ?? 0) > 0;

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to="/">
                    <ArrowLeftIcon />
                    Cursos
                </Link>
            </Button>

            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
                {course.description && <p className="mt-1 whitespace-pre-line text-muted-foreground">{course.description}</p>}
            </div>

            {!tracked ? (
                <CourseContent course={course} />
            ) : learner ? (
                <TrackedCourse course={course} learner={learner} onSignOut={() => changeLearner(null)} />
            ) : (
                <IdentifyCard slug={course.slug} onIdentified={changeLearner} />
            )}
        </div>
    );
}

function TrackedCourse({ course, learner, onSignOut }: { course: Course; learner: Learner; onSignOut: () => void }) {
    const { data, isPending, error } = useCourseProgress(course.slug, learner.dni);
    const record = useRecordProgress(course.slug, learner.dni);

    // The DNI was removed from the list since it was entered.
    useEffect(() => {
        if (error && Object.keys(validationErrors(error)).length > 0) {
            onSignOut();
        }
    }, [error, onSignOut]);

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
            learner={learner}
            onSignOut={onSignOut}
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
    learner?: Learner;
    onSignOut?: () => void;
    tracking?: (material: Material) => Tracking;
}

function CourseContent({ course, progress, learner, onSignOut, tracking }: CourseContentProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const materials = course.materials ?? [];
    const selected = materials.find((m) => m.id === selectedId) ?? materials[0];
    const completed = materials.filter((m) => progress?.get(m.id)?.completed).length;
    const unlocked = progress === undefined || completed === materials.length;

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="min-w-0 space-y-3">
                {selected ? (
                    <>
                        <MaterialViewer material={selected} tracking={tracking?.(selected)} />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <h2 className="font-medium">{selected.title}</h2>
                            {progress && <MaterialStatus material={selected} progress={progress.get(selected.id)} />}
                        </div>
                    </>
                ) : (
                    <p className="rounded-lg border bg-background p-6 text-center text-muted-foreground">Este curso todavía no tiene material.</p>
                )}
            </div>

            <div className="space-y-4">
                {learner && (
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                        <p className="font-medium">{learner.full_name}</p>
                        <div className="flex items-center justify-between gap-2 text-muted-foreground">
                            <span>DNI {learner.dni}</span>
                            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onSignOut}>
                                No soy yo
                            </Button>
                        </div>
                    </div>
                )}

                {course.evaluation && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheckIcon className="size-4 text-primary" />
                                Evaluación
                            </CardTitle>
                            <CardDescription>
                                {course.evaluation.title} · {course.evaluation.questions_count} pregunta{course.evaluation.questions_count === 1 ? '' : 's'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {unlocked ? (
                                <Button asChild className="w-full">
                                    <Link to={`/cursos/${course.slug}/evaluacion`}>Rendir evaluación</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button className="w-full" disabled>
                                        <LockIcon />
                                        Rendir evaluación
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Se habilita al terminar todo el material ({completed} de {materials.length}).
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {(materials.length > 1 || progress) && (
                    <Card className="gap-2 py-3">
                        <CardHeader className="px-3">
                            <CardTitle className="text-sm">Material del curso</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2">
                            <ul className="space-y-1">
                                {materials.map((material, index) => (
                                    <li key={material.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(material.id)}
                                            className={cn(
                                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                                                material.id === selected?.id && 'bg-muted font-medium',
                                            )}
                                        >
                                            {material.type === 'video' ? (
                                                <VideoIcon className="size-4 shrink-0 text-muted-foreground" />
                                            ) : (
                                                <PresentationIcon className="size-4 shrink-0 text-muted-foreground" />
                                            )}
                                            <span className="truncate">
                                                {index + 1}. {material.title}
                                            </span>
                                            {progress &&
                                                (progress.get(material.id)?.completed ? (
                                                    <CheckCircle2Icon className="ml-auto size-4 shrink-0 text-green-600" aria-label="Completado" />
                                                ) : (
                                                    <CircleIcon className="ml-auto size-4 shrink-0 text-muted-foreground/50" aria-label="Pendiente" />
                                                ))}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function MaterialStatus({ material, progress }: { material: Material; progress?: MaterialProgress }) {
    if (progress?.completed) {
        return (
            <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-500">
                <CheckCircle2Icon className="size-4" />
                {material.type === 'video' ? 'Video completado' : 'Visto'}
            </span>
        );
    }

    if (material.type !== 'video') {
        return null;
    }

    return (
        <span className="text-sm text-muted-foreground">
            Míralo completo para habilitar la evaluación
            {material.duration_seconds ? ` · ${formatDuration(progress?.seconds_watched ?? 0)} de ${formatDuration(material.duration_seconds)}` : ''}
        </span>
    );
}

function IdentifyCard({ slug, onIdentified }: { slug: string; onIdentified: (learner: Learner) => void }) {
    const [dni, setDni] = useState('');
    const identify = useIdentify(slug);
    const errors = validationErrors(identify.error);
    const dniError = errors.dni?.[0] ?? (identify.error ? errorMessage(identify.error) : undefined);

    function submit(event: FormEvent) {
        event.preventDefault();
        identify.mutate(dni.trim(), { onSuccess: (data) => onIdentified(data.student) });
    }

    return (
        <Card className="max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IdCardIcon className="size-5 text-primary" />
                    Identifícate para empezar
                </CardTitle>
                <CardDescription>
                    Ingresa tu DNI para ver el material. Tu avance queda registrado y, cuando termines todo el material, se habilita la evaluación.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit}>
                    <FieldGroup>
                        <Field data-invalid={dniError !== undefined}>
                            <FieldLabel htmlFor="dni">
                                DNI <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="dni"
                                value={dni}
                                onChange={(event) => setDni(event.target.value)}
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={12}
                                required
                                aria-invalid={dniError !== undefined}
                                className="max-w-xs"
                            />
                            {dniError && <FieldError>{dniError}</FieldError>}
                        </Field>
                        <Button type="submit" className="w-fit" disabled={identify.isPending || dni.trim() === ''}>
                            {identify.isPending && <Spinner />}
                            Continuar
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}
