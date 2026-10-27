import { BookOpenIcon, ChevronsUpDownIcon, ContactIcon, ExternalLinkIcon, GraduationCapIcon, KeyRoundIcon, LogOutIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { useLogout, useMe } from '@/api/auth';
import { useToken } from '@/api/auth-token';
import { ChangePasswordDialog } from '@/components/admin/ChangePasswordDialog';
import { LoginForm } from '@/components/admin/LoginForm';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminLayout() {
    const token = useToken();
    const { data: me } = useMe();
    const logout = useLogout();
    const location = useLocation();
    const [changingPassword, setChangingPassword] = useState(false);

    if (!token) {
        return <LoginForm />;
    }

    if (!me) {
        return <Skeleton className="m-6 h-96 rounded-xl" />;
    }

    const onUsersPage = location.pathname.startsWith('/admin/profesores');
    const onStudentsPage = location.pathname.startsWith('/admin/alumnos');

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5 font-semibold">
                        <GraduationCapIcon className="size-5 text-primary" />
                        Evaluación CM
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={!onUsersPage && !onStudentsPage}>
                                        <Link to="/admin">
                                            <BookOpenIcon />
                                            {me.role === 'admin' ? 'Cursos' : 'Mis cursos'}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {me.role === 'admin' && (
                                    <>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild isActive={onStudentsPage}>
                                                <Link to="/admin/alumnos">
                                                    <ContactIcon />
                                                    Alumnos
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild isActive={onUsersPage}>
                                                <Link to="/admin/profesores">
                                                    <UsersIcon />
                                                    Profesores
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </>
                                )}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="/" target="_blank" rel="noreferrer">
                                            <ExternalLinkIcon />
                                            Ver sitio de alumnos
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton size="lg">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                            {me.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">{me.name}</span>
                                            <span className="truncate text-xs text-muted-foreground">{me.role === 'admin' ? 'Administrador' : 'Profesor'}</span>
                                        </div>
                                        <ChevronsUpDownIcon className="ml-auto size-4" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                                    <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.email}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setChangingPassword(true)}>
                                        <KeyRoundIcon />
                                        Cambiar contraseña
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => logout.mutate()}>
                                        <LogOutIcon />
                                        Cerrar sesión
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-12 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    <span className="text-sm text-muted-foreground">Panel de profesores</span>
                </header>
                <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
                    <Outlet />
                </div>
            </SidebarInset>
            <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
        </SidebarProvider>
    );
}
