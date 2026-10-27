import { arrayMove } from '@dnd-kit/sortable';
import { ExternalLinkIcon, PencilIcon, PresentationIcon, RotateCwIcon, Trash2Icon, UploadCloudIcon, VideoIcon } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useMaterialActions, useUploadMaterial } from '@/api/admin';
import { errorMessage } from '@/api/client';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { conversionStatusLabels, formatBytes } from '@/lib/format';
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
            const key = `${file.name}-${file.size}-${Date.now()}`;
            setUploads((current) => [...current, { key, name: file.name, progress: 0 }]);

            try {
                await upload.mutateAsync({
                    file,
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
                <span className="text-sm text-muted-foreground">Videos (mp4, webm, mov) o presentaciones (ppt, pptx, odp, pdf)</span>
            </button>
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
    const Icon = material.type === 'video' ? VideoIcon : PresentationIcon;
    const viewUrl = material.type === 'video' ? material.url : (material.pdf_url ?? material.url);

    return (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2 pr-3">
            <DragHandle />
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{material.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {material.original_name} · {formatBytes(material.size)}
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
                            <AlertDialogDescription>El archivo se borra del servidor.</AlertDialogDescription>
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
