import { CheckIcon, ClockIcon, XIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useAttempt } from '@/api/public';
import { AnswerReview } from '@/components/AnswerReview';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatScore, maskDni, personName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function ResultPage() {
    const { token = '' } = useParams();
    const { data: attempt, isPending, error } = useAttempt(token);

    if (isPending) {
        return <Skeleton className="mx-auto h-72 max-w-3xl rounded-xl" />;
    }

    if (error || !attempt) {
        return <NotFoundPage title="Resultado no encontrado" />;
    }

    const status =
        attempt.status === 'pending_review'
            ? { icon: ClockIcon, label: 'En revisión', tone: 'bg-primary text-primary-foreground', hint: 'Algunas respuestas se revisan a mano. Tu nota final puede subir.' }
            : attempt.passed
              ? { icon: CheckIcon, label: 'Aprobado', tone: 'bg-success text-background', hint: null }
              : { icon: XIcon, label: 'Desaprobado', tone: 'bg-destructive text-background', hint: null };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Link to={`/cursos/${attempt.evaluation.course_slug}`} className="text-sm font-semibold text-primary hover:underline">
                ← {attempt.evaluation.course_title}
            </Link>

            <section className="rounded-xl bg-card p-6 text-center sm:p-8">
                <p className="text-muted-foreground">{attempt.evaluation.title}</p>
                {attempt.submitted_at ? (
                    <div className="mt-4 space-y-4">
                        <p className="font-condensed text-7xl leading-none font-bold tabular-nums sm:text-8xl">
                            {formatScore(attempt.score)}
                            <span className="text-3xl text-muted-foreground sm:text-4xl"> / {formatScore(attempt.max_score)}</span>
                        </p>
                        <p className={cn('mx-auto inline-flex items-center gap-2 rounded px-3 py-1 font-condensed text-lg font-bold tracking-wider uppercase', status.tone)}>
                            <status.icon className="size-5" strokeWidth={3} />
                            {status.label}
                        </p>
                        {status.hint && <p className="text-muted-foreground">{status.hint}</p>}
                        <p className="text-sm text-muted-foreground">
                            {attempt.full_name && `${personName(attempt.full_name).full} · `}DNI {maskDni(attempt.dni)} · enviado el {formatDateTime(attempt.submitted_at)}
                            {attempt.evaluation.passing_score > 0 && ` · nota mínima ${formatScore(attempt.evaluation.passing_score)}`}
                        </p>
                    </div>
                ) : (
                    <p className="mt-4 text-muted-foreground">Este intento todavía no fue enviado.</p>
                )}
                <Button asChild size="lg" className="mt-6 h-12 px-6 font-condensed text-base font-bold tracking-wide uppercase">
                    <Link to="/">Volver a mis talleres</Link>
                </Button>
            </section>

            {attempt.review && (
                <section className="space-y-3">
                    <h2 className="font-condensed text-sm font-semibold tracking-widest text-muted-foreground uppercase">Tus respuestas</h2>
                    {attempt.review.map((answer, index) => (
                        <AnswerReview key={answer.id} answer={answer} index={index} />
                    ))}
                </section>
            )}
        </div>
    );
}
