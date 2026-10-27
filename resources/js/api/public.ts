import { useMutation, useQuery } from '@tanstack/react-query';

import { api, unwrap } from './client';
import type { AnswerValues, ApiEnvelope, Attempt, Course, Evaluation } from './types';

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
    return useMutation({
        mutationFn: ({ token, answers }: { token: string; answers: AnswerValues }) =>
            unwrap(api.post<ApiEnvelope<Attempt>>(`/attempts/${token}/submit`, { answers })),
    });
}

export function useAttempt(token: string) {
    return useQuery({
        queryKey: ['attempts', token],
        queryFn: () => unwrap(api.get<ApiEnvelope<Attempt>>(`/attempts/${token}`)),
        retry: false,
    });
}
