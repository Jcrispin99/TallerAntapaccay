// Mirrors the JSON resources in app/Http/Resources.

export type MaterialType = 'video' | 'presentation';
export type ConversionStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type QuestionType = 'short_text' | 'paragraph' | 'single_choice' | 'multiple_choice' | 'dropdown';
export type AttemptStatus = 'in_progress' | 'pending_review' | 'graded';

export interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface Material {
    id: number;
    type: MaterialType;
    title: string;
    original_name: string;
    mime: string | null;
    size: number;
    url: string;
    pdf_url: string | null;
    conversion_status: ConversionStatus;
    position: number;
}

export interface AdminMaterial extends Material {
    conversion_error: string | null;
    created_at: string | null;
}

export interface Course {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    materials_count?: number;
    materials?: Material[];
    evaluation?: { id: number; title: string; questions_count: number } | null;
}

export type UserRole = 'admin' | 'teacher';

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    courses_count?: number;
    created_at: string | null;
}

export interface AdminCourse {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    is_published: boolean;
    owner?: { id: number; name: string } | null;
    materials_count?: number;
    materials?: AdminMaterial[];
    evaluation?: { id: number; is_published: boolean; questions_count: number | null; attempts_count: number | null } | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface Question {
    id: number;
    type: QuestionType;
    prompt: string;
    help_text: string | null;
    points: number;
    required: boolean;
    options: { id: number; label: string }[];
}

export interface Evaluation {
    id: number;
    title: string;
    description: string | null;
    passing_score: number;
    max_attempts: number | null;
    total_points: number;
    course: { title: string; slug: string };
    questions: Question[];
}

export interface AdminOption {
    id?: number;
    label: string;
    is_correct: boolean;
}

export interface AdminQuestion {
    id?: number;
    type: QuestionType;
    prompt: string;
    help_text: string | null;
    points: number;
    required: boolean;
    accepted_answers: string[];
    options: AdminOption[];
}

export interface AdminEvaluation {
    id: number;
    course_id: number;
    title: string;
    description: string | null;
    passing_score: number;
    max_attempts: number | null;
    show_correct_answers: boolean;
    is_published: boolean;
    attempts_count: number;
    questions: AdminQuestion[];
}

export interface Answer {
    id: number;
    question_id: number;
    question: {
        type: QuestionType;
        prompt: string;
        points: number;
        accepted_answers: string[];
        deleted: boolean;
    };
    text_value: string | null;
    selected_option_ids: number[];
    options: { id: number; label: string; is_correct: boolean }[];
    points_awarded: number | null;
    is_correct: boolean | null;
    graded_manually: boolean;
}

export interface Attempt {
    token: string;
    dni: string;
    full_name: string | null;
    status: AttemptStatus;
    score: number | null;
    max_score: number | null;
    passed: boolean | null;
    started_at: string;
    submitted_at: string | null;
    evaluation: {
        id: number;
        title: string;
        passing_score: number;
        course_title: string;
        course_slug: string;
    };
    review?: Answer[];
}

export interface AdminAttempt {
    id: number;
    dni: string;
    full_name: string | null;
    gerencia: string | null;
    puesto: string | null;
    status: AttemptStatus;
    score: number | null;
    max_score: number | null;
    passed: boolean | null;
    started_at: string;
    submitted_at: string | null;
    ip: string | null;
    answers?: Answer[];
}

export interface AttemptsPage {
    items: AdminAttempt[];
    meta: { current_page: number; last_page: number; total: number };
    summary: {
        attempts: number;
        passed: number;
        pending_review: number;
        average_score: number | null;
        max_score: number;
    };
    gerencias: string[];
}

export interface Student {
    id: number;
    dni: string;
    full_name: string;
    gerencia: string | null;
    puesto: string | null;
    attempts_count?: number;
}

export interface StudentsPage {
    items: Student[];
    meta: { current_page: number; last_page: number; total: number };
    gerencias: string[];
}

export interface ImportResult {
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
}

/** Answers keyed by question id, as the submit endpoint expects. */
export type AnswerValues = Record<number, string | number[] | number | null>;
