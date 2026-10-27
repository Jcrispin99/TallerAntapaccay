import { DownloadIcon, FileWarningIcon } from 'lucide-react';

import type { Material } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function MaterialViewer({ material }: { material: Material }) {
    if (material.type === 'video') {
        return (
            <video key={material.id} src={material.url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black">
                Tu navegador no puede reproducir este video.
            </video>
        );
    }

    if (material.pdf_url) {
        return <iframe key={material.id} src={material.pdf_url} title={material.title} className="aspect-[4/3] w-full rounded-lg border bg-background" />;
    }

    if (material.conversion_status === 'failed') {
        return (
            <Placeholder>
                <FileWarningIcon className="size-8 text-muted-foreground" />
                <p>No se pudo mostrar esta presentación en el navegador.</p>
                <Button asChild variant="outline">
                    <a href={material.url} download={material.original_name}>
                        <DownloadIcon />
                        Descargar {material.original_name}
                    </a>
                </Button>
            </Placeholder>
        );
    }

    return (
        <Placeholder>
            <Spinner className="size-6" />
            <p>Estamos preparando la presentación, aparecerá en unos segundos…</p>
        </Placeholder>
    );
}

function Placeholder({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}
