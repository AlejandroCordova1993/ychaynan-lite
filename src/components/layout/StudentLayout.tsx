import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup';

/**
 * Pantalla estudiantil: sin menú general y con encabezado discreto (guía §20).
 * No muestra puntajes, niveles ni comentarios en ningún estado.
 */
export function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            <BrandLockup />
          </span>
        </div>
      </header>

      <main id="contenido" className="app-main app-main--reading">
        {children}
      </main>
    </div>
  );
}
