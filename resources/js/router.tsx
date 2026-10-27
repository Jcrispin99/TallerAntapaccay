import { createBrowserRouter } from 'react-router';

import { PublicLayout } from '@/layouts/PublicLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CatalogPage } from '@/pages/public/CatalogPage';
import { CoursePage } from '@/pages/public/CoursePage';
import { EvaluationPage } from '@/pages/public/EvaluationPage';
import { ResultPage } from '@/pages/public/ResultPage';

export const router = createBrowserRouter([
    {
        element: <PublicLayout />,
        children: [
            { index: true, element: <CatalogPage /> },
            { path: 'cursos/:slug', element: <CoursePage /> },
            { path: 'cursos/:slug/evaluacion', element: <EvaluationPage /> },
            { path: 'resultado/:token', element: <ResultPage /> },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
    {
        // Students never download the admin code.
        path: 'admin',
        lazy: async () => ({ Component: (await import('@/layouts/AdminLayout')).AdminLayout }),
        children: [
            { index: true, lazy: async () => ({ Component: (await import('@/pages/admin/CoursesPage')).CoursesPage }) },
            { path: 'cursos/:id', lazy: async () => ({ Component: (await import('@/pages/admin/CourseEditPage')).CourseEditPage }) },
            { path: 'profesores', lazy: async () => ({ Component: (await import('@/pages/admin/UsersPage')).UsersPage }) },
            { path: 'alumnos', lazy: async () => ({ Component: (await import('@/pages/admin/StudentsPage')).StudentsPage }) },
        ],
    },
]);
