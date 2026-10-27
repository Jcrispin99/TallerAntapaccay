import { z } from 'zod';

import type { EvaluationInput } from '@/api/admin';
import type { AdminEvaluation, QuestionType } from '@/api/types';
import { hasOptions } from '@/lib/format';

// Form state of the evaluation builder. Numbers are kept as strings while editing,
// and server ids are renamed so they don't clash with react-hook-form's field ids.

const numeric = (message: string, min: number, max = Infinity) =>
    z.string().refine((value) => value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= min && Number(value) <= max, message);

const optionSchema = z.object({
    optionId: z.number().optional(),
    label: z.string().trim().min(1, 'La opción no puede estar vacía.').max(500),
    is_correct: z.boolean(),
});

const questionSchema = z
    .object({
        questionId: z.number().optional(),
        type: z.enum(['short_text', 'paragraph', 'single_choice', 'multiple_choice', 'dropdown']),
        prompt: z.string().trim().min(1, 'Escribe la pregunta.').max(2000),
        help_text: z.string().max(2000),
        points: numeric('Usa un número entre 0 y 1000.', 0, 1000),
        required: z.boolean(),
        accepted_answers: z.array(z.object({ value: z.string().max(255) })),
        options: z.array(optionSchema),
    })
    .superRefine((question, ctx) => {
        if (!hasOptions(question.type)) {
            return;
        }

        const correct = question.options.filter((option) => option.is_correct).length;

        if (question.options.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: 'Agrega al menos una opción.' });
        } else if (Number(question.points) > 0 && correct === 0) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: 'Marca la respuesta correcta (o pon 0 puntos si no se califica).' });
        } else if (question.type !== 'multiple_choice' && correct > 1) {
            ctx.addIssue({ code: 'custom', path: ['options'], message: 'Este tipo de pregunta admite una sola respuesta correcta.' });
        }
    });

export const evaluationSchema = z
    .object({
        title: z.string().trim().min(1, 'La evaluación necesita un título.').max(255),
        description: z.string().max(5000),
        passing_score: numeric('Usa un número mayor o igual a 0.', 0),
        max_attempts: z.string().refine((value) => value.trim() === '' || (Number.isInteger(Number(value)) && Number(value) >= 1), 'Déjalo vacío o usa un número entero mayor a 0.'),
        show_correct_answers: z.boolean(),
        is_published: z.boolean(),
        questions: z.array(questionSchema),
    })
    .superRefine((evaluation, ctx) => {
        const total = totalPoints(evaluation.questions);

        if (Number(evaluation.passing_score) > total) {
            ctx.addIssue({ code: 'custom', path: ['passing_score'], message: `No puede ser mayor que el puntaje total (${total}).` });
        }
    });

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;
export type QuestionFormValues = EvaluationFormValues['questions'][number];

export function totalPoints(questions: Pick<QuestionFormValues, 'points'>[]): number {
    return Math.round(questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 100) / 100;
}

export function toFormValues(evaluation: AdminEvaluation): EvaluationFormValues {
    return {
        title: evaluation.title,
        description: evaluation.description ?? '',
        passing_score: String(evaluation.passing_score),
        max_attempts: evaluation.max_attempts === null ? '' : String(evaluation.max_attempts),
        show_correct_answers: evaluation.show_correct_answers,
        is_published: evaluation.is_published,
        questions: evaluation.questions.map((q) => ({
            questionId: q.id,
            type: q.type,
            prompt: q.prompt,
            help_text: q.help_text ?? '',
            points: String(q.points),
            required: q.required,
            accepted_answers: q.accepted_answers.map((value) => ({ value })),
            options: q.options.map((o) => ({ optionId: o.id, label: o.label, is_correct: o.is_correct })),
        })),
    };
}

export function toInput(values: EvaluationFormValues): EvaluationInput {
    return {
        title: values.title.trim(),
        description: values.description.trim() || null,
        passing_score: Number(values.passing_score),
        max_attempts: values.max_attempts.trim() === '' ? null : Number(values.max_attempts),
        show_correct_answers: values.show_correct_answers,
        is_published: values.is_published,
        questions: values.questions.map((q) => ({
            id: q.questionId,
            type: q.type,
            prompt: q.prompt.trim(),
            help_text: q.help_text.trim() || null,
            points: Number(q.points),
            required: q.required,
            accepted_answers: q.type === 'short_text' ? q.accepted_answers.map((a) => a.value.trim()).filter(Boolean) : [],
            options: hasOptions(q.type) ? q.options.map((o) => ({ id: o.optionId, label: o.label.trim(), is_correct: o.is_correct })) : [],
        })),
    };
}

export type QuestionPreset = QuestionType | 'true_false';

export function newQuestion(preset: QuestionPreset): QuestionFormValues {
    const base = { prompt: '', help_text: '', points: '1', required: true, accepted_answers: [], options: [] };

    if (preset === 'true_false') {
        return {
            ...base,
            type: 'single_choice',
            options: [
                { label: 'Verdadero', is_correct: false },
                { label: 'Falso', is_correct: false },
            ],
        };
    }

    return {
        ...base,
        type: preset,
        options: hasOptions(preset) ? [{ label: 'Opción 1', is_correct: false }] : [],
    };
}

/** A copy without server ids, so it is saved as a new question. */
export function duplicateQuestion(question: QuestionFormValues): QuestionFormValues {
    return {
        ...question,
        questionId: undefined,
        accepted_answers: question.accepted_answers.map((a) => ({ ...a })),
        options: question.options.map(({ label, is_correct }) => ({ label, is_correct })),
    };
}
