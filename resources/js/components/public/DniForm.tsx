import { IdCardIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { errorMessage, validationErrors } from '@/api/client';
import { useIdentifyLearner } from '@/api/public';
import { useLearner } from '@/components/public/LearnerContext';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/** Identifies the student by DNI once; every page of the tab then knows who they are. */
export function DniForm({ title, description, className }: { title: string; description: string; className?: string }) {
    const { setLearner } = useLearner();
    const [dni, setDni] = useState('');
    const identify = useIdentifyLearner();
    const dniError = validationErrors(identify.error).dni?.[0] ?? (identify.error ? errorMessage(identify.error) : undefined);

    function submit(event: FormEvent) {
        event.preventDefault();
        identify.mutate(dni.trim(), { onSuccess: (data) => setLearner(data.student) });
    }

    return (
        <section className={cn('rounded-xl bg-card p-5 sm:p-6', className)}>
            <div className="flex items-start gap-3">
                <IdCardIcon className="mt-1 size-6 shrink-0 text-primary" />
                <div className="space-y-1">
                    <h2 className="font-condensed text-2xl font-bold">{title}</h2>
                    <p className="text-muted-foreground">{description}</p>
                </div>
            </div>
            <form onSubmit={submit} className="mt-5 flex flex-wrap items-start gap-3">
                <Field data-invalid={dniError !== undefined} className="w-full max-w-xs">
                    <FieldLabel htmlFor="dni" className="sr-only">
                        DNI
                    </FieldLabel>
                    <Input
                        id="dni"
                        value={dni}
                        onChange={(event) => setDni(event.target.value)}
                        placeholder="Tu DNI"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={12}
                        required
                        aria-invalid={dniError !== undefined}
                        className="h-12 text-lg"
                    />
                    {dniError && <FieldError>{dniError}</FieldError>}
                </Field>
                <Button type="submit" size="lg" className="h-12 px-6 font-condensed text-base font-bold tracking-wide uppercase" disabled={identify.isPending || dni.trim() === ''}>
                    {identify.isPending && <Spinner />}
                    Continuar
                </Button>
            </form>
        </section>
    );
}
