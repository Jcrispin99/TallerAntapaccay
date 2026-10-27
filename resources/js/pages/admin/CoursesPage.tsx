import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAdminCourses, useCreateCourse } from '@/api/admin';
import { useMe } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export function CoursesPage() {
    const { data: courses, isPending } = useAdminCourses();
    const isAdmin = useMe().data?.role === 'admin';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Cursos' : 'Mis cursos'}</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Todos los cursos de todos los profesores.' : 'Crea cursos, sube su material y arma su evaluación.'}
                    </p>
                </div>
                <NewCourseDialog />
            </div>

            {isPending && <Skeleton className="h-48 rounded-xl" />}

            {courses?.length === 0 && (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BookOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle>Todavía no hay cursos</EmptyTitle>
                        <EmptyDescription>Crea el primero para subir un video o una presentación.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <NewCourseDialog />
                    </EmptyContent>
                </Empty>
            )}

            {courses && courses.length > 0 && (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Curso</TableHead>
                                {isAdmin && <TableHead>Profesor</TableHead>}
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Materiales</TableHead>
                                <TableHead className="text-right">Preguntas</TableHead>
                                <TableHead className="text-right">Intentos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell className="max-w-xs">
                                        <Link to={`/admin/cursos/${course.id}`} className="font-medium hover:underline">
                                            {course.title}
                                        </Link>
                                    </TableCell>
                                    {isAdmin && <TableCell className="text-muted-foreground">{course.owner?.name ?? 'Sin asignar'}</TableCell>}
                                    <TableCell>
                                        {course.is_published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Borrador</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{course.materials_count ?? 0}</TableCell>
                                    <TableCell className="text-right tabular-nums">{course.evaluation?.questions_count ?? 0}</TableCell>
                                    <TableCell className="text-right tabular-nums">{course.evaluation?.attempts_count ?? 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

function NewCourseDialog() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const create = useCreateCourse();
    const navigate = useNavigate();

    function submit(event: FormEvent) {
        event.preventDefault();
        create.mutate(
            { title: title.trim(), description: description.trim() || null },
            { onSuccess: (course) => navigate(`/admin/cursos/${course.id}?tab=materiales`) },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusIcon />
                    Nuevo curso
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Nuevo curso</DialogTitle>
                        <DialogDescription>Se crea como borrador: los alumnos no lo ven hasta que lo publiques.</DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="py-4">
                        <Field>
                            <FieldLabel htmlFor="new-title">Título</FieldLabel>
                            <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required autoFocus />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="new-description">Descripción</FieldLabel>
                            <Textarea id="new-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                        </Field>
                        {create.error && <FieldError>{errorMessage(create.error)}</FieldError>}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit" disabled={create.isPending || title.trim() === ''}>
                            {create.isPending && <Spinner />}
                            Crear curso
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
