import { CheckIcon, CircleDashedIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Answer } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { formatScore, hasOptions } from '@/lib/format';
import { cn } from '@/lib/utils';

/** A submitted answer next to its answer key (student review and admin detail). */
export function AnswerReview({ answer, index, children }: { answer: Answer; index: number; children?: ReactNode }) {
    const { question } = answer;

    return (
        <div className="space-y-3 rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                    {index + 1}. {question.prompt}
                    {question.deleted && <span className="ml-2 text-xs font-normal text-muted-foreground">(pregunta eliminada del formulario)</span>}
                </p>
                <ScoreBadge answer={answer} />
            </div>

            {hasOptions(question.type) ? (
                <ul className="space-y-1.5 text-sm">
                    {answer.options.map((option) => {
                        const picked = answer.selected_option_ids.includes(option.id);

                        return (
                            <li
                                key={option.id}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1',
                                    picked && option.is_correct && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                                    picked && !option.is_correct && 'bg-destructive/10 text-destructive',
                                )}
                            >
                                {option.is_correct ? (
                                    <CheckIcon className="size-4 shrink-0 text-emerald-600" />
                                ) : picked ? (
                                    <XIcon className="size-4 shrink-0" />
                                ) : (
                                    <span className="size-4 shrink-0" />
                                )}
                                <span className={cn(picked && 'font-medium')}>{option.label}</span>
                                {picked && <span className="text-xs opacity-70">(elegida)</span>}
                            </li>
                        );
                    })}
                    {answer.selected_option_ids.length === 0 && <li className="text-muted-foreground italic">Sin responder</li>}
                </ul>
            ) : (
                <div className="space-y-2 text-sm">
                    <p className={cn('rounded-md bg-muted/60 px-3 py-2 whitespace-pre-line', !answer.text_value && 'text-muted-foreground italic')}>
                        {answer.text_value ?? 'Sin responder'}
                    </p>
                    {question.accepted_answers.length > 0 && (
                        <p className="text-muted-foreground">
                            Respuestas aceptadas: <span className="text-foreground">{question.accepted_answers.join(' · ')}</span>
                        </p>
                    )}
                </div>
            )}

            {children}
        </div>
    );
}

function ScoreBadge({ answer }: { answer: Answer }) {
    const points = `${formatScore(answer.points_awarded)} / ${formatScore(answer.question.points)} pts`;

    if (answer.points_awarded === null) {
        return (
            <Badge variant="outline" className="shrink-0">
                <CircleDashedIcon />
                Por revisar
            </Badge>
        );
    }

    if (answer.question.points === 0) {
        return null;
    }

    return (
        <Badge
            variant={answer.is_correct || answer.points_awarded > 0 ? 'secondary' : 'destructive'}
            className={cn('shrink-0', answer.is_correct && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}
        >
            {points}
        </Badge>
    );
}
