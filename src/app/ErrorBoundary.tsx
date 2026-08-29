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
            Revisa que las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén
            configuradas correctamente.
          </p>
        </main>
      );
    }

    return this.props.children;
  }
}
