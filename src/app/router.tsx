import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { RedirectIfAuthenticated } from '../features/auth/RedirectIfAuthenticated';
import { RequireAuth } from '../features/auth/RequireAuth';

const LoginForm = lazy(() =>
  import('../features/auth/LoginForm').then(({ LoginForm: Component }) => ({ default: Component })),
);
const ChangePasswordForm = lazy(() =>
  import('../features/auth/ChangePasswordForm').then(({ ChangePasswordForm: Component }) => ({
    default: Component,
  })),
);
const TeacherHomeScreen = lazy(() =>
  import('../features/auth/TeacherHomeScreen').then(({ TeacherHomeScreen: Component }) => ({
    default: Component,
  })),
);
const ParalelosScreen = lazy(() =>
  import('../features/roster/ParalelosScreen').then(({ ParalelosScreen: Component }) => ({
    default: Component,
  })),
);

function DeferredRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p role="status">Cargando pantalla…</p>}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/evaluacion/:slug"
          element={<PlaceholderScreen title="Acceso a la evaluación" />}
        />
        <Route
          path="/evaluacion/:slug/responder"
          element={<PlaceholderScreen title="Responder evaluación" />}
        />
        <Route
          path="/evaluacion/:slug/entregada"
          element={<PlaceholderScreen title="Entrega recibida" />}
        />

        <Route
          path="/docente/ingresar"
          element={
            <RedirectIfAuthenticated>
              <DeferredRoute>
                <LoginForm />
              </DeferredRoute>
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/docente"
          element={
            <RequireAuth>
              <DeferredRoute>
                <TeacherHomeScreen />
              </DeferredRoute>
            </RequireAuth>
          }
        />
        <Route
          path="/docente/cambiar-contrasena"
          element={
            <RequireAuth>
              <DeferredRoute>
                <ChangePasswordForm />
              </DeferredRoute>
            </RequireAuth>
          }
        />
        <Route
          path="/docente/paralelos"
          element={
            <RequireAuth>
              <DeferredRoute>
                <ParalelosScreen />
              </DeferredRoute>
            </RequireAuth>
          }
        />
        <Route
          path="/docente/evaluacion"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Crear evaluación" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/accesos"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Distribuir accesos" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/respuestas"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Respuestas" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/respuestas/:submissionId"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Revisión de respuesta" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/diagnostico"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Resumen diagnóstico" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/exportar"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Exportar" />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/docente" replace />} />
      </Routes>
    </HashRouter>
  );
}
