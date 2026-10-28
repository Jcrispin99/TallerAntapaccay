import { ArrowLeftIcon, IdCardIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { errorMessage, isNotFound, validationErrors } from '@/api/client';
import { useEvaluation, useStartAttempt, useSubmitAttempt } from '@/api/public';
import type { AnswerValues, Attempt, Evaluation, Learner } from '@/api/types';
import { isAnswered, QuestionInput, type QuestionValue } from '@/components/public/QuestionInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatScore } from '@/lib/format';
import { LEARNER_KEY, readSession, writeSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

type StoredAttempt = Pick<Attempt, 'token' | 'dni' | 'full_name'>;

export function EvaluationPage() {
    const { slug = '' } = useParams();
    const { data: evaluation, isPending, error } = useEvaluation(slug);
    const [attempt, setAttempt] = useState<StoredAttempt | null>(null);

    // Reloading the page resumes the attempt already started in this tab.
    useEffect(() => {
        if (evaluation) {
            setAttempt(readSession<StoredAttempt>(`attempt:${evaluation.id}`));
        }
    }, [evaluation]);

    if (isPending) {
        return <Skeleton className="mx-auto h-96 max-w-2xl rounded-xl" />;
    }

    if (error || !evaluation) {
        return isNotFound(error) ? (
            <NotFoundPage title="Evaluación no disponible" description="Esta evaluación no existe o ya no está recibiendo respuestas." />
        ) : (
            <p className="text-destructive">No se pudo cargar la evaluación.</p>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={`/cursos/${slug}`}>
                    <ArrowLeftIcon />
                    {evaluation.course.title}
                </Link>
            </Button>

            <Card className="border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle className="text-2xl">{evaluation.title}</CardTitle>
                    {evaluation.description && <CardDescription className="whitespace-pre-line">{evaluation.description}</CardDescription>}
                    <p className="text-sm text-muted-foreground">
                        {evaluation.questions.length} preguntas · {formatScore(evaluation.total_points)} puntos
                        {evaluation.passing_score > 0 && ` · nota mínima ${formatScore(evaluation.passing_score)}`}
                        {evaluation.max_attempts !== null && ` · ${evaluation.max_attempts} intento${evaluation.max_attempts === 1 ? '' : 's'} por DNI`}
                    </p>
                </CardHeader>
            </Card>

            {attempt ? (
                <AnswerForm
                    evaluation={evaluation}
                    attempt={attempt}
                    onReset={() => {
                        writeSession(`attempt:${evaluation.id}`, null);
                        setAttempt(null);
                    }}
                />
            ) : (
                <IdentifyForm
                    evaluation={evaluation}
                    onStarted={(started) => {
                        const stored = { token: started.token, dni: started.dni, full_name: started.full_name };
                        writeSession(`attempt:${evaluation.id}`, stored);
                        setAttempt(stored);
                    }}
                />
            )}
        </div>
    );
}

function IdentifyForm({ evaluation, onStarted }: { evaluation: Evaluation; onStarted: (attempt: Attempt) => void }) {
    // Already entered on the course page to follow the material.
    const [dni, setDni] = useState(() => readSession<Learner>(LEARNER_KEY)?.dni ?? '');
    const start = useStartAttempt(evaluation.id);
    const errors = validationErrors(start.error);
    const dniError = errors.dni?.[0] ?? (start.error && !errors.dni ? errorMessage(start.error) : undefined);

    function submit(event: FormEvent) {
        event.preventDefault();
        start.mutate({ dni: dni.trim() }, { onSuccess: onStarted });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IdCardIcon className="size-5 text-primary" />
                    Identifícate
                </CardTitle>
                <CardDescription>Ingresa tu DNI. Debe estar registrado en la lista de alumnos.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit}>
                    <FieldGroup>
                        <Field data-invalid={dniError !== undefined}>
                            <FieldLabel htmlFor="dni">
                                DNI <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="dni"
                                value={dni}
                                onChange={(event) => setDni(event.target.value)}
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={12}
                                required
                                aria-invalid={dniError !== undefined}
                                className="max-w-xs"
                            />
                            {dniError && <FieldError>{dniError}</FieldError>}
                        </Field>
                        <Button type="submit" className="w-fit" disabled={start.isPending || dni.trim() === ''}>
                            {start.isPending && <Spinner />}
                            Comenzar
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}

function AnswerForm({ evaluation, attempt, onReset }: { evaluation: Evaluation; attempt: StoredAttempt; onReset: () => void }) {
    const navigate = useNavigate();
    const draftKey = `draft:${attempt.token}`;
    const [answers, setAnswers] = useState<Record<number, QuestionValue>>(() => readSession(draftKey) ?? {});
    const [errors, setErrors] = useState<Record<number, string>>({});
    const submitAttempt = useSubmitAttempt();

    useEffect(() => writeSession(draftKey, answers), [draftKey, answers]);

    function finish() {
        writeSession(draftKey, null);
        writeSession(`attempt:${evaluation.id}`, null);
        navigate(`/resultado/${attempt.token}`);
    }

    function showErrors(found: Record<number, string>) {
        setErrors(found);
        const first = evaluation.questions.find((q) => found[q.id]);
        document.getElementById(`question-${first?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const missing = Object.fromEntries(
            evaluation.questions.filter((q) => q.required && !isAnswered(answers[q.id])).map((q) => [q.id, 'Esta pregunta es obligatoria.']),
        );

        if (Object.keys(missing).length > 0) {
            showErrors(missing);
            return;
        }

        const payload: AnswerValues = Object.fromEntries(evaluation.questions.map((q) => [q.id, answers[q.id] ?? null]));

        submitAttempt.mutate(
            { token: attempt.token, answers: payload },
            {
                onSuccess: finish,
                onError: (error) => {
                    // Already submitted (e.g. from another tab): just show the result.
                    if (error instanceof AxiosError && error.response?.status === 409) {
                        finish();
                        return;
                    }

                    const serverErrors = Object.fromEntries(
                        Object.entries(validationErrors(error))
                            .filter(([field]) => field.startsWith('answers.'))
                            .map(([field, messages]) => [Number(field.split('.')[1]), messages[0]]),
                    );

                    if (Object.keys(serverErrors).length > 0) {
                        showErrors(serverErrors);
                    } else {
                        toast.error(errorMessage(error, 'No se pudieron enviar tus respuestas.'));
                    }
                },
            },
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-4 py-3 text-sm">
                <span>
                    Respondiendo como <span className="font-medium">{attempt.full_name ? `${attempt.full_name} · ` : ''}DNI {attempt.dni}</span>
                </span>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={onReset}>
                    No soy yo
                </Button>
            </div>

            {evaluation.questions.map((question) => (
                <Card key={question.id} id={`question-${question.id}`} className={cn(errors[question.id] && 'border-destructive')}>
                    <CardContent>
                        <Field data-invalid={errors[question.id] !== undefined}>
                            <div className="flex items-start justify-between gap-4">
                                <FieldLabel htmlFor={`q-${question.id}`} className="text-base leading-snug">
                                    <span>
                                        {question.prompt}
                                        {question.required && <span className="ml-1 text-destructive">*</span>}
                                    </span>
                                </FieldLabel>
                                {question.points > 0 && (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {formatScore(question.points)} pt{question.points === 1 ? '' : 's'}
                                    </span>
                                )}
                            </div>
                            {question.help_text && <FieldDescription className="whitespace-pre-line">{question.help_text}</FieldDescription>}
                            <div className="pt-2">
                                <QuestionInput
                                    question={question}
                                    value={answers[question.id]}
                                    invalid={errors[question.id] !== undefined}
                                    onChange={(value) => {
                                        setAnswers((current) => ({ ...current, [question.id]: value }));
                                        setErrors(({ [question.id]: _, ...rest }) => rest);
                                    }}
                                />
                            </div>
                            {errors[question.id] && <FieldError>{errors[question.id]}</FieldError>}
                        </Field>
                    </CardContent>
                </Card>
            ))}

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    <span className="text-destructive">*</span> Obligatorio
                </p>
                <Button type="submit" size="lg" disabled={submitAttempt.isPending}>
                    {submitAttempt.isPending && <Spinner />}
                    Enviar respuestas
                </Button>
            </div>
        </form>
    );
}
