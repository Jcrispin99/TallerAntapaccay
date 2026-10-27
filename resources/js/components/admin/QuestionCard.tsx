import {
    AlignLeftIcon,
    CheckIcon,
    ChevronDownSquareIcon,
    CircleDotIcon,
    CopyIcon,
    ListChecksIcon,
    PlusIcon,
    TextCursorInputIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import type { QuestionType } from '@/api/types';
import { DragHandle } from '@/components/admin/Sortable';
import type { EvaluationFormValues } from '@/components/admin/evaluation-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { hasOptions, questionTypeLabels } from '@/lib/format';
import { cn } from '@/lib/utils';

export const questionTypeIcons: Record<QuestionType, typeof CircleDotIcon> = {
    single_choice: CircleDotIcon,
    multiple_choice: ListChecksIcon,
    dropdown: ChevronDownSquareIcon,
    short_text: TextCursorInputIcon,
    paragraph: AlignLeftIcon,
};

interface Props {
    index: number;
    onDuplicate: () => void;
    onRemove: () => void;
}

export function QuestionCard({ index, onDuplicate, onRemove }: Props) {
    const { control, register, getValues, setValue, formState } = useFormContext<EvaluationFormValues>();
    const type = useWatch({ control, name: `questions.${index}.type` });
    const errors = formState.errors.questions?.[index];

    function changeType(next: QuestionType) {
        const options = getValues(`questions.${index}.options`);

        if (hasOptions(next) && options.length === 0) {
            setValue(`questions.${index}.options`, [{ label: 'Opción 1', is_correct: false }], { shouldDirty: true });
        }

        // Single answer types keep only the first correct option.
        if (next !== 'multiple_choice') {
            let seen = false;
            options.forEach((option, i) => {
                if (option.is_correct && seen) {
                    setValue(`questions.${index}.options.${i}.is_correct`, false, { shouldDirty: true });
                }
                seen ||= option.is_correct;
            });
        }

        setValue(`questions.${index}.type`, next, { shouldDirty: true });
    }

    return (
        <Card className={cn('gap-4 border-l-4 border-l-transparent focus-within:border-l-primary', errors && 'border-l-destructive')}>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-2">
                    <div className="-ml-2 pt-0.5">
                        <DragHandle label="Arrastrar pregunta" />
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_200px]">
                        <Field data-invalid={!!errors?.prompt}>
                            <Input
                                {...register(`questions.${index}.prompt`)}
                                placeholder={`Pregunta ${index + 1}`}
                                aria-label={`Enunciado de la pregunta ${index + 1}`}
                                aria-invalid={!!errors?.prompt}
                                className="h-10 bg-muted/40 text-base"
                            />
                            <FieldError errors={[errors?.prompt]} />
                        </Field>
                        <Select value={type} onValueChange={(value) => changeType(value as QuestionType)}>
                            <SelectTrigger className="h-10 w-full" aria-label="Tipo de pregunta">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(questionTypeLabels) as QuestionType[]).map((t) => {
                                    const Icon = questionTypeIcons[t];
                                    return (
                                        <SelectItem key={t} value={t}>
                                            <Icon />
                                            {questionTypeLabels[t]}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Input
                    {...register(`questions.${index}.help_text`)}
                    placeholder="Descripción o instrucciones (opcional)"
                    aria-label="Descripción de la pregunta"
                    className="border-0 border-b shadow-none rounded-none px-0 focus-visible:ring-0"
                />

                {hasOptions(type) && <OptionsEditor index={index} type={type} />}
                {type === 'short_text' && <AcceptedAnswersEditor index={index} />}
                {type === 'paragraph' && (
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        El alumno escribe un texto largo. Lo calificas a mano en la pestaña Resultados.
                    </p>
                )}
            </CardContent>

            <Separator />

            <CardFooter className="flex-wrap justify-end gap-x-4 gap-y-2">
                <Field orientation="horizontal" className="w-auto" data-invalid={!!errors?.points}>
                    <FieldLabel htmlFor={`points-${index}`} className="text-sm font-normal text-muted-foreground">
                        Puntos
                    </FieldLabel>
                    <Input
                        id={`points-${index}`}
                        {...register(`questions.${index}.points`)}
                        inputMode="decimal"
                        className="h-8 w-20 text-right tabular-nums"
                        aria-invalid={!!errors?.points}
                    />
                </Field>
                <Separator orientation="vertical" className="h-6" />
                <Controller
                    control={control}
                    name={`questions.${index}.required`}
                    render={({ field }) => (
                        <Field orientation="horizontal" className="w-auto">
                            <FieldLabel htmlFor={`required-${index}`} className="text-sm font-normal">
                                Obligatoria
                            </FieldLabel>
                            <Switch id={`required-${index}`} checked={field.value} onCheckedChange={field.onChange} />
                        </Field>
                    )}
                />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex">
                    <IconAction label="Duplicar" onClick={onDuplicate}>
                        <CopyIcon />
                    </IconAction>
                    <IconAction label="Eliminar" onClick={onRemove} className="text-destructive hover:text-destructive">
                        <Trash2Icon />
                    </IconAction>
                </div>
                {errors?.points && <FieldError className="w-full text-right" errors={[errors.points]} />}
            </CardFooter>
        </Card>
    );
}

function OptionsEditor({ index, type }: { index: number; type: QuestionType }) {
    const { control, register, getValues, setValue, trigger, formState } = useFormContext<EvaluationFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `questions.${index}.options` });
    const options = useWatch({ control, name: `questions.${index}.options` });
    const optionErrors = formState.errors.questions?.[index]?.options;
    const rootError = optionErrors?.root?.message ?? optionErrors?.message;
    const multiple = type === 'multiple_choice';

    function toggleCorrect(i: number) {
        const current = getValues(`questions.${index}.options.${i}.is_correct`);

        if (!multiple) {
            getValues(`questions.${index}.options`).forEach((_, j) => {
                if (j !== i) {
                    setValue(`questions.${index}.options.${j}.is_correct`, false, { shouldDirty: true });
                }
            });
        }

        setValue(`questions.${index}.options.${i}.is_correct`, !current, { shouldDirty: true });

        // The "mark the correct answer" error belongs to the whole option list.
        if (formState.isSubmitted) {
            void trigger(`questions.${index}.options`);
        }
    }

    return (
        <div className="space-y-2">
            {fields.map((field, i) => {
                const correct = options?.[i]?.is_correct ?? false;
                const labelError = optionErrors?.[i]?.label;

                return (
                    <div key={field.id} className="flex items-center gap-2">
                        <span className="flex w-6 shrink-0 justify-center text-muted-foreground">
                            {type === 'dropdown' ? (
                                <span className="text-sm tabular-nums">{i + 1}.</span>
                            ) : (
                                <span className={cn('size-4 border-2 border-muted-foreground/50', multiple ? 'rounded-sm' : 'rounded-full')} />
                            )}
                        </span>
                        <Input
                            {...register(`questions.${index}.options.${i}.label`)}
                            placeholder={`Opción ${i + 1}`}
                            aria-label={`Opción ${i + 1}`}
                            aria-invalid={!!labelError}
                            className={cn('flex-1', correct && 'border-emerald-500/60 bg-emerald-500/5')}
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={correct ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => toggleCorrect(i)}
                                    aria-pressed={correct}
                                    className={cn(correct ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400' : 'text-muted-foreground')}
                                >
                                    <CheckIcon />
                                    <span className="hidden sm:inline">Correcta</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{correct ? 'Es una respuesta correcta' : 'Marcar como respuesta correcta'}</TooltipContent>
                        </Tooltip>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar opción ${i + 1}`} onClick={() => remove(i)} disabled={fields.length === 1}>
                            <XIcon />
                        </Button>
                    </div>
                );
            })}
            <Button type="button" variant="ghost" size="sm" className="ml-6 text-muted-foreground" onClick={() => append({ label: `Opción ${fields.length + 1}`, is_correct: false })}>
                <PlusIcon />
                Agregar opción
            </Button>
            {multiple && <FieldDescription className="ml-8">Puntúa solo si el alumno marca exactamente todas las correctas.</FieldDescription>}
            {rootError && <FieldError className="ml-8">{rootError}</FieldError>}
        </div>
    );
}

function AcceptedAnswersEditor({ index }: { index: number }) {
    const { control, register } = useFormContext<EvaluationFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: `questions.${index}.accepted_answers` });

    return (
        <div className="space-y-2 rounded-md bg-muted/40 p-3">
            <p className="text-sm font-medium">Respuestas aceptadas</p>
            <FieldDescription>
                Se comparan sin importar mayúsculas, tildes ni espacios extra. Si no agregas ninguna, la respuesta se revisa a mano.
            </FieldDescription>
            {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                    <Input {...register(`questions.${index}.accepted_answers.${i}.value`)} placeholder="Respuesta correcta" aria-label={`Respuesta aceptada ${i + 1}`} className="bg-background" />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar respuesta" onClick={() => remove(i)}>
                        <XIcon />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => append({ value: '' })}>
                <PlusIcon />
                Agregar respuesta aceptada
            </Button>
        </div>
    );
}

function IconAction({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} className={className}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
