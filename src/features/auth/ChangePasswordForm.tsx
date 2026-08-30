import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
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
    <main>
      <h1>Cambiar contraseña</h1>
      {passwordChanged ? (
        <section aria-label="Cierre de sesión pendiente">
          {signOutWarning ? (
            <>
              <p role="alert">{signOutWarning}</p>
              <button type="button" onClick={() => void finishSignOut()} disabled={isSigningOut}>
                Reintentar cerrar sesión
              </button>
            </>
          ) : (
            <p role="status">Cerrando sesión…</p>
          )}
        </section>
      ) : (
        <>
          <p>Usa una contraseña nueva de al menos 12 caracteres.</p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            aria-label="Cambio de contraseña docente"
            noValidate
          >
            <label htmlFor="current-password">Contraseña actual</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p id="current-password-error" role="alert">
                {errors.currentPassword.message}
              </p>
            )}

            <label htmlFor="new-password">Nueva contraseña</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p id="new-password-error" role="alert">
                {errors.newPassword.message}
              </p>
            )}

            <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}

            {formError && <p role="alert">{formError}</p>}

            <button type="submit" disabled={isSubmitting}>
              Cambiar contraseña
            </button>
          </form>
        </>
      )}
    </main>
  );
}
