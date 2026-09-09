import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider } from '../../features/auth/AuthContext';
import { TeacherLayout } from './TeacherLayout';

/**
 * El menú docente es la única puerta de entrada a las pantallas del panel: una
 * ruta implementada que solo se alcanza escribiendo la URL a mano, en la
 * práctica, no existe para quien la usa.
 */
function renderLayout() {
  const client = {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'u1', app_metadata: { role: 'teacher' } },
            } as unknown as Session,
          },
        }),
      ),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  } as unknown as SupabaseClient;

  return render(
    <MemoryRouter>
      <AuthProvider client={client}>
        <TeacherLayout>
          <p>contenido docente</p>
        </TeacherLayout>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir menú docente' }));
  return screen.getByRole('navigation', { name: 'Navegación docente' });
}

describe('TeacherLayout', () => {
  it('enlaza cada pantalla docente implementada, incluidas las del diagnóstico', async () => {
    renderLayout();
    const nav = await openMenu();

    const destino = (name: string) =>
      screen.getByRole('link', { name }).getAttribute('href') ?? null;

    expect(nav).toBeInTheDocument();
    expect(destino('Paralelos y nómina')).toBe('/docente/paralelos');
    expect(destino('Crear evaluación')).toBe('/docente/evaluacion');
    expect(destino('Distribuir accesos')).toBe('/docente/accesos');
    expect(destino('Respuestas')).toBe('/docente/respuestas');
    expect(destino('Resumen diagnóstico')).toBe('/docente/diagnostico');
    expect(destino('Exportar')).toBe('/docente/exportar');
  });

  it('ya no anuncia el diagnóstico como una función pendiente', async () => {
    renderLayout();
    await openMenu();

    expect(screen.queryByText('Próximamente')).toBeNull();
    expect(screen.queryByText('Pronto')).toBeNull();
    expect(screen.queryByText(/se habilitarán por fases/i)).toBeNull();
  });
});
