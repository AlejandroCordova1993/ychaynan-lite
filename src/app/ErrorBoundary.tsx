import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Error al iniciar la aplicación:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main>
          <h1>No se pudo iniciar la aplicación</h1>
          <p>
            Ocurrió un error inesperado. La causa más frecuente es una configuración incompleta de
            la aplicación. Recarga la página e inténtalo de nuevo; si el problema continúa, avisa a
            quien administra la aplicación.
          </p>
        </main>
      );
    }

    return this.props.children;
  }
}
