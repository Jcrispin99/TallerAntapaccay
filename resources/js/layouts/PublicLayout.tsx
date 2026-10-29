import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';

import { LearnerProvider, useLearner } from '@/components/public/LearnerContext';
import { Button } from '@/components/ui/button';
import { maskDni, personName } from '@/lib/format';

export function PublicLayout() {
    // The students' theme ("Faena") lives on <html> so dialogs and toasts get it too; the panel keeps its own.
    useEffect(() => {
        document.documentElement.classList.add('dark', 'theme-faena');

        return () => document.documentElement.classList.remove('dark', 'theme-faena');
    }, []);

    return (
        <LearnerProvider>
            <div className="min-h-svh bg-background text-foreground">
                <Header />
                <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
                    <Outlet />
                </main>
            </div>
        </LearnerProvider>
    );
}

function Header() {
    const { learner, setLearner } = useLearner();
    const navigate = useNavigate();

    return (
        <header className="border-b">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
                <Link to="/" className="flex items-center gap-2.5">
                    <span className="size-6 rounded-sm bg-primary" aria-hidden="true" />
                    <span className="font-condensed text-lg font-bold tracking-widest">EVALUACIÓN CM</span>
                </Link>
                {learner && (
                    <div className="flex items-center gap-4 text-sm">
                        <span className="hidden text-muted-foreground sm:inline">
                            {personName(learner.full_name).full} · DNI {maskDni(learner.dni)}
                        </span>
                        <Button
                            variant="link"
                            className="h-11 px-0 font-semibold"
                            onClick={() => {
                                setLearner(null);
                                navigate('/');
                            }}
                        >
                            No soy yo
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
}
