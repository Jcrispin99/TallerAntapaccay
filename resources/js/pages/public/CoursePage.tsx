import { ArrowLeftIcon, ClipboardCheckIcon, PresentationIcon, VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { isNotFound } from '@/api/client';
import { useCourse } from '@/api/public';
import { MaterialViewer } from '@/components/public/MaterialViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function CoursePage() {
    const { slug = '' } = useParams();
    const { data: course, isPending, error } = useCourse(slug);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    if (isPending) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    if (error || !course) {
        return isNotFound(error) ? <NotFoundPage title="Curso no encontrado" /> : <p className="text-destructive">No se pudo cargar el curso.</p>;
    }

    const materials = course.materials ?? [];
    const selected = materials.find((m) => m.id === selectedId) ?? materials[0];

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

            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0 space-y-3">
                    {selected ? (
                        <>
                            <MaterialViewer material={selected} />
                            <h2 className="font-medium">{selected.title}</h2>
                        </>
                    ) : (
                        <p className="rounded-lg border bg-background p-6 text-center text-muted-foreground">Este curso todavía no tiene material.</p>
                    )}
                </div>

                <div className="space-y-4">
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
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link to={`/cursos/${course.slug}/evaluacion`}>Rendir evaluación</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {materials.length > 1 && (
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
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
