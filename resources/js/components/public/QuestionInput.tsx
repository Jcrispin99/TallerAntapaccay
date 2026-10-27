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
                    className="max-w-md"
                />
            );

        case 'paragraph':
            return (
                <Textarea
                    id={id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Tu respuesta"
                    rows={4}
                    aria-invalid={invalid}
                />
            );

        case 'single_choice':
            return (
                <RadioGroup value={selected[0] ? String(selected[0]) : ''} onValueChange={(v) => onChange([Number(v)])} aria-invalid={invalid}>
                    {question.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-3">
                            <RadioGroupItem value={String(option.id)} id={`${id}-${option.id}`} />
                            <Label htmlFor={`${id}-${option.id}`} className="font-normal">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            );

        case 'multiple_choice':
            return (
                <div className="grid gap-3">
                    {question.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-3">
                            <Checkbox
                                id={`${id}-${option.id}`}
                                checked={selected.includes(option.id)}
                                onCheckedChange={(checked) =>
                                    onChange(checked ? [...selected, option.id] : selected.filter((optionId) => optionId !== option.id))
                                }
                                aria-invalid={invalid}
                            />
                            <Label htmlFor={`${id}-${option.id}`} className="font-normal">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </div>
            );

        case 'dropdown':
            return (
                <Select value={selected[0] ? String(selected[0]) : ''} onValueChange={(v) => onChange([Number(v)])}>
                    <SelectTrigger id={id} className="w-full max-w-md" aria-invalid={invalid}>
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
