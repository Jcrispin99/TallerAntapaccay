import { DownloadIcon, SearchIcon, UsersIcon } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';

import { downloadAttemptsCsv, useAdminAttempts } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { AdminAttempt, AdminCourse } from '@/api/types';
import { AttemptDialog } from '@/components/admin/AttemptDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatScore } from '@/lib/format';

export function ResultsPanel({ course }: { course: AdminCourse }) {
    const [search, setSearch] = useState('');
    const [gerencia, setGerencia] = useState('all');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const deferredSearch = useDeferredValue(search.trim());
    const { data, isPending, isFetching } = useAdminAttempts(course.id, {
        search: deferredSearch,
        gerencia: gerencia === 'all' ? '' : gerencia,
        status: status === 'all' ? '' : status,
        page,
    });

    async function exportCsv() {
        setExporting(true);
        try {
            await downloadAttemptsCsv(course.id, course.slug);
        } catch (error) {
            toast.error(errorMessage(error, 'No se pudo exportar.'));
        } finally {
            setExporting(false);
        }
    }

    if (isPending || !data) {
        return <Skeleton className="h-72 rounded-xl" />;
    }

    const { summary, items, meta, gerencias } = data;

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Intentos" value={String(summary.attempts)} />
                <Stat label="Aprobados" value={`${summary.passed}${summary.attempts > 0 ? ` (${Math.round((summary.passed / summary.attempts) * 100)}%)` : ''}`} />
                <Stat label="Por revisar" value={String(summary.pending_review)} highlight={summary.pending_review > 0} />
                <Stat label="Promedio" value={summary.average_score === null ? '—' : `${formatScore(summary.average_score)} / ${formatScore(summary.max_score)}`} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <InputGroup className="w-full sm:w-56">
                    <InputGroupAddon>
                        <SearchIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Buscar por DNI o nombre"
                        aria-label="Buscar por DNI o nombre"
                    />
                </InputGroup>
                {gerencias.length > 0 && (
                    <Select
                        value={gerencia}
                        onValueChange={(value) => {
                            setGerencia(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-48" aria-label="Filtrar por gerencia">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las gerencias</SelectItem>
                            {gerencias.map((g) => (
                                <SelectItem key={g} value={g}>
                                    {g}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-48" aria-label="Filtrar por estado">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pending_review">Pendientes de revisión</SelectItem>
                        <SelectItem value="graded">Calificados</SelectItem>
                    </SelectContent>
                </Select>
                {isFetching && <Spinner className="text-muted-foreground" />}
                <Button variant="outline" className="ml-auto" onClick={exportCsv} disabled={exporting || summary.attempts === 0}>
                    {exporting ? <Spinner /> : <DownloadIcon />}
                    Exportar CSV
                </Button>
            </div>

            {items.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UsersIcon />
                        </EmptyMedia>
                        <EmptyTitle>{summary.attempts === 0 ? 'Todavía nadie rindió la evaluación' : 'Sin resultados'}</EmptyTitle>
                        <EmptyDescription>
                            {summary.attempts === 0 ? 'Los intentos enviados aparecerán aquí.' : 'Ningún intento coincide con el filtro.'}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>DNI</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Gerencia</TableHead>
                                <TableHead>Enviado</TableHead>
                                <TableHead className="text-right">Nota</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((attempt) => (
                                <TableRow key={attempt.id} className="cursor-pointer" onClick={() => setOpenId(attempt.id)}>
                                    <TableCell className="font-medium tabular-nums">{attempt.dni}</TableCell>
                                    <TableCell className="max-w-48 truncate">{attempt.full_name ?? '—'}</TableCell>
                                    <TableCell className="max-w-40 truncate text-muted-foreground">{attempt.gerencia ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">{formatDateTime(attempt.submitted_at)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatScore(attempt.score)} / {formatScore(attempt.max_score)}
                                    </TableCell>
                                    <TableCell>
                                        <AttemptBadge attempt={attempt} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {meta.last_page > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-muted-foreground">
                        Página {meta.current_page} de {meta.last_page}
                    </span>
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                        Siguiente
                    </Button>
                </div>
            )}

            <AttemptDialog courseId={course.id} attemptId={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

export function AttemptBadge({ attempt }: { attempt: Pick<AdminAttempt, 'status' | 'passed'> }) {
    if (attempt.status === 'pending_review') {
        return <Badge variant="outline">Por revisar</Badge>;
    }

    return attempt.passed ? (
        <Badge className="bg-emerald-600 text-white">Aprobado</Badge>
    ) : (
        <Badge variant="destructive">Desaprobado</Badge>
    );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <Card className="gap-1 py-4">
            <CardHeader className="px-4">
                <CardDescription>{label}</CardDescription>
                <CardTitle className={highlight ? 'text-2xl text-amber-600 tabular-nums' : 'text-2xl tabular-nums'}>{value}</CardTitle>
            </CardHeader>
        </Card>
    );
}
