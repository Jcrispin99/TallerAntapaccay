import type { Course, CourseStanding } from '@/api/types';
import { formatScore } from '@/lib/format';

export type StandingStatus = 'pending' | 'in_progress' | 'ready' | 'retry' | 'review' | 'approved' | 'failed' | 'seen';

export interface Standing {
    status: StandingStatus;
    label: string;
    detail: string;
    /** Nothing left to do in this course. */
    done: boolean;
    /** Share of the material completed, while the course is in progress. */
    progress: number | null;
    action: { label: string; to: string };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 videos · 1 presentación · 5 preguntas" */
export function courseContents(course: Course): string {
    const videos = course.videos_count ?? course.materials?.filter((m) => m.type === 'video').length ?? 0;
    const presentations = (course.materials_count ?? course.materials?.length ?? 0) - videos;
    const questions = course.evaluation?.questions_count ?? 0;

    return [
        videos > 0 && plural(videos, 'video', 'videos'),
        presentations > 0 && plural(presentations, 'presentación', 'presentaciones'),
        questions > 0 && plural(questions, 'pregunta', 'preguntas'),
    ]
        .filter(Boolean)
        .join(' · ');
}

/** What a course looks like for the identified student: its state, a one-line detail and what to do next. */
export function standingOf(course: Course, standing: CourseStanding | undefined): Standing {
    const courseUrl = `/cursos/${course.slug}`;
    const evaluationUrl = `${courseUrl}/evaluacion`;
    const evaluation = standing?.evaluation;
    const score = evaluation?.best_score != null ? `${formatScore(evaluation.best_score)}/${formatScore(evaluation.max_score)}` : '';
    const review = { label: 'Repasar', to: courseUrl };

    if (evaluation?.passed) {
        return { status: 'approved', label: 'Aprobado', detail: `Aprobado con ${score}`, done: true, progress: null, action: review };
    }

    if (evaluation?.pending_review) {
        return { status: 'review', label: 'En revisión', detail: 'Tu profesor está revisando algunas respuestas.', done: true, progress: null, action: review };
    }

    if (evaluation && evaluation.attempts_used > 0) {
        const left = evaluation.max_attempts === null ? null : evaluation.max_attempts - evaluation.attempts_used;

        return left === 0
            ? { status: 'failed', label: 'Desaprobado', detail: `Mejor nota ${score}. Ya no te quedan intentos.`, done: true, progress: null, action: review }
            : {
                  status: 'retry',
                  label: 'Desaprobado',
                  detail: `Mejor nota ${score}${left === null ? '' : ` · ${plural(left, 'intento', 'intentos')} más`}`,
                  done: false,
                  progress: null,
                  action: { label: 'Reintentar', to: evaluationUrl },
              };
    }

    const total = standing?.materials_total ?? course.materials_count ?? 0;
    const completed = standing?.materials_completed ?? 0;

    if (standing && completed >= total) {
        if (course.evaluation) {
            return {
                status: 'ready',
                label: 'Listo para rendir',
                detail: `Material completo · ${plural(course.evaluation.questions_count, 'pregunta', 'preguntas')}`,
                done: false,
                progress: null,
                action: { label: 'Rendir evaluación', to: evaluationUrl },
            };
        }

        if (total > 0) {
            return { status: 'seen', label: 'Completado', detail: 'Viste todo el material.', done: true, progress: null, action: review };
        }
    }

    if (standing?.started) {
        const questions = course.evaluation?.questions_count ?? 0;

        return {
            status: 'in_progress',
            label: 'En curso',
            detail: `Material ${completed} de ${total}${questions > 0 ? ` · luego ${plural(questions, 'pregunta', 'preguntas')}` : ''}`,
            done: false,
            progress: total > 0 ? completed / total : null,
            action: { label: 'Continuar', to: courseUrl },
        };
    }

    return { status: 'pending', label: 'Pendiente', detail: courseContents(course), done: false, progress: null, action: { label: 'Empezar', to: courseUrl } };
}
