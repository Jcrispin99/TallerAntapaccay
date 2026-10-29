import type { Question } from '@/api/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type QuestionValue = string | number[] | undefined;

interface Props {
    question: Question;
    value: QuestionValue;
    onChange: (value: QuestionValue) => void;
    invalid?: boolean;
}

/** A whole row per option, big enough to tap on a phone; the chosen one is highlighted. */
const OPTION_ROW =
    'flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border-2 border-transparent bg-card px-4 py-3 text-base leading-snug font-normal transition-colors hover:border-muted-foreground/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:font-semibold sm:text-lg';

/** One question of the student form, rendered like its Google Forms counterpart. */
export function QuestionInput({ question, value, onChange, invalid }: Props) {
    const id = `q-${question.id}`;
    const selected = Array.isArray(value) ? value : [];

    switch (question.type) {
        case 'short_text':
            return (
                <Input
                    id={id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Tu respuesta"
                    maxLength={255}
                    aria-invalid={invalid}
                    className="h-12 max-w-md text-lg"
                />
            );

        case 'paragraph':
            return (
                <Textarea
                    id={id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Tu respuesta"
                    rows={5}
                    aria-invalid={invalid}
                    className="text-lg"
                />
            );

        case 'single_choice':
            return (
                <RadioGroup value={selected[0] ? String(selected[0]) : ''} onValueChange={(v) => onChange([Number(v)])} aria-invalid={invalid} className="gap-2.5">
                    {question.options.map((option) => (
                        <Label key={option.id} htmlFor={`${id}-${option.id}`} className={OPTION_ROW}>
                            <RadioGroupItem value={String(option.id)} id={`${id}-${option.id}`} className="size-5" />
                            {option.label}
                        </Label>
                    ))}
                </RadioGroup>
            );

        case 'multiple_choice':
            return (
                <div className="grid gap-2.5">
                    {question.options.map((option) => (
                        <Label key={option.id} htmlFor={`${id}-${option.id}`} className={OPTION_ROW}>
                            <Checkbox
                                id={`${id}-${option.id}`}
                                checked={selected.includes(option.id)}
                                onCheckedChange={(checked) =>
                                    onChange(checked ? [...selected, option.id] : selected.filter((optionId) => optionId !== option.id))
                                }
                                aria-invalid={invalid}
                                className="size-5"
                            />
                            {option.label}
                        </Label>
                    ))}
                </div>
            );

        case 'dropdown':
            return (
                <Select value={selected[0] ? String(selected[0]) : ''} onValueChange={(v) => onChange([Number(v)])}>
                    <SelectTrigger id={id} className="h-12 w-full max-w-md text-base" aria-invalid={invalid}>
                        <SelectValue placeholder="Elige una opción" />
                    </SelectTrigger>
                    <SelectContent>
                        {question.options.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
    }
}

export function isAnswered(value: QuestionValue): boolean {
    return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim() !== '';
}
