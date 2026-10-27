import { useSyncExternalStore } from 'react';

// The panel session token. Kept in localStorage so a teacher stays signed in
// across tabs and reloads until it expires (7 days) or they sign out.
const STORAGE_KEY = 'panel-token';
const listeners = new Set<() => void>();
let memoryToken: string | null = null;

function read(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return memoryToken;
    }
}

export function getToken(): string | null {
    return read();
}

export function setToken(token: string | null): void {
    memoryToken = token;

    try {
        if (token === null) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, token);
        }
    } catch {
        // Storage unavailable (private mode): the in-memory copy is enough for this tab.
    }

    listeners.forEach((listener) => listener());
}

export function useToken(): string | null {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        read,
        () => null,
    );
}
