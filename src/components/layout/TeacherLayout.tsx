import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { BrandLockup } from './BrandLockup';
import { Notice } from './Notice';

/**
 * Cromo del panel docente: navegación corta (guía §20), acciones de cuenta
 * discretas a la derecha y una sola región `main` por pantalla.
 */
export function TeacherLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [signOutWarning, setSignOutWarning] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSignOutWarning(null);
    setSigningOut(true);
    const { sessionEnded } = await signOut();
    // Si la sesión local sobrevive, la pantalla no cambia sola: sin este aviso
    // el botón parecería no hacer nada.
    if (!sessionEnded) {
      setSigningOut(false);
      setSignOutWarning('No pudimos cerrar la sesión. Inténtalo nuevamente.');
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <Link className="brand" to="/docente" aria-label="Ychayñan Lite, ir al inicio">
            <BrandLockup />
          </Link>

          <nav className="app-header__nav" aria-label="Secciones del panel docente">
            <NavLink className="nav-link" to="/docente" end>
              Inicio
            </NavLink>
            <NavLink className="nav-link" to="/docente/paralelos">
              Paralelos
            </NavLink>
          </nav>

          <div className="app-header__account">
            <Link className="nav-link" to="/docente/cambiar-contrasena">
              Cambiar contraseña
            </Link>
            <button
              type="button"
              className="button button--secondary button--quiet"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main id="contenido" className="app-main">
        {signOutWarning && (
          <div className="app-main__notice">
            <Notice tone="warning" role="alert">
              {signOutWarning}
            </Notice>
          </div>
        )}
        {children}
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>Ychayñan Lite · diagnóstico de lectura y escritura</span>
          <span>Los datos de estudiantes no salen de este panel.</span>
        </div>
      </footer>
    </div>
  );
}
