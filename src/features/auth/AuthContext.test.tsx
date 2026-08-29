import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './AuthContext';

function fakeSupabaseClient(options: {
  session?: { user: { id: string } } | null;
  signInError?: string | null;
}) {
  return {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: options.session ?? null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ error: options.signInError ? { message: options.signInError } : null }),
      ),
      signOut: vi.fn(() => Promise.resolve()),
    },
  } as unknown as SupabaseClient;
}

function Probe() {
  const { session, loading } = useAuth();
  if (loading) {
    return <p>cargando</p>;
  }
  return <p>{session ? 'con sesion' : 'sin sesion'}</p>;
}

describe('AuthProvider', () => {
  it('empieza cargando y luego expone que no hay sesión', async () => {
    const client = fakeSupabaseClient({ session: null });
    render(
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText('cargando')).toBeInTheDocument();
    expect(await screen.findByText('sin sesion')).toBeInTheDocument();
  });

  it('expone la sesión existente después de cargar', async () => {
    const client = fakeSupabaseClient({ session: { user: { id: 'u1' } } });
    render(
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('con sesion')).toBeInTheDocument();
  });
});
