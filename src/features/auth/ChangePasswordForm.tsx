import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from './AuthContext';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual.'),
    newPassword: z
      .string()
      .min(1, 'Ingresa una nueva contraseña.')
      .min(12, 'La nueva contraseña debe tener al menos 12 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña.'),
  })
  .superRefine(({ currentPassword, newPassword, confirmPassword }, context) => {
    if (currentPassword && newPassword && currentPassword === newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La nueva contraseña debe ser distinta de la actual.',
        path: ['newPassword'],
      });
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las contraseñas nuevas no coinciden.',
        path: ['confirmPassword'],
      });
    }
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { changePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [signOutWarning, setSignOutWarning] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const finishSignOut = async () => {
    setSignOutWarning(null);
    setIsSigningOut(true);
    const signOutResult = await signOut();

    if (signOutResult.sessionEnded) {
      navigate('/docente/ingresar', { replace: true });
      return;
    }

    setIsSigningOut(false);
    setSignOutWarning(
      'La contraseña fue actualizada, pero no pudimos cerrar la sesión automáticamente.',
    );
  };

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    setFormError(null);

    const changeResult = await changePassword(currentPassword, newPassword);
    if (changeResult.error) {
      setFormError(changeResult.error);
      return;
    }

    reset();
    setPasswordChanged(true);
    await finishSignOut();
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Cuenta docente"
        title="Cambiar contraseña"
        lead="Al terminar se cierra la sesión y tendrás que ingresar con la contraseña nueva."
      />

      {passwordChanged ? (
        <section className="card stack" aria-label="Cierre de sesión pendiente">
          {signOutWarning ? (
            <>
              <Notice tone="warning" role="alert">
                {signOutWarning}
              </Notice>
              <p className="text-muted text-small">
                Puedes reintentar aquí. Si tampoco funciona, cierra el navegador: la contraseña
                nueva ya está activa.
              </p>
              <div className="cluster">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void finishSignOut()}
                  disabled={isSigningOut}
                >
                  Reintentar cerrar sesión
                </button>
              </div>
            </>
          ) : (
            <p role="status" className="loading">
              Cerrando sesión…
            </p>
          )}
        </section>
      ) : (
        <div className="card">
          <form
            className="form"
            onSubmit={handleSubmit(onSubmit)}
            aria-label="Cambio de contraseña docente"
            noValidate
          >
            <div className="field">
              <label htmlFor="current-password">Contraseña actual</label>
              <input
                id="current-password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={Boolean(errors.currentPassword)}
                aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p id="current-password-error" role="alert" className="field__error">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={errors.newPassword ? 'new-password-error' : 'new-password-hint'}
                {...register('newPassword')}
              />
              {errors.newPassword ? (
                <p id="new-password-error" role="alert" className="field__error">
                  {errors.newPassword.message}
                </p>
              ) : (
                <p id="new-password-hint" className="field__hint">
                  Usa una contraseña nueva de al menos 12 caracteres.
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p id="confirm-password-error" role="alert" className="field__error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {formError && <Notice tone="error">{formError}</Notice>}

            <div className="cluster">
              <button type="submit" className="button button--primary" disabled={isSubmitting}>
                Cambiar contraseña
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
