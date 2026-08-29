import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { App } from './App';

let authStateCallback: ((event: string, session: Session | null) => void) | null = null;

const fakeAuthClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn((callback: (event: string, session: Session | null) => void) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock('../lib/supabase/client', () => ({
  getSupabaseClient: () => fakeAuthClient,
}));

describe('App', () => {
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
    expect(screen.getByRole('heading', { name: 'Inicio docente' })).toBeInTheDocument();
  });
});
