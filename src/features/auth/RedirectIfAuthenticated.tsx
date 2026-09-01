import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/layout/LoadingScreen';
import { useAuth } from './AuthContext';

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Navigate to="/docente" replace />;
  }

  return <>{children}</>;
}
