import axios, { AxiosError } from 'axios';

import { getToken, setToken } from './auth-token';
import type { ApiEnvelope } from './types';

export const api = axios.create({
    baseURL: '/api/v1',
    headers: { Accept: 'application/json' },
});

const isPanelRequest = (url?: string) => url?.startsWith('/admin') || url?.startsWith('/auth');

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token && isPanelRequest(config.url)) {
        config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
});

api.interceptors.response.use(undefined, (error: unknown) => {
    // An expired or revoked session sends the teacher back to the login screen.
    if (error instanceof AxiosError && error.response?.status === 401 && isPanelRequest(error.config?.url)) {
        setToken(null);
    }

    return Promise.reject(error);
});

export async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
    return (await request).data.data;
}

interface ErrorBody {
    message?: string;
    errors?: Record<string, string[]>;
}

export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
    if (error instanceof AxiosError) {
        const body = error.response?.data as ErrorBody | undefined;

        if (error.response?.status === 413) {
            return 'El archivo es demasiado grande para el servidor (revisa upload_max_filesize y post_max_size de PHP).';
        }

        const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        return firstError ?? body?.message ?? fallback;
    }

    return fallback;
}

/** Laravel validation errors, keyed by field ("questions.0.options"). */
export function validationErrors(error: unknown): Record<string, string[]> {
    if (error instanceof AxiosError && error.response?.status === 422) {
        return (error.response.data as ErrorBody).errors ?? {};
    }

    return {};
}

export function isNotFound(error: unknown): boolean {
    return error instanceof AxiosError && error.response?.status === 404;
}
