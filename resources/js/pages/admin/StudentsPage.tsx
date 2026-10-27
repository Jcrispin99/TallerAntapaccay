import { DownloadIcon, FileSpreadsheetIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, UploadIcon, UsersIcon } from 'lucide-react';
import { useDeferredValue, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useDeleteStudent, useImportStudents, useSaveStudent, useStudents } from '@/api/admin';
import { useMe } from '@/api/auth';
import { errorMessage, validationErrors } from '@/api/client';
import type { ImportResult, Student } from '@/api/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function StudentsPage() {
    const isAdmin = useMe().data?.role === 'admin';
    const [search, setSearch] = useState('');
    const [gerencia, setGerencia] = useState('all');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<Student | 'new' | null>(null);
    const [importing, setImporting] = useState(false);
    const deferredSearch = useDeferredValue(search.trim());
    const { data, isPending, isFetching } = useStudents({ search: deferredSearch, gerencia: gerencia === 'all' ? '' : gerencia, page });

    if (!isAdmin) {
        return <p className="text-muted-foreground">Solo los administradores pueden gestionar la lista de alumnos.</p>;
    }

    const filtered = deferredSearch !== '' || gerencia !== 'all';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Alumnos</h1>
                    <p className="text-muted-foreground">Solo los DNI de esta lista pueden rendir evaluaciones.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setImporting(true)}>
                        <UploadIcon />
                        Importar Excel
                    </Button>
                    <Button onClick={() => setEditing('new')}>
                        <PlusIcon />
                        Agregar
                    </Button>
                </div>
            </div>

            {isPending || !data ? (
                <Skeleton className="h-72 rounded-xl" />
            ) : data.meta.total === 0 && !filtered ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersIcon />
                        </EmptyMedia>
                        <EmptyTitle>La lista está vacía</EmptyTitle>
                        <EmptyDescription>Importa tu Excel con las columnas DNI, Nombre, Gerencia y Puesto. Mientras esté vacía, nadie puede rendir.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button onClick={() => setImporting(true)}>
                            <UploadIcon />
                            Importar Excel
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <InputGroup className="w-full sm:w-64">
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Buscar por DNI o nombre"
                                aria-label="Buscar por DNI o nombre"
                            />
                        </InputGroup>
                        <Select
                            value={gerencia}
                            onValueChange={(value) => {
                                setGerencia(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-56" aria-label="Filtrar por gerencia">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las gerencias</SelectItem>
                                {data.gerencias.map((g) => (
                                    <SelectItem key={g} value={g}>
                                        {g}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isFetching && <Spinner className="text-muted-foreground" />}
                        <span className="ml-auto text-sm text-muted-foreground">{data.meta.total} alumno(s)</span>
                    </div>

                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>DNI</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Gerencia</TableHead>
                                    <TableHead>Puesto</TableHead>
                                    <TableHead className="w-20" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            Ningún alumno coincide con la búsqueda.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.items.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium tabular-nums">{student.dni}</TableCell>
                                        <TableCell>{student.full_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{student.gerencia ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{student.puesto ?? '—'}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${student.full_name}`} onClick={() => setEditing(student)}>
                                                    <PencilIcon />
                                                </Button>
                                                <DeleteStudentButton student={student} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {data.meta.last_page > 1 && (
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-muted-foreground">
                                Página {data.meta.current_page} de {data.meta.last_page}
                            </span>
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                Anterior
                            </Button>
                            <Button variant="outline" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>
                                Siguiente
                            </Button>
                        </div>
                    )}
                </>
            )}

            <StudentDialog key={editing === 'new' ? 'new' : editing?.id} student={editing} onClose={() => setEditing(null)} />
            <ImportDialog open={importing} onOpenChange={setImporting} />
        </div>
    );
}

function StudentDialog({ student, onClose }: { student: Student | 'new' | null; onClose: () => void }) {
    const existing = student !== 'new' && student !== null ? student : null;
    const [values, setValues] = useState({
        dni: existing?.dni ?? '',
        full_name: existing?.full_name ?? '',
        gerencia: existing?.gerencia ?? '',
        puesto: existing?.puesto ?? '',
    });
    const save = useSaveStudent();
    const errors = validationErrors(save.error);

    function submit(event: FormEvent) {
        event.preventDefault();
        save.mutate(
            {
                id: existing?.id,
                data: {
                    dni: values.dni.trim(),
                    full_name: values.full_name.trim(),
                    gerencia: values.gerencia.trim() || null,
                    puesto: values.puesto.trim() || null,
                },
            },
            {
                onSuccess: () => {
                    toast.success(existing ? 'Alumno actualizado' : 'Alumno agregado');
                    onClose();
                },
            },
        );
    }

    const field = (name: keyof typeof values, label: string, required = false) => (
        <Field data-invalid={!!errors[name]}>
            <FieldLabel htmlFor={`student-${name}`}>{label}</FieldLabel>
            <Input
                id={`student-${name}`}
                value={values[name]}
                onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                required={required}
                maxLength={name === 'dni' ? 12 : 255}
                aria-invalid={!!errors[name]}
            />
            {errors[name] && <FieldError>{errors[name][0]}</FieldError>}
        </Field>
    );

    return (
        <Dialog open={student !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{existing ? 'Editar alumno' : 'Agregar alumno'}</DialogTitle>
                    </DialogHeader>
                    <FieldGroup className="py-4">
                        {field('dni', 'DNI', true)}
                        {field('full_name', 'Nombre completo', true)}
                        {field('gerencia', 'Gerencia')}
                        {field('puesto', 'Puesto')}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit" disabled={save.isPending}>
                            {save.isPending && <Spinner />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteStudentButton({ student }: { student: Student }) {
    const remove = useDeleteStudent();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${student.full_name}`} className="text-destructive hover:text-destructive">
                    <Trash2Icon />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Quitar a {student.full_name} de la lista?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ya no podrá rendir evaluaciones. Sus intentos anteriores ({student.attempts_count ?? 0}) se mantienen en los resultados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => remove.mutate(student.id, { onSuccess: () => toast.success('Alumno quitado de la lista') })}
                    >
                        Quitar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/** Semicolon-separated with BOM, so it opens in columns in Excel configured in Spanish. */
function downloadTemplate() {
    const csv = '﻿DNI;Nombre completo;Gerencia;Puesto\r\n12345678;Pérez Ruiz, Ana;Operaciones;Supervisora\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-alumnos.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const importer = useImportStudents();
    const inputRef = useRef<HTMLInputElement>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    function close(next: boolean) {
        onOpenChange(next);
        setResult(null);
        importer.reset();
    }

    function upload(file: File) {
        setResult(null);
        importer.mutate(file, { onSuccess: setResult });
    }

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Importar alumnos</DialogTitle>
                    <DialogDescription>
                        Sube un Excel (.xlsx) o .csv. La primera fila debe tener los títulos: <strong>DNI</strong>, <strong>Nombre</strong> (o Apellidos y
                        Nombres), <strong>Gerencia</strong> y <strong>Puesto</strong>, en cualquier orden. Si un DNI ya existe, se actualizan sus datos.
                    </DialogDescription>
                </DialogHeader>

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={importer.isPending}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
                >
                    {importer.isPending ? <Spinner className="size-6" /> : <FileSpreadsheetIcon className="size-8 text-muted-foreground" />}
                    <span className="font-medium">{importer.isPending ? 'Importando…' : 'Elegir archivo'}</span>
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.csv,.ods"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            upload(file);
                        }
                        e.target.value = '';
                    }}
                />

                {importer.error && <FieldError>{errorMessage(importer.error)}</FieldError>}

                {result && (
                    <Alert>
                        <AlertTitle>
                            {result.created} nuevo(s), {result.updated} actualizado(s)
                            {result.skipped > 0 && `, ${result.skipped} fila(s) omitida(s)`}
                        </AlertTitle>
                        {result.errors.length > 0 && (
                            <AlertDescription>
                                <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-4">
                                    {result.errors.map((error) => (
                                        <li key={error.row}>
                                            Fila {error.row}: {error.message}
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        )}
                    </Alert>
                )}

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={downloadTemplate}>
                        <DownloadIcon />
                        Descargar plantilla
                    </Button>
                    <Button variant="outline" onClick={() => close(false)}>
                        {result ? 'Listo' : 'Cerrar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
