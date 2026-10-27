import { GraduationCapIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useLogin } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useLogin();
    const error = login.error ? errorMessage(login.error, 'No se pudo iniciar sesión.') : null;

    function submit(event: FormEvent) {
        event.preventDefault();
        login.mutate({ email: email.trim(), password });
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GraduationCapIcon className="size-5" />
                    </div>
                    <CardTitle>Panel de profesores</CardTitle>
                    <CardDescription>Ingresa con tu correo y contraseña para gestionar tus cursos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit}>
                        <FieldGroup>
                            <Field data-invalid={error !== null}>
                                <FieldLabel htmlFor="email">Correo</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    autoFocus
                                    autoComplete="username"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    aria-invalid={error !== null}
                                    required
                                />
                            </Field>
                            <Field data-invalid={error !== null}>
                                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    aria-invalid={error !== null}
                                    required
                                />
                                {error && <FieldError>{error}</FieldError>}
                            </Field>
                            <Button type="submit" disabled={login.isPending || email.trim() === '' || password === ''}>
                                {login.isPending && <Spinner />}
                                Ingresar
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
