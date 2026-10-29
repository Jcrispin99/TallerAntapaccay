import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Learner } from '@/api/types';
import { LEARNER_KEY, readSession, writeSession } from '@/lib/session';

interface LearnerState {
    learner: Learner | null;
    setLearner: (learner: Learner | null) => void;
}

const LearnerContext = createContext<LearnerState | null>(null);

/** The student identified by DNI, shared by every page of the tab. */
export function LearnerProvider({ children }: { children: ReactNode }) {
    const [learner, setState] = useState<Learner | null>(() => readSession<Learner>(LEARNER_KEY));

    const setLearner = useCallback((next: Learner | null) => {
        writeSession(LEARNER_KEY, next);
        setState(next);
    }, []);

    const value = useMemo(() => ({ learner, setLearner }), [learner, setLearner]);

    return <LearnerContext value={value}>{children}</LearnerContext>;
}

export function useLearner(): LearnerState {
    const state = useContext(LearnerContext);

    if (!state) {
        throw new Error('useLearner must be used inside LearnerProvider');
    }

    return state;
}
