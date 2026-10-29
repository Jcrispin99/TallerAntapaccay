import { ArrowRightIcon, BookOpenIcon, CheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { errorMessage, validationErrors } from '@/api/client';
import { useCourses, useLearnerProgress } from '@/api/public';
import type { Course, LearnerProgress } from '@/api/types';
import { DniForm } from '@/components/public/DniForm';
import { useLearner } from '@/components/public/LearnerContext';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { personName } from '@/lib/format';
import { courseContents, standingOf, type Standing } from '@/lib/standing';
import { cn } from '@/lib/utils';

type Tab = 'all' | 'todo' | 'done';

export function CatalogPage() {
    const { learner, setLearner } = useLearner();
    const courses = useCourses();
    const progress = useLearnerProgress(learner?.dni ?? null);

    // The DNI was removed from the list since it was entered.
    useEffect(() => {
        if (progress.error && Object.keys(validationErrors(progress.error)).length > 0) {
            setLearner(null);
        }
    }, [progress.error, setLearner]);

    if (courses.isPending || (learner && progress.isPending)) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-28 rounded-xl" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (learner && progress.isError) {
        return (
            <div className="space-y-4 rounded-xl bg-card p-6">
                <p>No se pudo cargar tu avance. {errorMessage(progress.error)}</p>
                <Button onClick={() => void progress.refetch()}>Reintentar</Button>
            </div>
        );
    }

    if (courses.isError) {
        return <p className="text-destructive">No se pudieron cargar los talleres.</p>;
    }

    if (courses.data.length === 0) {
        return (
            <Empty className="bg-card">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <BookOpenIcon />
                    </EmptyMedia>
                    <EmptyTitle>Aún no hay talleres</EmptyTitle>
                    <EmptyDescription>Cuando se publique un taller aparecerá aquí.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return learner && progress.data ? (
        <MyCourses courses={courses.data} progress={progress.data} />
    ) : (
        <div className="space-y-8">
            <div>
                <h1 className="font-condensed text-4xl font-bold sm:text-5xl">Talleres de salud ocupacional</h1>
                <p className="mt-2 text-muted-foreground sm:text-lg">Mira el material de cada taller y rinde su evaluación.</p>
            </div>
            <DniForm title="Ingresa tu DNI" description="Así guardamos tu avance y ves qué talleres te faltan. Tu DNI debe estar en la lista de tu área." />
            <CourseGrid courses={courses.data} />
        </div>
    );
}

function MyCourses({ courses, progress }: { courses: Course[]; progress: LearnerProgress }) {
    const [tab, setTab] = useState<Tab>('all');
    const standings = new Map(progress.courses.map((s) => [s.course_id, s]));
    const items = courses.map((course) => ({ course, standing: standingOf(course, standings.get(course.id)) }));
    const todo = items.filter((item) => !item.standing.done);
    const done = items.filter((item) => item.standing.done);
    const approved = items.filter((item) => item.standing.status === 'approved' || item.standing.status === 'seen').length;
    const name = personName(progress.student.full_name);

    const tabs: { id: Tab; label: string; count: number }[] = [
        { id: 'all', label: 'Todos', count: items.length },
        { id: 'todo', label: 'Por hacer', count: todo.length },
        { id: 'done', label: 'Terminados', count: done.length },
    ];

    return (
        <div className="space-y-8">
            <section className="flex flex-wrap items-end gap-6">
                <div className="min-w-0 flex-[999_1_420px]">
                    <h1 className="font-condensed text-4xl leading-none font-bold sm:text-6xl">Hola, {name.first}</h1>
                    <p className="mt-2 text-muted-foreground sm:text-lg">
                        Talleres de salud ocupacional{progress.student.gerencia ? ` · ${progress.student.gerencia}` : ''}
                    </p>
                </div>
                <div className="flex-[1_1_320px] space-y-2.5 rounded-xl bg-card px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="font-condensed text-sm font-semibold tracking-widest text-muted-foreground">TU AVANCE</span>
                        <span>
                            <strong className="text-2xl text-primary">{approved}</strong> de {items.length} completados
                        </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${items.length ? (approved / items.length) * 100 : 0}%` }} />
                    </div>
                </div>
            </section>

            <nav aria-label="Filtrar talleres" className="flex flex-wrap gap-1 border-b">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        aria-pressed={tab === t.id}
                        className={cn(
                            '-mb-px h-12 border-b-[3px] px-4 font-condensed text-base font-bold tracking-wide uppercase transition-colors',
                            tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t.label} ({t.count})
                    </button>
                ))}
            </nav>

            {tab !== 'done' && todo.length > 0 && (
                <CourseSection title={tab === 'all' ? 'Por hacer' : undefined}>
                    {todo.map(({ course, standing }) => (
                        <CourseCard key={course.id} course={course} standing={standing} />
                    ))}
                </CourseSection>
            )}

            {tab !== 'todo' && done.length > 0 && (
                <CourseSection title={tab === 'all' ? 'Terminados' : undefined}>
                    {done.map(({ course, standing }) => (
                        <CourseCard key={course.id} course={course} standing={standing} />
                    ))}
                </CourseSection>
            )}

            {tab === 'todo' && todo.length === 0 && <p className="text-muted-foreground">¡Terminaste todos los talleres!</p>}
            {tab === 'done' && done.length === 0 && <p className="text-muted-foreground">Todavía no terminaste ningún taller.</p>}
        </div>
    );
}

function CourseSection({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3.5">
            {title && <h2 className="font-condensed text-sm font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        </section>
    );
}

const chipStyles: Record<Standing['status'], string> = {
    in_progress: 'bg-primary text-primary-foreground',
    ready: 'bg-primary text-primary-foreground',
    retry: 'border border-destructive text-destructive',
    pending: 'border border-muted-foreground/60 text-muted-foreground',
    review: 'border border-primary text-primary',
    failed: 'border border-destructive text-destructive',
    approved: 'bg-success text-background',
    seen: 'bg-success text-background',
};

function CourseCard({ course, standing }: { course: Course; standing: Standing }) {
    const highlighted = standing.status === 'in_progress' || standing.status === 'ready';

    if (standing.status === 'approved' || standing.status === 'seen') {
        return (
            <Link to={standing.action.to} className="flex items-center gap-3.5 rounded-xl bg-success-surface p-5 transition-colors hover:bg-success-surface/80">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-background">
                    <CheckIcon className="size-5" strokeWidth={3} />
                </span>
                <span className="min-w-0 space-y-0.5">
                    <span className="block font-condensed text-xl leading-tight font-semibold">{course.title}</span>
                    <span className="block text-sm text-success-foreground">{standing.detail}</span>
                </span>
            </Link>
        );
    }

    return (
        <Link
            to={standing.action.to}
            className={cn('flex min-h-40 flex-col gap-2.5 rounded-xl border bg-card p-5 transition-colors hover:border-primary/60', highlighted ? 'border-primary' : 'border-transparent')}
        >
            <span className="flex items-start justify-between gap-3">
                <span className="font-condensed text-[1.375rem] leading-tight font-semibold">{course.title}</span>
                <span className={cn('shrink-0 rounded px-2 py-0.5 font-condensed text-xs font-bold tracking-wider uppercase', chipStyles[standing.status])}>
                    {standing.label}
                </span>
            </span>
            {standing.progress !== null && (
                <span className="h-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-primary" style={{ width: `${standing.progress * 100}%` }} />
                </span>
            )}
            <span className="text-sm text-muted-foreground">{standing.detail}</span>
            <span className={cn('mt-auto flex items-center gap-1.5 font-condensed font-bold tracking-wide uppercase', highlighted && 'text-primary')}>
                {standing.action.label}
                <ArrowRightIcon className="size-4" />
            </span>
        </Link>
    );
}

/** Before the DNI: every course, without a state. */
function CourseGrid({ courses }: { courses: Course[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
                <Link key={course.id} to={`/cursos/${course.slug}`} className="flex min-h-36 flex-col gap-2.5 rounded-xl border border-transparent bg-card p-5 transition-colors hover:border-primary/60">
                    <span className="font-condensed text-[1.375rem] leading-tight font-semibold">{course.title}</span>
                    <span className="text-sm text-muted-foreground">{courseContents(course)}</span>
                    <span className="mt-auto flex items-center gap-1.5 font-condensed font-bold tracking-wide uppercase">
                        Ver taller
                        <ArrowRightIcon className="size-4" />
                    </span>
                </Link>
            ))}
        </div>
    );
}
