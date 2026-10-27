import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { useChangePassword } from '@/api/auth';
import { validationErrors } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const empty = { current_password: '', password: '', password_confirmation: '' };

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [values, setValues] = useState(empty);
    const change = useChangePassword();
    const errors = validationErrors(change.error);

    function submit(event: FormEvent) {
        event.preventDefault();
        change.mutate(values, {
            onSuccess: () => {
                toast.success('Contraseña actualizada. Se cerraron tus otras sesiones.');
                close(false);
            },
        });
    }

    function close(next: boolean) {
        onOpenChange(next);
        setValues(empty);
        change.reset();
    }

    const field = (name: keyof typeof empty, label: string, autoComplete: string) => (
        <Field data-invalid={!!errors[name]}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <Input
                id={name}
                type="password"
                autoComplete={autoComplete}
                value={values[name]}
                onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                aria-invalid={!!errors[name]}
                required
            />
            {errors[name] && <FieldError>{errors[name][0]}</FieldError>}
        </Field>
    );

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Cambiar contraseña</DialogTitle>
                        <DialogDescription>Mínimo 8 caracteres.</DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="py-4">
                        {field('current_password', 'Contraseña actual', 'current-password')}
                        {field('password', 'Nueva contraseña', 'new-password')}
                        {field('password_confirmation', 'Repite la nueva contraseña', 'new-password')}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit" disabled={change.isPending}>
                            {change.isPending && <Spinner />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
