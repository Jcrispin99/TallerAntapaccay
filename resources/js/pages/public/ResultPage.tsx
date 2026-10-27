import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon, XCircleIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useAttempt } from '@/api/public';
import { AnswerReview } from '@/components/AnswerReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatScore } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function ResultPage() {
    const { token = '' } = useParams();
    const { data: attempt, isPending, error } = useAttempt(token);

    if (isPending) {
        return <Skeleton className="mx-auto h-72 max-w-2xl rounded-xl" />;
    }

    if (error || !attempt) {
        return <NotFoundPage title="Resultado no encontrado" />;
    }

    const status =
        attempt.status === 'pending_review'
            ? { icon: ClockIcon, label: 'Pendiente de revisión', tone: 'text-amber-600', hint: 'Algunas respuestas se revisan a mano. Tu nota final puede subir.' }
            : attempt.passed
              ? { icon: CheckCircle2Icon, label: 'Aprobado', tone: 'text-emerald-600', hint: null }
              : { icon: XCircleIcon, label: 'Desaprobado', tone: 'text-destructive', hint: null };

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={`/cursos/${attempt.evaluation.course_slug}`}>
                    <ArrowLeftIcon />
                    {attempt.evaluation.course_title}
                </Link>
            </Button>

            <Card className="border-t-4 border-t-primary text-center">
                <CardHeader>
                    <CardDescription>{attempt.evaluation.title}</CardDescription>
                    <CardTitle className="text-5xl font-semibold tabular-nums">
                        {formatScore(attempt.score)}
                        <span className="text-2xl text-muted-foreground"> / {formatScore(attempt.max_score)}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {attempt.submitted_at ? (
                        <>
                            <p className={cn('flex items-center justify-center gap-2 text-lg font-medium', status.tone)}>
                                <status.icon className="size-5" />
                                {status.label}
                            </p>
                            {status.hint && <p className="text-sm text-muted-foreground">{status.hint}</p>}
                            <p className="text-sm text-muted-foreground">
                                DNI {attempt.dni}
                                {attempt.full_name && ` · ${attempt.full_name}`} · enviado el {formatDateTime(attempt.submitted_at)}
                                {attempt.evaluation.passing_score > 0 && ` · nota mínima ${formatScore(attempt.evaluation.passing_score)}`}
                            </p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">Este intento todavía no fue enviado.</p>
                    )}
                </CardContent>
            </Card>

            {attempt.review && (
                <div className="space-y-3">
                    <h2 className="font-medium">Tus respuestas</h2>
                    {attempt.review.map((answer, index) => (
                        <AnswerReview key={answer.id} answer={answer} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}
