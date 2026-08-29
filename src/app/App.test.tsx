import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

const fakeAuthClient = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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
});
