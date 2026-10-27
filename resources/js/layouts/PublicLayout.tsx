import { GraduationCapIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';

export function PublicLayout() {
    return (
        <div className="min-h-svh bg-muted/40">
            <header className="border-b bg-background">
                <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        <GraduationCapIcon className="size-5 text-primary" />
                        Evaluación CM
                    </Link>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">
                <Outlet />
            </main>
        </div>
    );
}
