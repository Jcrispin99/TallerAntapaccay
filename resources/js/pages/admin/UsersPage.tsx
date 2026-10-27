import { PencilIcon, PlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useDeleteUser, useSaveUser, useUsers } from '@/api/admin';
import { useMe } from '@/api/auth';
import { errorMessage, validationErrors } from '@/api/client';
import type { User, UserRole } from '@/api/types';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function UsersPage() {
    const { data: me } = useMe();
    const { data: users, isPending } = useUsers(me?.role === 'admin');
    const [editing, setEditing] = useState<User | 'new' | null>(null);

    if (me?.role !== 'admin') {
        return <p className="text-muted-foreground">Solo los administradores pueden gestionar profesores.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Profesores</h1>
                    <p className="text-muted-foreground">Cuentas que pueden entrar al panel. Cada profesor ve solo sus cursos.</p>
                </div>
                <Button onClick={() => setEditing('new')}>
                    <PlusIcon />
                    Nuevo profesor
                </Button>
            </div>

            {isPending || !users ? (
                <Skeleton className="h-48 rounded-xl" />
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right">Cursos</TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className={user.is_active ? undefined : 'opacity-60'}>
                                    <TableCell className="font-medium">
                                        {user.name}
                                        {user.id === me.id && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1.5">
                                            {user.role === 'admin' ? (
                                                <Badge>
                                                    <ShieldCheckIcon />
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Profesor</Badge>
                                            )}
                                            {!user.is_active && <Badge variant="outline">Desactivado</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{user.courses_count ?? 0}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <Button variant="ghost" size="icon-sm" aria-label={`Editar ${user.name}`} onClick={() => setEditing(user)}>
                                                <PencilIcon />
                                            </Button>
                                            {user.id !== me.id && <DeleteUserButton user={user} />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <UserDialog key={editing === 'new' ? 'new' : editing?.id} user={editing} isSelf={editing !== 'new' && editing?.id === me.id} onClose={() => setEditing(null)} />
        </div>
    );
}

function UserDialog({ user, isSelf, onClose }: { user: User | 'new' | null; isSelf: boolean; onClose: () => void }) {
    const existing = user !== 'new' && user !== null ? user : null;
    const [name, setName] = useState(existing?.name ?? '');
    const [email, setEmail] = useState(existing?.email ?? '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(existing?.role ?? 'teacher');
    const [isActive, setIsActive] = useState(existing?.is_active ?? true);
    const save = useSaveUser();
    const errors = validationErrors(save.error);

    function submit(event: FormEvent) {
        event.preventDefault();
        save.mutate(
            {
                id: existing?.id,
                data: { name: name.trim(), email: email.trim(), role, is_active: isActive, password: password === '' ? null : password },
            },
            {
                onSuccess: () => {
                    toast.success(existing ? 'Cuenta actualizada' : 'Cuenta creada');
                    onClose();
                },
                onError: (error) => {
                    if (Object.keys(validationErrors(error)).length === 0) {
                        toast.error(errorMessage(error));
                    }
                },
            },
        );
    }

    return (
        <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{existing ? `Editar ${existing.name}` : 'Nuevo profesor'}</DialogTitle>
                        <DialogDescription>
                            {existing ? 'Deja la contraseña vacía para no cambiarla.' : 'Comparte el correo y la contraseña con el profesor para que pueda ingresar.'}
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="py-4">
                        <Field data-invalid={!!errors.name}>
                            <FieldLabel htmlFor="user-name">Nombre</FieldLabel>
                            <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required autoFocus />
                            {errors.name && <FieldError>{errors.name[0]}</FieldError>}
                        </Field>
                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="user-email">Correo</FieldLabel>
                            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
                            {errors.email && <FieldError>{errors.email[0]}</FieldError>}
                        </Field>
                        <Field data-invalid={!!errors.password}>
                            <FieldLabel htmlFor="user-password">{existing ? 'Nueva contraseña' : 'Contraseña'}</FieldLabel>
                            <Input
                                id="user-password"
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={!existing}
                                minLength={8}
                                autoComplete="new-password"
                                placeholder={existing ? 'Sin cambios' : 'Mínimo 8 caracteres'}
                            />
                            {existing && <FieldDescription>Si la cambias, el profesor tendrá que volver a ingresar.</FieldDescription>}
                            {errors.password && <FieldError>{errors.password[0]}</FieldError>}
                        </Field>
                        <Field data-invalid={!!errors.role}>
                            <FieldLabel htmlFor="user-role">Rol</FieldLabel>
                            <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={isSelf}>
                                <SelectTrigger id="user-role" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">Profesor: gestiona solo sus cursos</SelectItem>
                                    <SelectItem value="admin">Administrador: ve todo y gestiona profesores</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && <FieldError>{errors.role[0]}</FieldError>}
                        </Field>
                        {existing && !isSelf && (
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="user-active">Cuenta activa</FieldLabel>
                                    <FieldDescription>Una cuenta desactivada no puede ingresar, pero conserva sus cursos.</FieldDescription>
                                </FieldContent>
                                <Switch id="user-active" checked={isActive} onCheckedChange={setIsActive} />
                            </Field>
                        )}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit" disabled={save.isPending}>
                            {save.isPending && <Spinner />}
                            {existing ? 'Guardar' : 'Crear cuenta'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteUserButton({ user }: { user: User }) {
    const remove = useDeleteUser();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${user.name}`} className="text-destructive hover:text-destructive">
                    <Trash2Icon />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar la cuenta de {user.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {user.courses_count
                            ? `Sus ${user.courses_count} curso(s) pasarán a tu cuenta, con sus materiales y resultados.`
                            : 'No tiene cursos.'}{' '}
                        Si solo quieres impedir que ingrese, mejor desactívala.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() =>
                            remove.mutate(user.id, {
                                onSuccess: () => toast.success('Cuenta eliminada'),
                                onError: (error) => toast.error(errorMessage(error)),
                            })
                        }
                    >
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
