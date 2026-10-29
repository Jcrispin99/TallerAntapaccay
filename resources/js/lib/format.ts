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

/** 754 → "12:34", 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');

    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

function titleCase(text: string): string {
    return text
        .toLocaleLowerCase('es')
        .split(/\s+/)
        .filter(Boolean)
        .map((word, index) => (index > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase('es') + word.slice(1)))
        .join(' ');
}

/**
 * The student list usually has "APELLIDOS, NOMBRES": "QUISPE ROJAS, ROSA" → "Rosa Quispe Rojas", first "Rosa".
 * Without a comma the order is unknown, so the whole name is used.
 */
export function personName(fullName: string): { full: string; first: string } {
    const [lastNames, firstNames] = fullName.split(',').map((part) => part.trim());

    if (firstNames) {
        const first = titleCase(firstNames);

        return { full: `${first} ${titleCase(lastNames)}`, first: first.split(' ')[0] };
    }

    const full = titleCase(fullName);

    return { full, first: full };
}

/** Only the last digits, for shared screens: "••••5678". */
export function maskDni(dni: string): string {
    return `••••${dni.slice(-4)}`;
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
