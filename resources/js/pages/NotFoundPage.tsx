import { SearchXIcon } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export function NotFoundPage({ title = 'Página no encontrada', description = 'La dirección que buscas no existe o ya no está disponible.' }) {
    return (
        <Empty className="border bg-background">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button asChild variant="outline">
                    <Link to="/">Ver cursos</Link>
                </Button>
            </EmptyContent>
        </Empty>
    );
}
