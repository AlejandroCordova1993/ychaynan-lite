import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { AuthLayout } from '../components/layout/AuthLayout';
import { StudentLayout } from '../components/layout/StudentLayout';
import { TeacherLayout } from '../components/layout/TeacherLayout';
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
const AssessmentEditorScreen = lazy(() =>
  import('../features/assessment/AssessmentEditorScreen').then(
    ({ AssessmentEditorScreen: Component }) => ({ default: Component }),
  ),
);
const AccessManagementScreen = lazy(() =>
  import('../features/assessment/AccessManagementScreen').then(
    ({ AccessManagementScreen: Component }) => ({ default: Component }),
  ),
);
const StudentAccessScreen = lazy(() =>
  import('../features/student/StudentAccessScreen').then(({ StudentAccessScreen: Component }) => ({
    default: Component,
  })),
);
const StudentResponseScreen = lazy(() =>
  import('../features/student/StudentResponseScreen').then(
    ({ StudentResponseScreen: Component }) => ({ default: Component }),
  ),
);
const SubmissionReceiptScreen = lazy(() =>
  import('../features/student/SubmissionReceiptScreen').then(
    ({ SubmissionReceiptScreen: Component }) => ({ default: Component }),
  ),
);
const SubmissionListScreen = lazy(() =>
  import('../features/submissions/SubmissionListScreen').then(
    ({ SubmissionListScreen: Component }) => ({ default: Component }),
  ),
);
const SubmissionDetailScreen = lazy(() =>
  import('../features/submissions/SubmissionDetailScreen').then(
    ({ SubmissionDetailScreen: Component }) => ({ default: Component }),
  ),
);

function DeferredRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="loading">
          Cargando pantalla…
        </p>
      }
    >
      {children}
    </Suspense>
  );
}
function teacherRoute(children: ReactNode) {
  return (
    <RequireAuth>
      <TeacherLayout>
        <DeferredRoute>{children}</DeferredRoute>
      </TeacherLayout>
    </RequireAuth>
  );
}
export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/evaluacion/:slug"
          element={
            <StudentLayout>
              <DeferredRoute>
                <StudentAccessScreen />
              </DeferredRoute>
            </StudentLayout>
          }
        />
        <Route
          path="/evaluacion/:slug/responder"
          element={
            <StudentLayout>
              <DeferredRoute>
                <StudentResponseScreen />
              </DeferredRoute>
            </StudentLayout>
          }
        />
        <Route
          path="/evaluacion/:slug/entregada"
          element={
            <StudentLayout>
              <DeferredRoute>
                <SubmissionReceiptScreen />
              </DeferredRoute>
            </StudentLayout>
          }
        />
        <Route
          path="/docente/ingresar"
          element={
            <RedirectIfAuthenticated>
              <AuthLayout>
                <DeferredRoute>
                  <LoginForm />
                </DeferredRoute>
              </AuthLayout>
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/docente" element={teacherRoute(<TeacherHomeScreen />)} />
        <Route path="/docente/cambiar-contrasena" element={teacherRoute(<ChangePasswordForm />)} />
        <Route path="/docente/paralelos" element={teacherRoute(<ParalelosScreen />)} />
        <Route path="/docente/evaluacion" element={teacherRoute(<AssessmentEditorScreen />)} />
        <Route path="/docente/accesos" element={teacherRoute(<AccessManagementScreen />)} />
        <Route path="/docente/respuestas" element={teacherRoute(<SubmissionListScreen />)} />
        <Route
          path="/docente/respuestas/:submissionId"
          element={teacherRoute(<SubmissionDetailScreen />)}
        />
        <Route
          path="/docente/diagnostico"
          element={teacherRoute(<PlaceholderScreen title="Resumen diagnóstico" />)}
        />
        <Route
          path="/docente/exportar"
          element={teacherRoute(<PlaceholderScreen title="Exportar" />)}
        />
        <Route path="*" element={<Navigate to="/docente" replace />} />
      </Routes>
    </HashRouter>
  );
}
