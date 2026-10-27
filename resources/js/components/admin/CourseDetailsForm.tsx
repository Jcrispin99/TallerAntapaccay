import { Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useDeleteCourse, useUpdateCourse, useUsers } from '@/api/admin';
import { useMe } from '@/api/auth';
import { errorMessage } from '@/api/client';
import type { AdminCourse } from '@/api/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export function CourseDetailsForm({ course }: { course: AdminCourse }) {
    const [title, setTitle] = useState(course.title);
    const [description, setDescription] = useState(course.description ?? '');
    const [isPublished, setIsPublished] = useState(course.is_published);
    const [ownerId, setOwnerId] = useState(course.owner ? String(course.owner.id) : '');
    const isAdmin = useMe().data?.role === 'admin';
    const { data: users } = useUsers(isAdmin);
    const update = useUpdateCourse(course.id);
    const remove = useDeleteCourse();
    const navigate = useNavigate();

    function submit(event: FormEvent) {
        event.preventDefault();
        update.mutate(
            {
                title: title.trim(),
                description: description.trim() || null,
                is_published: isPublished,
                ...(isAdmin && ownerId !== '' ? { user_id: Number(ownerId) } : {}),
            },
            {
                onSuccess: () => toast.success('Curso guardado'),
                onError: (error) => toast.error(errorMessage(error)),
            },
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={submit}>
                    <CardHeader>
                        <CardTitle>Datos del curso</CardTitle>
                    </CardHeader>
                    <CardContent className="py-4">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="title">Título</FieldLabel>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                            </Field>
                            {isAdmin && (
                                <Field>
                                    <FieldLabel htmlFor="owner">Profesor a cargo</FieldLabel>
                                    <Select value={ownerId} onValueChange={setOwnerId}>
                                        <SelectTrigger id="owner" className="w-full sm:w-80">
                                            <SelectValue placeholder="Sin asignar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users?.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name} · {user.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>Solo ese profesor (y los administradores) pueden ver y editar el curso.</FieldDescription>
                                </Field>
                            )}
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="is_published">Publicado</FieldLabel>
                                    <FieldDescription>Los alumnos solo ven los cursos publicados.</FieldDescription>
                                </FieldContent>
                                <Switch id="is_published" checked={isPublished} onCheckedChange={setIsPublished} />
                            </Field>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={update.isPending || title.trim() === ''}>
                            {update.isPending && <Spinner />}
                            Guardar
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle>Eliminar curso</CardTitle>
                    <CardDescription>Se borran sus materiales, la evaluación y todos los intentos. No se puede deshacer.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2Icon />
                                Eliminar curso
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar «{course.title}»?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Se borrarán {course.materials?.length ?? 0} material(es) y {course.evaluation?.attempts_count ?? 0} intento(s) de
                                    evaluación.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    onClick={() =>
                                        remove.mutate(course.id, {
                                            onSuccess: () => {
                                                toast.success('Curso eliminado');
                                                navigate('/admin');
                                            },
                                        })
                                    }
                                >
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
