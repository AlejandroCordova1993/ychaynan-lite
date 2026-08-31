import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider } from './AuthContext';
import { RequireAuth } from './RequireAuth';
import { TeacherHomeScreen } from './TeacherHomeScreen';

function renderProtected(session: Session | null) {
  const client = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  } as unknown as SupabaseClient;

  const view = render(
    <MemoryRouter initialEntries={['/protegida']}>
      <AuthProvider client={client}>
        <Routes>
          <Route path="/docente/ingresar" element={<p>pantalla de ingreso</p>} />
          <Route
            path="/protegida"
            element={
              <RequireAuth>
                <p>contenido protegido</p>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

  return { ...view, client };
}

describe('RequireAuth', () => {
  it('muestra un mensaje claro cuando la sesión no tiene rol docente', async () => {
    renderProtected({
      user: { id: 'u1', app_metadata: { role: 'student' } },
    } as unknown as Session);

    expect(
      await screen.findByRole('heading', { name: 'Esta cuenta no tiene rol docente' }),
    ).toBeInTheDocument();
  });

  it('permite cerrar sesión cuando la cuenta no tiene rol docente', async () => {
    const { client } = renderProtected({
      user: { id: 'u1', app_metadata: { role: 'student' } },
    } as unknown as Session);

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('renderiza el contenido protegido cuando la sesión tiene rol docente', async () => {
    renderProtected({
      user: { id: 'u1', app_metadata: { role: 'teacher' } },
    } as unknown as Session);

    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
  });

  it('presenta la ruta disponible y separa las fases aún en construcción', () => {
    render(
      <MemoryRouter>
        <TeacherHomeScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Paralelos y nómina' })).toHaveAttribute(
      'href',
      '/docente/paralelos',
    );
    expect(screen.getAllByText('En construcción')).toHaveLength(5);
  });
});
