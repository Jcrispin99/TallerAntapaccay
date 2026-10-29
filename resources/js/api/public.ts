import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from './client';
import type { AnswerValues, ApiEnvelope, Attempt, Course, CourseProgress, Evaluation, LearnerProgress, MaterialProgress } from './types';

export function useCourses() {
    return useQuery({
        queryKey: ['courses'],
        queryFn: () => unwrap(api.get<ApiEnvelope<Course[]>>('/courses')),
    });
}

export function useCourse(slug: string) {
    return useQuery({
        queryKey: ['courses', slug],
        queryFn: () => unwrap(api.get<ApiEnvelope<Course>>(`/courses/${slug}`)),
        // Keep checking while a presentation is still being converted.
        refetchInterval: (query) =>
            query.state.data?.materials?.some((m) => m.conversion_status === 'pending' || m.conversion_status === 'processing') ? 5000 : false,
    });
}

const progressKey = (slug: string, dni: string | null) => ['courses', slug, 'progress', dni];

const fetchLearner = (dni: string) => unwrap(api.post<ApiEnvelope<LearnerProgress>>('/progress', { dni }));

/** The student's standing in every course, for "Mis talleres". */
export function useLearnerProgress(dni: string | null) {
    return useQuery({
        queryKey: ['progress', dni],
        queryFn: () => fetchLearner(dni ?? ''),
        enabled: dni !== null,
        retry: false,
    });
}

/** Checks the DNI against the student list. */
export function useIdentifyLearner() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: fetchLearner,
        onSuccess: (data) => queryClient.setQueryData(['progress', data.student.dni], data),
    });
}

/** What the identified student has already seen of the course material. */
export function useCourseProgress(slug: string, dni: string | null) {
    return useQuery({
        queryKey: progressKey(slug, dni),
        queryFn: () => unwrap(api.post<ApiEnvelope<CourseProgress>>(`/courses/${slug}/progress`, { dni })),
        enabled: dni !== null,
        retry: false,
    });
}

/** The player's report: the furthest second reached in a video, or just "opened" for a presentation. */
export function useRecordProgress(slug: string, dni: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ materialId, seconds, duration }: { materialId: number; seconds?: number; duration?: number | null }) =>
            unwrap(api.post<ApiEnvelope<MaterialProgress>>(`/materials/${materialId}/progress`, { dni, seconds, duration })),
        onSuccess: (view) => {
            queryClient.setQueryData<CourseProgress>(progressKey(slug, dni), (current) =>
                current ? { ...current, progress: [...current.progress.filter((p) => p.material_id !== view.material_id), view] } : current,
            );

            if (view.completed) {
                void queryClient.invalidateQueries({ queryKey: ['progress'] });
            }
        },
    });
}

export function useEvaluation(slug: string) {
    return useQuery({
        queryKey: ['courses', slug, 'evaluation'],
        queryFn: () => unwrap(api.get<ApiEnvelope<Evaluation>>(`/courses/${slug}/evaluation`)),
        retry: false,
    });
}

export function useStartAttempt(evaluationId: number) {
    return useMutation({
        mutationFn: (data: { dni: string }) =>
            unwrap(api.post<ApiEnvelope<Attempt>>(`/evaluations/${evaluationId}/attempts`, data)),
    });
}

export function useSubmitAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ token, answers }: { token: string; answers: AnswerValues }) =>
            unwrap(api.post<ApiEnvelope<Attempt>>(`/attempts/${token}/submit`, { answers })),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
    });
}

export function useAttempt(token: string) {
    return useQuery({
        queryKey: ['attempts', token],
        queryFn: () => unwrap(api.get<ApiEnvelope<Attempt>>(`/attempts/${token}`)),
        retry: false,
    });
}
