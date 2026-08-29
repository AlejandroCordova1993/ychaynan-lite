import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setFormError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="Ingreso docente">
      <label htmlFor="email">Correo</label>
      <input id="email" type="email" {...register('email')} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" {...register('password')} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      {formError && <p role="alert">{formError}</p>}

      <button type="submit" disabled={isSubmitting}>
        Ingresar
      </button>
    </form>
  );
}
