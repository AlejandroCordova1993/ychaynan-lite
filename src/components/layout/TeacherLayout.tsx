import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { BrandLockup } from './BrandLockup';
import { Notice } from './Notice';

const NAV_ITEMS = [
  { label: 'Inicio', to: '/docente', end: true },
  { label: 'Paralelos y nómina', to: '/docente/paralelos', end: false },
  { label: 'Crear evaluación', to: '/docente/evaluacion', end: false },
] as const;

const UPCOMING_ITEMS = [
  'Distribuir accesos',
  'Respuestas',
  'Resumen diagnóstico',
  'Exportar',
] as const;

/**
 * Cromo del panel docente: menú lateral plegable, acciones de cuenta
 * discretas y una sola región `main` por pantalla.
 */
export function TeacherLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutWarning, setSignOutWarning] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const closeMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const closeMenuOnMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 48rem)').matches) {
      closeMenu();
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <button
            type="button"
            className="menu-toggle"
            ref={menuButtonRef}
            aria-controls="menu-docente"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú docente' : 'Abrir menú docente'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          <Link className="brand" to="/docente" aria-label="Ychayñan Lite, ir al inicio">
            <BrandLockup />
          </Link>

          <span className="app-header__context">Panel docente</span>

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

      {menuOpen && (
        <div className="teacher-navigation">
          <aside id="menu-docente" className="teacher-sidebar" aria-label="Menú docente">
            <div className="teacher-sidebar__header">
              <p className="mono-label">Espacio docente</p>
              <button
                type="button"
                className="teacher-sidebar__close"
                aria-label="Cerrar menú docente"
                onClick={closeMenu}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <nav aria-label="Navegación docente">
              <ul className="teacher-sidebar__list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      className={({ isActive }) =>
                        `teacher-sidebar__link${isActive ? ' teacher-sidebar__link--active' : ''}`
                      }
                      to={item.to}
                      end={item.end}
                      onClick={closeMenuOnMobile}
                    >
                      <span className="teacher-sidebar__link-marker" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <section className="teacher-sidebar__section" aria-labelledby="menu-proximamente">
              <p id="menu-proximamente" className="mono-label">
                Próximamente
              </p>
              <ul className="teacher-sidebar__list teacher-sidebar__list--muted">
                {UPCOMING_ITEMS.map((item) => (
                  <li key={item} className="teacher-sidebar__soon-item">
                    <span>{item}</span>
                    <span className="teacher-sidebar__soon-status">Pronto</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="teacher-sidebar__account">
              <p>Las funciones del diagnóstico se habilitarán por fases.</p>
            </div>
          </aside>
          <button
            type="button"
            className="teacher-sidebar__scrim"
            aria-label="Cerrar menú docente"
            onClick={closeMenu}
          />
        </div>
      )}

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
