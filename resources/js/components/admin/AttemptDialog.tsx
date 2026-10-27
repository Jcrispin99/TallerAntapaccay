import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useAdminAttempt, useGradeAnswer } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { Answer } from '@/api/types';
import { AttemptBadge } from '@/components/admin/ResultsPanel';
import { AnswerReview } from '@/components/AnswerReview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatScore } from '@/lib/format';

export function AttemptDialog({ courseId, attemptId, onClose }: { courseId: number; attemptId: number | null; onClose: () => void }) {
    const { data: attempt, isPending } = useAdminAttempt(attemptId);

    return (
        <Dialog open={attemptId !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
                {isPending || !attempt ? (
                    <>
                        <DialogTitle className="sr-only">Cargando intento</DialogTitle>
                        <Skeleton className="h-64" />
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex flex-wrap items-center gap-2">
                                DNI {attempt.dni}
                                <AttemptBadge attempt={attempt} />
                            </DialogTitle>
                            <DialogDescription>
                                {[attempt.full_name, attempt.gerencia, attempt.puesto].filter(Boolean).join(' · ')}
                                {attempt.full_name && <br />}
                                Enviado el {formatDateTime(attempt.submitted_at)} · Nota{' '}
                                <span className="font-medium text-foreground">
                                    {formatScore(attempt.score)} / {formatScore(attempt.max_score)}
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            {attempt.answers?.map((answer, index) => (
                                <AnswerReview key={answer.id} answer={answer} index={index}>
                                    {answer.question.points > 0 && <GradeForm key={`${answer.id}-${answer.points_awarded}`} courseId={courseId} answer={answer} />}
                                </AnswerReview>
                            ))}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Manual grading: required for open questions, also allows overriding an automatic grade. */
function GradeForm({ courseId, answer }: { courseId: number; answer: Answer }) {
    const pending = answer.points_awarded === null;
    const [points, setPoints] = useState(pending ? '' : String(answer.points_awarded));
    const [editing, setEditing] = useState(pending);
    const grade = useGradeAnswer(courseId);

    function submit(event: FormEvent) {
        event.preventDefault();
        grade.mutate(
            { answerId: answer.id, points: Number(points) },
            {
                onSuccess: () => toast.success('Calificación guardada'),
                onError: (error) => toast.error(errorMessage(error)),
            },
        );
    }

    if (!editing) {
        return (
            <div className="flex justify-end">
                <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setEditing(true)}>
                    {answer.graded_manually ? 'Calificado a mano · cambiar' : 'Corregir puntaje'}
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <label htmlFor={`grade-${answer.id}`} className="text-sm">
                Puntos
            </label>
            <Input
                id={`grade-${answer.id}`}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                inputMode="decimal"
                className="h-8 w-20 text-right tabular-nums"
                autoFocus={!pending}
            />
            <span className="text-sm text-muted-foreground">de {formatScore(answer.question.points)}</span>
            <Button type="submit" size="sm" disabled={grade.isPending || points.trim() === '' || Number.isNaN(Number(points))}>
                Guardar
            </Button>
        </form>
    );
}
