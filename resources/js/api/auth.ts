import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { setToken, useToken } from './auth-token';
import { api, unwrap } from './client';
import type { ApiEnvelope, User } from './types';

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (credentials: { email: string; password: string }) =>
            unwrap(api.post<ApiEnvelope<{ user: User; token: string }>>('/auth/login', credentials)),
        onSuccess: ({ user, token }) => {
            queryClient.clear();
            queryClient.setQueryData(['me'], user);
            setToken(token);
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post('/auth/logout'),
        onSettled: () => {
            setToken(null);
            queryClient.clear();
        },
    });
}

/** The signed-in teacher, or undefined while loading / signed out. */
export function useMe() {
    const token = useToken();

    return useQuery({
        queryKey: ['me'],
        queryFn: () => unwrap(api.get<ApiEnvelope<User>>('/auth/me')),
        enabled: token !== null,
        staleTime: 5 * 60_000,
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: { current_password: string; password: string; password_confirmation: string }) => api.put('/auth/password', data),
    });
}
