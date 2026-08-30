import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Explode(): never {
  throw new Error('fallo simulado');
}

describe('ErrorBoundary', () => {
  it('muestra un mensaje general de recuperación cuando un hijo lanza durante el render', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'No se pudo iniciar la aplicación' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/recarga la página/i)).toBeInTheDocument();
    // Orienta hacia la causa más probable sin afirmarla ni nombrar variables
    // concretas, porque el mismo límite cubre toda la aplicación.
    expect(screen.getByText(/configuración incompleta/i)).toBeInTheDocument();
    expect(screen.queryByText(/VITE_SUPABASE/i)).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('renderiza los hijos normalmente cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenido normal')).toBeInTheDocument();
  });
});
