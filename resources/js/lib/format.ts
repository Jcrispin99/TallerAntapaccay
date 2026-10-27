import type { AttemptStatus, ConversionStatus, QuestionType } from '@/api/types';

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function formatScore(value: number | null): string {
    if (value === null) {
        return '—';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

export const questionTypeLabels: Record<QuestionType, string> = {
    single_choice: 'Opción única',
    multiple_choice: 'Casillas',
    dropdown: 'Desplegable',
    short_text: 'Respuesta corta',
    paragraph: 'Párrafo',
};

export const conversionStatusLabels: Record<ConversionStatus, string> = {
    pending: 'En cola',
    processing: 'Convirtiendo…',
    ready: 'Listo',
    failed: 'Error',
};

export const attemptStatusLabels: Record<AttemptStatus, string> = {
    in_progress: 'En curso',
    pending_review: 'Pendiente de revisión',
    graded: 'Calificado',
};

export function hasOptions(type: QuestionType): boolean {
    return type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown';
}
