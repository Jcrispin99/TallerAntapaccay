import { BookOpenIcon, ClipboardCheckIcon, LayersIcon } from 'lucide-react';
import { Link } from 'react-router';

import { useCourses } from '@/api/public';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export function CatalogPage() {
    const { data: courses, isPending, isError } = useCourses();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
                <p className="text-muted-foreground">Revisa el material de cada curso y rinde su evaluación.</p>
            </div>

            {isPending && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-36 rounded-xl" />
                    ))}
                </div>
            )}

            {isError && <p className="text-destructive">No se pudieron cargar los cursos.</p>}

            {courses?.length === 0 && (
                <Empty className="border bg-background">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BookOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle>Aún no hay cursos</EmptyTitle>
                        <EmptyDescription>Cuando se publique un curso aparecerá aquí.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            {courses && courses.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <Link key={course.id} to={`/cursos/${course.slug}`} className="group">
                            <Card className="h-full transition-shadow group-hover:shadow-md">
                                <CardHeader>
                                    <CardTitle className="group-hover:text-primary">{course.title}</CardTitle>
                                    {course.description && <CardDescription className="line-clamp-3">{course.description}</CardDescription>}
                                </CardHeader>
                                <CardFooter className="mt-auto gap-2">
                                    <Badge variant="secondary">
                                        <LayersIcon />
                                        {course.materials_count ?? 0} material{course.materials_count === 1 ? '' : 'es'}
                                    </Badge>
                                    {course.evaluation && (
                                        <Badge variant="outline">
                                            <ClipboardCheckIcon />
                                            Evaluación
                                        </Badge>
                                    )}
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
