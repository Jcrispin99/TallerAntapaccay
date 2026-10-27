import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardListIcon, PlusIcon, SaveIcon, ToggleLeftIcon, TriangleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { useAdminEvaluation, useSaveEvaluation } from '@/api/admin';
import { errorMessage, validationErrors } from '@/api/client';
import type { AdminCourse, QuestionType } from '@/api/types';
import {
    duplicateQuestion,
    evaluationSchema,
    newQuestion,
    toFormValues,
    toInput,
    totalPoints,
    type EvaluationFormValues,
    type QuestionPreset,
} from '@/components/admin/evaluation-form';
import { QuestionCard, questionTypeIcons } from '@/components/admin/QuestionCard';
import { SortableItem, SortableList } from '@/components/admin/Sortable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatScore, questionTypeLabels } from '@/lib/format';

const emptyForm: EvaluationFormValues = {
    title: '',
    description: '',
    passing_score: '0',
    max_attempts: '',
    show_correct_answers: false,
    is_published: false,
    questions: [],
};

export function EvaluationBuilder({ course }: { course: AdminCourse }) {
    const { data: evaluation, isPending } = useAdminEvaluation(course.id);
    const save = useSaveEvaluation(course.id);

    const form = useForm<EvaluationFormValues>({ resolver: zodResolver(evaluationSchema), defaultValues: emptyForm });
    const { control, register, handleSubmit, reset, setError, formState } = form;
    const { fields, append, insert, remove, move } = useFieldArray({ control, name: 'questions' });
    const questions = useWatch({ control, name: 'questions' });
    const total = totalPoints(questions ?? []);

    useEffect(() => {
        if (evaluation) {
            reset(toFormValues(evaluation));
        }
    }, [evaluation, reset]);

    // Warn before leaving the page with unsaved changes.
    useEffect(() => {
        if (!formState.isDirty) {
            return;
        }

        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [formState.isDirty]);

    const onSubmit = handleSubmit(
        (values) =>
            save.mutate(toInput(values), {
                onSuccess: (saved) => {
                    reset(toFormValues(saved));
                    toast.success('Evaluación guardada');
                },
                onError: (error) => {
                    const errors = Object.entries(validationErrors(error));

                    errors.forEach(([field, messages]) => {
                        setError(field.replace(/accepted_answers\.(\d+)$/, 'accepted_answers.$1.value') as FieldPath<EvaluationFormValues>, {
                            message: messages[0],
                        });
                    });
                    toast.error(errors.length > 0 ? 'Revisa los campos marcados.' : errorMessage(error, 'No se pudo guardar la evaluación.'));
                },
            }),
        () => toast.error('Revisa los campos marcados en rojo.'),
    );

    function add(preset: QuestionPreset) {
        append(newQuestion(preset), { shouldFocus: false });
        requestAnimationFrame(() => document.getElementById('questions-end')?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }

    if (isPending || !evaluation) {
        return <Skeleton className="h-96 rounded-xl" />;
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={onSubmit} className="space-y-4 pb-20">
                {evaluation.attempts_count > 0 && (
                    <Alert>
                        <TriangleAlertIcon />
                        <AlertTitle>Ya hay {evaluation.attempts_count} intento(s) en esta evaluación</AlertTitle>
                        <AlertDescription>
                            Si cambias respuestas correctas o puntajes, las notas ya enviadas no se recalculan. Las preguntas que elimines siguen visibles en esos
                            intentos.
                        </AlertDescription>
                    </Alert>
                )}

                <Card className="border-t-4 border-t-primary">
                    <CardContent>
                        <FieldGroup>
                            <Field data-invalid={!!formState.errors.title}>
                                <Input
                                    {...register('title')}
                                    placeholder="Título de la evaluación"
                                    aria-label="Título de la evaluación"
                                    className="h-12 border-0 border-b rounded-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl"
                                />
                                <FieldError errors={[formState.errors.title]} />
                            </Field>
                            <Textarea {...register('description')} placeholder="Descripción o instrucciones para el alumno (opcional)" aria-label="Descripción" rows={2} />
                        </FieldGroup>
                    </CardContent>
                </Card>

                <SettingsCard total={total} coursePublished={course.is_published} />

                {fields.length === 0 ? (
                    <Empty className="border bg-background">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ClipboardListIcon />
                            </EmptyMedia>
                            <EmptyTitle>Sin preguntas</EmptyTitle>
                            <EmptyDescription>Agrega la primera pregunta. Puedes cambiar su tipo cuando quieras.</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <AddQuestionMenu onAdd={add} />
                        </EmptyContent>
                    </Empty>
                ) : (
                    <SortableList ids={fields.map((f) => f.id)} onMove={move}>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <SortableItem key={field.id} id={field.id}>
                                    <QuestionCard
                                        index={index}
                                        onDuplicate={() => insert(index + 1, duplicateQuestion(form.getValues(`questions.${index}`)), { shouldFocus: false })}
                                        onRemove={() => remove(index)}
                                    />
                                </SortableItem>
                            ))}
                        </div>
                    </SortableList>
                )}
                <div id="questions-end" />

                {fields.length > 0 && (
                    <div className="flex justify-center">
                        <AddQuestionMenu onAdd={add} />
                    </div>
                )}

                <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                    <p className="text-sm text-muted-foreground">
                        {fields.length} pregunta{fields.length === 1 ? '' : 's'} · {formatScore(total)} puntos
                        {formState.isDirty && <span className="ml-2 font-medium text-amber-600">· Cambios sin guardar</span>}
                    </p>
                    <Button type="submit" disabled={save.isPending || !formState.isDirty}>
                        {save.isPending ? <Spinner /> : <SaveIcon />}
                        Guardar
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

function SettingsCard({ total, coursePublished }: { total: number; coursePublished: boolean }) {
    const { control, register, formState } = useFormContext<EvaluationFormValues>();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ToggleLeftIcon className="size-4 text-muted-foreground" />
                    Configuración
                </CardTitle>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!formState.errors.passing_score}>
                            <FieldLabel htmlFor="passing_score">Nota mínima para aprobar</FieldLabel>
                            <div className="flex items-center gap-2">
                                <Input id="passing_score" {...register('passing_score')} inputMode="decimal" className="w-24 text-right tabular-nums" />
                                <span className="text-sm text-muted-foreground">de {formatScore(total)} puntos</span>
                            </div>
                            <FieldError errors={[formState.errors.passing_score]} />
                        </Field>
                        <Field data-invalid={!!formState.errors.max_attempts}>
                            <FieldLabel htmlFor="max_attempts">Intentos por DNI</FieldLabel>
                            <Input id="max_attempts" {...register('max_attempts')} inputMode="numeric" placeholder="Ilimitados" className="w-32" />
                            <FieldError errors={[formState.errors.max_attempts]} />
                        </Field>
                    </div>
                    <Controller
                        control={control}
                        name="show_correct_answers"
                        render={({ field }) => (
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="show_correct_answers">Mostrar respuestas correctas</FieldLabel>
                                    <FieldDescription>Al enviar, el alumno ve qué respondió bien y cuál era la respuesta correcta.</FieldDescription>
                                </FieldContent>
                                <Switch id="show_correct_answers" checked={field.value} onCheckedChange={field.onChange} />
                            </Field>
                        )}
                    />
                    <Controller
                        control={control}
                        name="is_published"
                        render={({ field }) => (
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor="is_published">Aceptando respuestas</FieldLabel>
                                    <FieldDescription>
                                        {coursePublished
                                            ? 'Los alumnos pueden rendir la evaluación desde la página del curso.'
                                            : 'El curso está en borrador: publícalo en la pestaña Datos para que los alumnos lo vean.'}
                                    </FieldDescription>
                                </FieldContent>
                                <Switch id="is_published" checked={field.value} onCheckedChange={field.onChange} />
                            </Field>
                        )}
                    />
                </FieldGroup>
            </CardContent>
        </Card>
    );
}

const presets: { preset: QuestionPreset; label: string; type: QuestionType }[] = [
    { preset: 'single_choice', label: questionTypeLabels.single_choice, type: 'single_choice' },
    { preset: 'multiple_choice', label: questionTypeLabels.multiple_choice, type: 'multiple_choice' },
    { preset: 'dropdown', label: questionTypeLabels.dropdown, type: 'dropdown' },
    { preset: 'true_false', label: 'Verdadero / Falso', type: 'single_choice' },
    { preset: 'short_text', label: questionTypeLabels.short_text, type: 'short_text' },
    { preset: 'paragraph', label: questionTypeLabels.paragraph, type: 'paragraph' },
];

function AddQuestionMenu({ onAdd }: { onAdd: (preset: QuestionPreset) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                    <PlusIcon />
                    Agregar pregunta
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
                {presets.map(({ preset, label, type }, i) => {
                    const Icon = questionTypeIcons[type];
                    return (
                        <div key={preset}>
                            {i === 4 && <DropdownMenuSeparator />}
                            <DropdownMenuItem onSelect={() => onAdd(preset)}>
                                <Icon />
                                {label}
                            </DropdownMenuItem>
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
