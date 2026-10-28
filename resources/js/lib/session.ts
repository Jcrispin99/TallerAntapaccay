// Small per-tab conveniences (resume an attempt, keep a draft). Nothing here is required:
// if storage is unavailable the page still works, it just forgets on reload.

export function readSession<T>(key: string): T | null {
    try {
        const raw = sessionStorage.getItem(key);
        return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
        return null;
    }
}

export function writeSession(key: string, value: unknown): void {
    try {
        if (value === null) {
            sessionStorage.removeItem(key);
        } else {
            sessionStorage.setItem(key, JSON.stringify(value));
        }
    } catch {
        // Ignore: storage full or disabled.
    }
}

/** The student identified on a course page (a Learner), shared by every course in the tab. */
export const LEARNER_KEY = 'learner';
