import { AuthProvider } from '../features/auth/AuthContext';
import { getSupabaseClient } from '../lib/supabase/client';
import { AppRouter } from './router';

export function App() {
  return (
    <AuthProvider client={getSupabaseClient()}>
      <AppRouter />
    </AuthProvider>
  );
}
