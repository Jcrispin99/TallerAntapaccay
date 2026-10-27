import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';

import { useAdminCourse } from '@/api/admin';
import { errorMessage } from '@/api/client';
import { CourseDetailsForm } from '@/components/admin/CourseDetailsForm';
import { EvaluationBuilder } from '@/components/admin/EvaluationBuilder';
import { MaterialsManager } from '@/components/admin/MaterialsManager';
import { ResultsPanel } from '@/components/admin/ResultsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const tabs = ['datos', 'materiales', 'evaluacion', 'resultados'] as const;

export function CourseEditPage() {
    const id = Number(useParams().id);
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: course, isPending, error } = useAdminCourse(id);
    const tab = tabs.find((t) => t === searchParams.get('tab')) ?? 'datos';

    if (isPending) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    if (error || !course) {
        return (
            <div className="space-y-3">
                <p className="text-destructive">{errorMessage(error, 'No se encontró el curso.')}</p>
                <Button asChild variant="outline" size="sm">
                    <Link to="/admin">Volver a mis cursos</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/admin">
                        <ArrowLeftIcon />
                        Cursos
                    </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
                    {course.is_published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Borrador</Badge>}
                    {course.is_published && (
                        <Button asChild variant="link" size="sm" className="px-0">
                            <a href={`/cursos/${course.slug}`} target="_blank" rel="noreferrer">
                                Ver como alumno
                                <ExternalLinkIcon />
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
                <TabsList>
                    <TabsTrigger value="datos">Datos</TabsTrigger>
                    <TabsTrigger value="materiales">Materiales ({course.materials?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
                    <TabsTrigger value="resultados">Resultados</TabsTrigger>
                </TabsList>
                <TabsContent value="datos" className="pt-4">
                    <CourseDetailsForm course={course} />
                </TabsContent>
                <TabsContent value="materiales" className="pt-4">
                    <MaterialsManager course={course} />
                </TabsContent>
                <TabsContent value="evaluacion" className="pt-4">
                    <EvaluationBuilder course={course} />
                </TabsContent>
                <TabsContent value="resultados" className="pt-4">
                    <ResultsPanel course={course} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
