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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    setFormError(null);

    const changeResult = await changePassword(currentPassword, newPassword);
    if (changeResult.error) {
      setFormError(changeResult.error);
      return;
    }

    const signOutResult = await signOut();
    if (signOutResult.error) {
      setFormError(signOutResult.error);
      return;
    }

    navigate('/docente/ingresar', {
      replace: true,
      state: { passwordChanged: true },
    });
  };

  return (
    <main>
      <h1>Cambiar contraseña</h1>
      <p>Usa una contraseña nueva de al menos 12 caracteres.</p>

      <form onSubmit={handleSubmit(onSubmit)} aria-label="Cambio de contraseña docente" noValidate>
        <label htmlFor="current-password">Contraseña actual</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
        />
        {errors.currentPassword && <p role="alert">{errors.currentPassword.message}</p>}

        <label htmlFor="new-password">Nueva contraseña</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
        />
        {errors.newPassword && <p role="alert">{errors.newPassword.message}</p>}

        <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && <p role="alert">{errors.confirmPassword.message}</p>}

        {formError && <p role="alert">{formError}</p>}

        <button type="submit" disabled={isSubmitting}>
          Cambiar contraseña
        </button>
      </form>
    </main>
  );
}
