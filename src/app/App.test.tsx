import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { App } from './App';

let authStateCallback: ((event: string, session: Session | null) => void) | null = null;
let currentSession: Session | null = null;

type FakeAuthError = { message: string };
type FakeUpdateUserResult = {
  data: { user: Session['user'] | null };
  error: FakeAuthError | null;
};
type FakeSignOutResult = { error: FakeAuthError | null };

const updateUser = vi.fn<(attributes?: unknown) => Promise<FakeUpdateUserResult>>(
  (): Promise<FakeUpdateUserResult> =>
    Promise.resolve({ data: { user: currentSession?.user ?? null }, error: null }),
);
const signOut = vi.fn((): Promise<FakeSignOutResult> => Promise.resolve({ error: null }));

const fakeAuthClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: currentSession }, error: null })),
    onAuthStateChange: vi.fn((callback: (event: string, session: Session | null) => void) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithPassword: vi.fn(),
    updateUser,
    signOut,
  },
};

vi.mock('../lib/supabase/client', () => ({
  getSupabaseClient: () => fakeAuthClient,
}));

const teacherSession = {
  user: { id: 'u1', app_metadata: { role: 'teacher' } },
} as unknown as Session;

function openHash(path: string) {
  window.location.hash = `#${path}`;
}

async function renderPasswordForm() {
  currentSession = teacherSession;
  openHash('/docente/cambiar-contrasena');
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('form', { name: 'Cambio de contraseña docente' });
  return user;
}

async function fillPasswordForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    currentPassword = 'actual-secreta',
    newPassword = 'nueva-secreta-2026',
    confirmPassword = newPassword,
  }: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  } = {},
) {
  await user.type(screen.getByLabelText('Contraseña actual'), currentPassword);
  await user.type(screen.getByLabelText('Nueva contraseña'), newPassword);
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), confirmPassword);
}

describe('App', () => {
  beforeEach(() => {
    currentSession = null;
    authStateCallback = null;
    openHash('/');
    vi.clearAllMocks();
    fakeAuthClient.auth.updateUser.mockImplementation(() =>
      Promise.resolve({ data: { user: currentSession?.user ?? null }, error: null }),
    );
    fakeAuthClient.auth.signOut.mockImplementation(() => {
      currentSession = null;
      authStateCallback?.('SIGNED_OUT', null);
      return Promise.resolve({ error: null });
    });
  });

  it('redirige a una visitante sin sesión hacia el formulario de ingreso docente', async () => {
    render(<App />);
    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
  });

  it('sale del formulario de ingreso y llega al panel docente cuando aparece una sesión con rol docente', async () => {
    render(<App />);
    await screen.findByRole('form', { name: 'Ingreso docente' });

    act(() => {
      authStateCallback?.('SIGNED_IN', {
        user: { id: 'u1', app_metadata: { role: 'teacher' } },
      } as unknown as Session);
    });

    await waitFor(() => {
      expect(screen.queryByRole('form', { name: 'Ingreso docente' })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { name: 'Inicio docente' })).toBeInTheDocument();
  });

  it('muestra un enlace discreto para cambiar la contraseña desde el inicio docente', async () => {
    currentSession = teacherSession;
    openHash('/docente');
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('link', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('protege la ruta de cambio de contraseña cuando no hay sesión', async () => {
    openHash('/docente/cambiar-contrasena');
    render(<App />);

    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
    expect(
      screen.queryByRole('form', { name: 'Cambio de contraseña docente' }),
    ).not.toBeInTheDocument();
  });

  it('exige los tres campos del cambio de contraseña', async () => {
    const user = await renderPasswordForm();

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    const currentPassword = screen.getByLabelText('Contraseña actual');
    const newPassword = screen.getByLabelText('Nueva contraseña');
    const confirmPassword = screen.getByLabelText('Confirmar nueva contraseña');
    const currentError = screen.getByText('Ingresa tu contraseña actual.');
    const newError = screen.getByText('Ingresa una nueva contraseña.');
    const confirmError = screen.getByText('Confirma tu nueva contraseña.');

    for (const [field, error] of [
      [currentPassword, currentError],
      [newPassword, newError],
      [confirmPassword, confirmError],
    ] as const) {
      expect(field).toBeRequired();
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAttribute('aria-describedby', error.id);
      expect(error.id).not.toBe('');
    }
    expect(fakeAuthClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('exige que la nueva contraseña tenga al menos 12 caracteres', async () => {
    const user = await renderPasswordForm();
    await fillPasswordForm(user, { newPassword: 'muy-corta' });

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(
      screen.getByText('La nueva contraseña debe tener al menos 12 caracteres.'),
    ).toBeInTheDocument();
    expect(fakeAuthClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('rechaza reutilizar la contraseña actual', async () => {
    const user = await renderPasswordForm();
    await fillPasswordForm(user, {
      currentPassword: 'misma-secreta-2026',
      newPassword: 'misma-secreta-2026',
    });

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(
      screen.getByText('La nueva contraseña debe ser distinta de la actual.'),
    ).toBeInTheDocument();
    expect(fakeAuthClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('exige que la confirmación coincida con la nueva contraseña', async () => {
    const user = await renderPasswordForm();
    await fillPasswordForm(user, { confirmPassword: 'otra-secreta-2026' });

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(screen.getByText('Las contraseñas nuevas no coinciden.')).toBeInTheDocument();
    expect(fakeAuthClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('envía el payload exacto, cierra sesión y confirma el cambio en el ingreso', async () => {
    const user = await renderPasswordForm();
    await fillPasswordForm(user);

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => {
      expect(fakeAuthClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'nueva-secreta-2026',
        current_password: 'actual-secreta',
      });
    });
    expect(fakeAuthClient.auth.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
    expect(screen.getByText('Contraseña actualizada. Ingresa nuevamente.')).toBeInTheDocument();
  });

  it('no filtra el detalle técnico cuando Supabase rechaza la actualización', async () => {
    fakeAuthClient.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'old password was incorrect: proveedor secreto' },
    });
    const user = await renderPasswordForm();
    await fillPasswordForm(user);

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(
      await screen.findByText('No pudimos cambiar la contraseña. Inténtalo nuevamente.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/proveedor secreto/i)).not.toBeInTheDocument();
    expect(fakeAuthClient.auth.signOut).not.toHaveBeenCalled();
  });

  it('confirma el cambio si signOut devuelve error después de emitir SIGNED_OUT', async () => {
    fakeAuthClient.auth.signOut.mockImplementationOnce(() => {
      currentSession = null;
      authStateCallback?.('SIGNED_OUT', null);
      return Promise.resolve({ error: { message: 'fallo remoto después del cierre local' } });
    });
    const user = await renderPasswordForm();
    await fillPasswordForm(user);

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
    expect(screen.getByText('Contraseña actualizada. Ingresa nuevamente.')).toBeInTheDocument();
    expect(screen.queryByText(/fallo remoto/i)).not.toBeInTheDocument();
  });

  it('advierte y permite reintentar si el error de signOut conserva la sesión local', async () => {
    fakeAuthClient.auth.signOut.mockResolvedValueOnce({
      error: { message: 'fallo remoto con sesión activa' },
    });
    const user = await renderPasswordForm();
    await fillPasswordForm(user);

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(
      await screen.findByText(
        'La contraseña fue actualizada, pero no pudimos cerrar la sesión automáticamente.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fallo remoto/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar cerrar sesión' }));

    expect(fakeAuthClient.auth.updateUser).toHaveBeenCalledTimes(1);
    expect(fakeAuthClient.auth.signOut).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('form', { name: 'Ingreso docente' })).toBeInTheDocument();
    expect(screen.getByText('Contraseña actualizada. Ingresa nuevamente.')).toBeInTheDocument();
  });
});
