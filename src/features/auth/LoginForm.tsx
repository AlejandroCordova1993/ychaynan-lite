import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Notice } from '../../components/layout/Notice';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn, passwordWasChanged, clearPasswordChangeNotice } = useAuth();
  const [showPasswordChanged] = useState(passwordWasChanged);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (showPasswordChanged) {
      clearPasswordChangeNotice();
    }
  }, [clearPasswordChangeNotice, showPasswordChanged]);

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setFormError(error);
    }
  };

  return (
    <div className="card stack">
      <div className="stack--tight stack">
        <h1>Ingreso docente</h1>
        <p className="text-muted">
          Este panel es solo para la persona docente. Los estudiantes entran por el enlace de la
          evaluación, no por aquí.
        </p>
      </div>

      {showPasswordChanged && (
        <Notice tone="success">Contraseña actualizada. Ingresa nuevamente.</Notice>
      )}

      <form
        className="form"
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Ingreso docente"
        noValidate
      >
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="field__error">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="field__error">
              {errors.password.message}
            </p>
          )}
        </div>

        {formError && <Notice tone="error">{formError}</Notice>}

        <button
          type="submit"
          className="button button--primary button--block"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
