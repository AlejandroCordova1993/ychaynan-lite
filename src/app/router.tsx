import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { LoginForm } from '../features/auth/LoginForm';
import { RedirectIfAuthenticated } from '../features/auth/RedirectIfAuthenticated';
import { RequireAuth } from '../features/auth/RequireAuth';
import { ParalelosScreen } from '../features/roster/ParalelosScreen';

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
              <LoginForm />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/docente"
          element={
            <RequireAuth>
              <PlaceholderScreen title="Inicio docente" />
            </RequireAuth>
          }
        />
        <Route
          path="/docente/paralelos"
          element={
            <RequireAuth>
              <ParalelosScreen />
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
