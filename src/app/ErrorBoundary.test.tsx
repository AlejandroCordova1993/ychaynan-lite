import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Explode(): never {
  throw new Error('fallo simulado');
}

describe('ErrorBoundary', () => {
  it('muestra un mensaje de configuración cuando un hijo lanza durante el render', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'No se pudo iniciar la aplicación' }),
    ).toBeInTheDocument();
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
