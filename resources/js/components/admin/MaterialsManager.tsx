import { arrayMove } from '@dnd-kit/sortable';
import { ExternalLinkIcon, LinkIcon, PencilIcon, PresentationIcon, RotateCwIcon, Trash2Icon, UploadCloudIcon, VideoIcon } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useAddMaterialLink, useMaterialActions, useUploadMaterial } from '@/api/admin';
import { errorMessage, validationErrors } from '@/api/client';
import type { AdminCourse, AdminMaterial } from '@/api/types';
import { DragHandle, SortableItem, SortableList } from '@/components/admin/Sortable';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { embedOf } from '@/lib/embed';
import { conversionStatusLabels, formatBytes, formatDuration } from '@/lib/format';
import { isVideoFile, maxUploadMb, readVideoDuration } from '@/lib/platform';
import { cn } from '@/lib/utils';

const ACCEPT = '.mp4,.webm,.m4v,.mov,.ppt,.pptx,.odp,.pdf';

interface Upload {
    key: string;
    name: string;
    progress: number;
}

export function MaterialsManager({ course }: { course: AdminCourse }) {
    const upload = useUploadMaterial(course.id);
    const actions = useMaterialActions(course.id);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [materials, setMaterials] = useState<AdminMaterial[]>(course.materials ?? []);

    useEffect(() => setMaterials(course.materials ?? []), [course.materials]);

    async function uploadFiles(files: FileList | File[]) {
        // One at a time: large videos in parallel would compete for the same bandwidth.
        for (const file of Array.from(files)) {
            const isVideo = isVideoFile(file);
            const maxMb = isVideo ? maxUploadMb.video : maxUploadMb.presentation;

            // Checked here: an oversized upload is cut by the proxy before the server can explain why.
            if (file.size > maxMb * 1024 * 1024) {
                toast.error(`«${file.name}» pesa ${formatBytes(file.size)} y el máximo es ${maxMb} MB.`, {
                    description: isVideo ? 'Grábalo en 720p o comprímelo (por ejemplo, con HandBrake) e inténtalo de nuevo.' : undefined,
                    duration: 10_000,
                });
                continue;
            }

            const key = `${file.name}-${file.size}-${Date.now()}`;
            setUploads((current) => [...current, { key, name: file.name, progress: 0 }]);

            try {
                await upload.mutateAsync({
                    file,
                    // Lets the server tell when a student watched the video to the end.
                    duration: isVideo ? await readVideoDuration(file) : null,
                    onProgress: (progress) => setUploads((current) => current.map((u) => (u.key === key ? { ...u, progress } : u))),
                });
                toast.success(`«${file.name}» subido`);
            } catch (error) {
                toast.error(`«${file.name}»: ${errorMessage(error, 'no se pudo subir')}`);
            } finally {
                setUploads((current) => current.filter((u) => u.key !== key));
            }
        }
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        setDragOver(false);
        void uploadFiles(event.dataTransfer.files);
    }

    function move(from: number, to: number) {
        const next = arrayMove(materials, from, to);
        setMaterials(next);
        actions.reorder.mutate(next.map((m) => m.id));
    }

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                    'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-background p-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5',
                    dragOver && 'border-primary bg-primary/5',
                )}
            >
                <UploadCloudIcon className="size-8 text-muted-foreground" />
                <span className="font-medium">Arrastra archivos aquí o haz clic para elegir</span>
                <span className="text-sm text-muted-foreground">
                    Videos (mp4, webm, mov) de hasta {maxUploadMb.video} MB o presentaciones (ppt, pptx, odp, pdf) de hasta {maxUploadMb.presentation} MB
                </span>
                <span className="text-xs text-muted-foreground">
                    Los alumnos deben ver cada video completo antes de rendir la evaluación. Si un video pesa más, grábalo en 720p o comprímelo.
                </span>
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">¿El video ya está en YouTube, Vimeo o Google Drive? Agrégalo con su enlace.</span>
                <AddLinkDialog courseId={course.id} />
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(event) => {
                    if (event.target.files) {
                        void uploadFiles(event.target.files);
                    }
                    event.target.value = '';
                }}
            />

            {uploads.map((u) => (
                <div key={u.key} className="space-y-2 rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{u.name}</span>
                        <span className="text-muted-foreground tabular-nums">{u.progress < 100 ? `${u.progress}%` : 'Procesando…'}</span>
                    </div>
                    <Progress value={u.progress} />
                </div>
            ))}

            {materials.length === 0 && uploads.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Este curso todavía no tiene material.</p>
            )}

            <SortableList ids={materials.map((m) => m.id)} onMove={move}>
                <div className="space-y-2">
                    {materials.map((material) => (
                        <SortableItem key={material.id} id={material.id}>
                            <MaterialRow material={material} actions={actions} />
                        </SortableItem>
                    ))}
                </div>
            </SortableList>
        </div>
    );
}

function MaterialRow({ material, actions }: { material: AdminMaterial; actions: ReturnType<typeof useMaterialActions> }) {
    const Icon = material.type === 'video' ? VideoIcon : material.type === 'link' ? LinkIcon : PresentationIcon;
    const viewUrl = material.type === 'presentation' ? (material.pdf_url ?? material.url) : material.url;

    return (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2 pr-3">
            <DragHandle />
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{material.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {material.type === 'link' ? (
                        `${embedOf(material.url).label} · ${material.url}`
                    ) : (
                        <>
                            {material.original_name} · {formatBytes(material.size)}
                            {material.duration_seconds !== null && ` · ${formatDuration(material.duration_seconds)}`}
                        </>
                    )}
                </p>
            </div>
            <StatusBadge material={material} />
            <div className="flex items-center">
                {material.conversion_status === 'failed' && (
                    <Button variant="ghost" size="icon-sm" aria-label="Reintentar conversión" onClick={() => actions.retry.mutate(material.id)}>
                        <RotateCwIcon />
                    </Button>
                )}
                <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir">
                    <a href={viewUrl} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon />
                    </a>
                </Button>
                <RenameDialog material={material} actions={actions} />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2Icon />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar «{material.title}»?</AlertDialogTitle>
                            <AlertDialogDescription>{material.type === 'link' ? 'Se quita del curso.' : 'El archivo se borra del servidor.'}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => actions.remove.mutate(material.id)}>
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function StatusBadge({ material }: { material: AdminMaterial }) {
    if (material.type === 'video' || material.conversion_status === 'ready') {
        return null;
    }

    const badge = (
        <Badge variant={material.conversion_status === 'failed' ? 'destructive' : 'secondary'} className="shrink-0">
            {(material.conversion_status === 'pending' || material.conversion_status === 'processing') && <Spinner className="size-3" />}
            {conversionStatusLabels[material.conversion_status]}
        </Badge>
    );

    if (material.conversion_status !== 'failed' || !material.conversion_error) {
        return badge;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent className="max-w-xs">{material.conversion_error}</TooltipContent>
        </Tooltip>
    );
}

/** A video or page hosted elsewhere. It is embedded as is, so the student only has to open it. */
function AddLinkDialog({ courseId }: { courseId: number }) {
    const add = useAddMaterialLink(courseId);
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const errors = validationErrors(add.error);

    function submit(event: FormEvent) {
        event.preventDefault();
        add.mutate(
            { url: url.trim(), title: title.trim() },
            {
                onSuccess: () => {
                    toast.success(`«${title.trim()}» agregado`);
                    setOpen(false);
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
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setUrl('');
                setTitle('');
                add.reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <LinkIcon />
                    Agregar enlace
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Agregar enlace</DialogTitle>
                        <DialogDescription>
                            Se muestra dentro del curso con el reproductor de YouTube, Vimeo o Drive. A diferencia de los videos subidos, se marca como visto al abrirlo. Si la red del alumno
                            bloquea esa página, no lo va a poder ver.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="py-4">
                        <Field data-invalid={!!errors.url}>
                            <FieldLabel htmlFor="link-url">Enlace</FieldLabel>
                            <Input
                                id="link-url"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=…"
                                maxLength={2048}
                                required
                                autoFocus
                            />
                            {errors.url && <FieldError>{errors.url[0]}</FieldError>}
                        </Field>
                        <Field data-invalid={!!errors.title}>
                            <FieldLabel htmlFor="link-title">Título</FieldLabel>
                            <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} required />
                            {errors.title && <FieldError>{errors.title[0]}</FieldError>}
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit" disabled={add.isPending}>
                            {add.isPending && <Spinner />}
                            Agregar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RenameDialog({ material, actions }: { material: AdminMaterial; actions: ReturnType<typeof useMaterialActions> }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(material.title);

    function submit(event: FormEvent) {
        event.preventDefault();
        actions.rename.mutate({ id: material.id, title: title.trim() }, { onSuccess: () => setOpen(false) });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setTitle(material.title);
            }}
        >
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Renombrar">
                    <PencilIcon />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Renombrar material</DialogTitle>
                    </DialogHeader>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} autoFocus aria-label="Título" />
                    <DialogFooter>
                        <Button type="submit" disabled={actions.rename.isPending || title.trim() === ''}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
