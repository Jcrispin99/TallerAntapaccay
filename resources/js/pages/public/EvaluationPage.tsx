import { CheckIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { errorMessage, isNotFound, validationErrors } from '@/api/client';
import { useEvaluation, useStartAttempt, useSubmitAttempt } from '@/api/public';
import type { AnswerValues, Attempt, Evaluation } from '@/api/types';
import { useLearner } from '@/components/public/LearnerContext';
import { isAnswered, QuestionInput, type QuestionValue } from '@/components/public/QuestionInput';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatScore, maskDni, personName } from '@/lib/format';
import { readSession, writeSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

type StoredAttempt = Pick<Attempt, 'token' | 'dni' | 'full_name'>;

const BIG_BUTTON = 'h-13 px-7 font-condensed text-lg font-bold tracking-wide uppercase';

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
        return <Skeleton className="mx-auto h-96 max-w-3xl rounded-xl" />;
    }

    if (error || !evaluation) {
        return isNotFound(error) ? (
            <NotFoundPage title="Evaluación no disponible" description="Esta evaluación no existe o ya no está recibiendo respuestas." />
        ) : (
            <p className="text-destructive">No se pudo cargar la evaluación.</p>
        );
    }

    return attempt ? (
        <AnswerForm
            evaluation={evaluation}
            attempt={attempt}
            onReset={() => {
                writeSession(`attempt:${evaluation.id}`, null);
                setAttempt(null);
            }}
        />
    ) : (
        <StartCard
            evaluation={evaluation}
            onStarted={(started) => {
                const stored = { token: started.token, dni: started.dni, full_name: started.full_name };
                writeSession(`attempt:${evaluation.id}`, stored);
                setAttempt(stored);
            }}
        />
    );
}

function EvaluationFacts({ evaluation }: { evaluation: Evaluation }) {
    return (
        <p className="text-muted-foreground">
            {evaluation.questions.length} preguntas · {formatScore(evaluation.total_points)} puntos
            {evaluation.passing_score > 0 && ` · nota mínima ${formatScore(evaluation.passing_score)}`}
            {evaluation.max_attempts !== null && ` · ${evaluation.max_attempts} intento${evaluation.max_attempts === 1 ? '' : 's'}`}
        </p>
    );
}

/** Who is answering: the student identified on the course page, or a DNI typed here. */
function StartCard({ evaluation, onStarted }: { evaluation: Evaluation; onStarted: (attempt: Attempt) => void }) {
    const { learner, setLearner } = useLearner();
    const [dni, setDni] = useState('');
    const start = useStartAttempt(evaluation.id);
    const dniError = validationErrors(start.error).dni?.[0] ?? (start.error ? errorMessage(start.error) : undefined);

    function begin(value: string) {
        start.mutate(
            { dni: value },
            {
                onSuccess: (started) => {
                    setLearner({ dni: started.dni, full_name: started.full_name ?? '' });
                    onStarted(started);
                },
            },
        );
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        begin(learner ? learner.dni : dni.trim());
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="space-y-2">
                <Link to={`/cursos/${evaluation.course.slug}`} className="text-sm font-semibold text-primary hover:underline">
                    ← {evaluation.course.title}
                </Link>
                <h1 className="font-condensed text-3xl leading-tight font-bold sm:text-5xl">{evaluation.title}</h1>
                {evaluation.description && <p className="whitespace-pre-line">{evaluation.description}</p>}
                <EvaluationFacts evaluation={evaluation} />
            </div>

            <form onSubmit={submit} className="space-y-5 rounded-xl bg-card p-5 sm:p-6">
                {learner ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg">
                            Vas a rendir como <strong>{personName(learner.full_name).full}</strong>
                            <span className="text-muted-foreground"> · DNI {maskDni(learner.dni)}</span>
                        </p>
                        <Button type="button" variant="link" className="h-11 px-0 font-semibold" onClick={() => setLearner(null)}>
                            No soy yo
                        </Button>
                    </div>
                ) : (
                    <Field data-invalid={dniError !== undefined} className="max-w-xs">
                        <FieldLabel htmlFor="dni">Tu DNI</FieldLabel>
                        <Input
                            id="dni"
                            value={dni}
                            onChange={(event) => setDni(event.target.value)}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={12}
                            required
                            aria-invalid={dniError !== undefined}
                            className="h-12 text-lg"
                        />
                    </Field>
                )}
                {dniError && <FieldError>{dniError}</FieldError>}
                <Button type="submit" size="lg" className={BIG_BUTTON} disabled={start.isPending || (!learner && dni.trim() === '')}>
                    {start.isPending && <Spinner />}
                    Comenzar
                </Button>
            </form>
        </div>
    );
}

/** One question per screen, with the list of questions on the side on wide screens. */
function AnswerForm({ evaluation, attempt, onReset }: { evaluation: Evaluation; attempt: StoredAttempt; onReset: () => void }) {
    const navigate = useNavigate();
    const { setLearner } = useLearner();
    const questions = evaluation.questions;
    const draftKey = `draft:${attempt.token}`;
    const [answers, setAnswers] = useState<Record<number, QuestionValue>>(() => readSession(draftKey) ?? {});
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [index, setIndex] = useState(0);
    const submitAttempt = useSubmitAttempt();
    const question = questions[index];
    const last = index === questions.length - 1;

    useEffect(() => writeSession(draftKey, answers), [draftKey, answers]);

    function goTo(next: number) {
        setIndex(Math.min(Math.max(next, 0), questions.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function finish() {
        writeSession(draftKey, null);
        writeSession(`attempt:${evaluation.id}`, null);
        navigate(`/resultado/${attempt.token}`);
    }

    function showErrors(found: Record<number, string>) {
        setErrors(found);
        const first = questions.findIndex((q) => found[q.id]);

        if (first >= 0) {
            goTo(first);
        }
    }

    function submitAll() {
        const missing = Object.fromEntries(
            questions.filter((q) => q.required && !isAnswered(answers[q.id])).map((q) => [q.id, 'Esta pregunta es obligatoria.']),
        );

        if (Object.keys(missing).length > 0) {
            showErrors(missing);
            return;
        }

        const payload: AnswerValues = Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? null]));

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

    function submit(event: FormEvent) {
        event.preventDefault();

        if (last) {
            submitAll();
            return;
        }

        if (question.required && !isAnswered(answers[question.id])) {
            setErrors((current) => ({ ...current, [question.id]: 'Responde esta pregunta para continuar.' }));
            return;
        }

        goTo(index + 1);
    }

    const answered = questions.filter((q) => isAnswered(answers[q.id])).length;

    return (
        <div className="flex flex-wrap items-start gap-8">
            <aside className="hidden flex-[1_1_240px] flex-col gap-5 lg:flex">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Evaluación</p>
                    <p className="font-condensed text-2xl leading-tight font-bold">{evaluation.course.title}</p>
                    <EvaluationFacts evaluation={evaluation} />
                </div>
                <nav aria-label="Preguntas" className="flex flex-col gap-1.5">
                    {questions.map((q, i) => {
                        const done = isAnswered(answers[q.id]);
                        const current = i === index;

                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-current={current ? 'step' : undefined}
                                className={cn(
                                    'flex h-11 items-center gap-3 rounded-lg border-2 px-3 text-left',
                                    current ? 'border-primary font-semibold' : 'border-transparent hover:bg-muted/60',
                                    !current && (done ? 'bg-card' : 'text-muted-foreground'),
                                )}
                            >
                                {errors[q.id] ? (
                                    <span className="size-4 shrink-0 rounded-full bg-destructive" />
                                ) : done ? (
                                    <CheckIcon className="size-4 shrink-0 text-success" strokeWidth={3} />
                                ) : current ? (
                                    <span className="size-4 shrink-0 rounded-full bg-primary" />
                                ) : (
                                    <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/60" />
                                )}
                                Pregunta {i + 1}
                                <span className={cn('ml-auto text-sm', errors[q.id] ? 'text-destructive' : done ? 'text-success-foreground' : current ? 'text-primary' : '')}>
                                    {errors[q.id] ? 'Falta' : done ? 'Respondida' : current ? 'Actual' : ''}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <form onSubmit={submit} noValidate className="min-w-0 max-w-3xl flex-[999_1_560px] space-y-6">
                <div className="space-y-2.5">
                    <p className="text-sm text-muted-foreground lg:hidden">{evaluation.course.title}</p>
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="font-condensed text-base font-bold tracking-widest uppercase">
                            Pregunta {index + 1} de {questions.length}
                        </span>
                        {question.points > 0 && (
                            <span className="rounded border border-muted-foreground/60 px-2 py-0.5 font-condensed text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                {formatScore(question.points)} punto{question.points === 1 ? '' : 's'}
                            </span>
                        )}
                    </div>
                    <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }}>
                        {questions.map((q, i) => (
                            <div
                                key={q.id}
                                className={cn('h-1.5 rounded-full', i === index ? 'bg-foreground' : isAnswered(answers[q.id]) ? 'bg-primary' : 'bg-muted')}
                            />
                        ))}
                    </div>
                </div>

                <Field data-invalid={errors[question.id] !== undefined} className="gap-5">
                    <div className="space-y-2">
                        <FieldLabel htmlFor={`q-${question.id}`} className="block font-condensed text-2xl leading-snug font-semibold sm:text-4xl">
                            {question.prompt}
                            {question.required && <span className="ml-1 text-destructive">*</span>}
                        </FieldLabel>
                        {question.help_text && <p className="whitespace-pre-line text-muted-foreground">{question.help_text}</p>}
                    </div>
                    <QuestionInput
                        key={question.id}
                        question={question}
                        value={answers[question.id]}
                        invalid={errors[question.id] !== undefined}
                        onChange={(value) => {
                            setAnswers((current) => ({ ...current, [question.id]: value }));
                            setErrors(({ [question.id]: _, ...rest }) => rest);
                        }}
                    />
                    {errors[question.id] && <FieldError>{errors[question.id]}</FieldError>}
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                    <Button type="button" variant="outline" size="lg" className={BIG_BUTTON} disabled={index === 0} onClick={() => goTo(index - 1)}>
                        Anterior
                    </Button>
                    <Button type="submit" size="lg" className={cn(BIG_BUTTON, 'flex-1 sm:flex-none')} disabled={submitAttempt.isPending}>
                        {submitAttempt.isPending && <Spinner />}
                        {last ? 'Enviar respuestas' : 'Siguiente'}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                        Respondiendo como {attempt.full_name ? personName(attempt.full_name).full : 'alumno'} · DNI {maskDni(attempt.dni)} · {answered} de {questions.length}{' '}
                        respondidas
                    </span>
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => {
                            setLearner(null);
                            onReset();
                        }}
                    >
                        No soy yo
                    </Button>
                </div>
            </form>
        </div>
    );
}
