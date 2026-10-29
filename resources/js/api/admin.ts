import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { api, unwrap } from './client';
import type {
    AdminAttempt,
    AdminCourse,
    AdminEvaluation,
    AdminMaterial,
    AdminQuestion,
    ApiEnvelope,
    AttemptsPage,
    ImportResult,
    Student,
    StudentsPage,
    User,
    UserRole,
} from './types';

export interface CourseInput {
    title: string;
    description: string | null;
    is_published?: boolean;
    /** Admins only: hand the course to another teacher. */
    user_id?: number;
}

export interface EvaluationInput {
    title: string;
    description: string | null;
    passing_score: number;
    max_attempts: number | null;
    show_correct_answers: boolean;
    is_published: boolean;
    questions: AdminQuestion[];
}

export function useAdminCourses() {
    return useQuery({
        queryKey: ['admin', 'courses'],
        queryFn: () => unwrap(api.get<ApiEnvelope<AdminCourse[]>>('/admin/courses')),
    });
}

export function useAdminCourse(id: number) {
    return useQuery({
        queryKey: ['admin', 'courses', id],
        queryFn: () => unwrap(api.get<ApiEnvelope<AdminCourse>>(`/admin/courses/${id}`)),
        // Keep checking while a presentation is still being converted.
        refetchInterval: (query) =>
            query.state.data?.materials?.some((m) => m.conversion_status === 'pending' || m.conversion_status === 'processing') ? 3000 : false,
    });
}

function useInvalidateCourse(id?: number) {
    const queryClient = useQueryClient();

    return () => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
        void queryClient.invalidateQueries({ queryKey: ['courses'] });

        if (id !== undefined) {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'courses', id] });
        }
    };
}

export function useCreateCourse() {
    const invalidate = useInvalidateCourse();

    return useMutation({
        mutationFn: (data: CourseInput) => unwrap(api.post<ApiEnvelope<AdminCourse>>('/admin/courses', data)),
        onSuccess: invalidate,
    });
}

export function useUpdateCourse(id: number) {
    const invalidate = useInvalidateCourse(id);

    return useMutation({
        mutationFn: (data: Partial<CourseInput>) => unwrap(api.patch<ApiEnvelope<AdminCourse>>(`/admin/courses/${id}`, data)),
        onSuccess: invalidate,
    });
}

export function useDeleteCourse() {
    const invalidate = useInvalidateCourse();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/admin/courses/${id}`),
        onSuccess: invalidate,
    });
}

interface StartedUpload {
    id: string;
    chunk_size: number;
}

/**
 * Files go in chunks, because Cloudflare cuts any request over 100 MB (see ChunkedUploads).
 * The server answers each chunk with the bytes it has, and the next chunk starts there.
 */
export function useUploadMaterial(courseId: number) {
    const invalidate = useInvalidateCourse(courseId);

    return useMutation({
        mutationFn: async ({ file, duration, onProgress }: { file: File; duration: number | null; onProgress: (percent: number) => void }) => {
            const upload = await unwrap(
                api.post<ApiEnvelope<StartedUpload>>(`/admin/courses/${courseId}/uploads`, { name: file.name, size: file.size, mime: file.type || null }),
            );
            // 100% means "Procesando…", while the server stores the file.
            const report = (bytes: number) => onProgress(Math.min(99, Math.round((bytes / file.size) * 100)));
            let offset = 0;

            while (offset < file.size) {
                const start = offset;
                const form = new FormData();
                form.append('offset', String(start));
                form.append('chunk', file.slice(start, start + upload.chunk_size), 'chunk');

                const { received } = await withRetries(() =>
                    unwrap(
                        api.post<ApiEnvelope<{ received: number }>>(`/admin/uploads/${upload.id}/chunks`, form, {
                            onUploadProgress: (event) => report(start + event.loaded),
                        }),
                    ),
                );

                if (received === start) {
                    throw new Error('La subida no avanza.');
                }

                offset = received;
                report(offset);
            }

            onProgress(100);

            return unwrap(api.post<ApiEnvelope<AdminMaterial>>(`/admin/courses/${courseId}/materials`, { upload: upload.id, duration }));
        },
        onSuccess: invalidate,
    });
}

/** Retries a request lost to the network or to a brief server or Cloudflare error, waiting longer each time. */
async function withRetries<T>(request: () => Promise<T>, attempts = 4): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await request();
        } catch (error) {
            // 0 is no response at all (the network failed); 429 and 5xx, Cloudflare's 52x included, are usually brief.
            const status = error instanceof AxiosError ? (error.response?.status ?? 0) : null;
            const transient = status !== null && (status === 0 || status === 429 || status >= 500);

            if (!transient || attempt === attempts) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** (attempt - 1)));
        }
    }
}

export function useAddMaterialLink(courseId: number) {
    const invalidate = useInvalidateCourse(courseId);

    return useMutation({
        mutationFn: (input: { url: string; title: string }) => unwrap(api.post<ApiEnvelope<AdminMaterial>>(`/admin/courses/${courseId}/materials/link`, input)),
        onSuccess: invalidate,
    });
}

export function useMaterialActions(courseId: number) {
    const invalidate = useInvalidateCourse(courseId);

    return {
        rename: useMutation({
            mutationFn: ({ id, title }: { id: number; title: string }) => api.patch(`/admin/materials/${id}`, { title }),
            onSuccess: invalidate,
        }),
        remove: useMutation({
            mutationFn: (id: number) => api.delete(`/admin/materials/${id}`),
            onSuccess: invalidate,
        }),
        retry: useMutation({
            mutationFn: (id: number) => api.post(`/admin/materials/${id}/retry`),
            onSuccess: invalidate,
        }),
        reorder: useMutation({
            mutationFn: (ids: number[]) => api.patch(`/admin/courses/${courseId}/materials/order`, { ids }),
            onSuccess: invalidate,
        }),
    };
}

export function useAdminEvaluation(courseId: number) {
    return useQuery({
        queryKey: ['admin', 'courses', courseId, 'evaluation'],
        queryFn: () => unwrap(api.get<ApiEnvelope<AdminEvaluation>>(`/admin/courses/${courseId}/evaluation`)),
    });
}

export function useSaveEvaluation(courseId: number) {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateCourse(courseId);

    return useMutation({
        mutationFn: (data: EvaluationInput) => unwrap(api.put<ApiEnvelope<AdminEvaluation>>(`/admin/courses/${courseId}/evaluation`, data)),
        onSuccess: (evaluation) => {
            queryClient.setQueryData(['admin', 'courses', courseId, 'evaluation'], evaluation);
            invalidate();
        },
    });
}

export interface AttemptFilters {
    search: string;
    gerencia: string;
    status: string;
    page: number;
}

export function useAdminAttempts(courseId: number, filters: AttemptFilters) {
    return useQuery({
        queryKey: ['admin', 'courses', courseId, 'attempts', filters],
        queryFn: () =>
            unwrap(
                api.get<ApiEnvelope<AttemptsPage>>(`/admin/courses/${courseId}/attempts`, {
                    params: {
                        'filter[search]': filters.search || undefined,
                        'filter[gerencia]': filters.gerencia || undefined,
                        'filter[status]': filters.status || undefined,
                        page: filters.page,
                    },
                }),
            ),
        placeholderData: keepPreviousData,
    });
}

export function useAdminAttempt(id: number | null) {
    return useQuery({
        queryKey: ['admin', 'attempts', id],
        queryFn: () => unwrap(api.get<ApiEnvelope<AdminAttempt>>(`/admin/attempts/${id}`)),
        enabled: id !== null,
    });
}

export function useGradeAnswer(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ answerId, points }: { answerId: number; points: number }) =>
            unwrap(api.patch<ApiEnvelope<AdminAttempt>>(`/admin/answers/${answerId}/grade`, { points })),
        onSuccess: (attempt) => {
            queryClient.setQueryData(['admin', 'attempts', attempt.id], attempt);
            void queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'attempts'] });
        },
    });
}

/** The export needs the admin key header, so it is downloaded through axios. */
export async function downloadAttemptsCsv(courseId: number, slug: string): Promise<void> {
    const response = await api.get<Blob>(`/admin/courses/${courseId}/attempts/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultados-${slug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export interface UserInput {
    name: string;
    email: string;
    password?: string | null;
    role: UserRole;
    is_active?: boolean;
}

export function useUsers(enabled = true) {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => unwrap(api.get<ApiEnvelope<User[]>>('/admin/users')),
        enabled,
    });
}

export function useSaveUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id?: number; data: Partial<UserInput> }) =>
            unwrap(id ? api.patch<ApiEnvelope<User>>(`/admin/users/${id}`, data) : api.post<ApiEnvelope<User>>('/admin/users', data)),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            void queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin'] });
        },
    });
}

export interface StudentFilters {
    search: string;
    gerencia: string;
    page: number;
}

export type StudentInput = Omit<Student, 'id' | 'attempts_count'>;

export function useStudents(filters: StudentFilters) {
    return useQuery({
        queryKey: ['admin', 'students', filters],
        queryFn: () =>
            unwrap(
                api.get<ApiEnvelope<StudentsPage>>('/admin/students', {
                    params: { search: filters.search || undefined, gerencia: filters.gerencia || undefined, page: filters.page },
                }),
            ),
        placeholderData: keepPreviousData,
    });
}

export function useSaveStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id?: number; data: StudentInput }) =>
            unwrap(id ? api.patch<ApiEnvelope<Student>>(`/admin/students/${id}`, data) : api.post<ApiEnvelope<Student>>('/admin/students', data)),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    });
}

export function useDeleteStudent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/admin/students/${id}`),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    });
}

export function useImportStudents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => {
            const form = new FormData();
            form.append('file', file);

            return unwrap(api.post<ApiEnvelope<ImportResult>>('/admin/students/import', form));
        },
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    });
}
