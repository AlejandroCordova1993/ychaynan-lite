import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup';
import { SkipLink } from './SkipLink';

/**
 * Pantalla estudiantil: sin menú general y con encabezado discreto (guía §20).
 * No muestra puntajes, niveles ni comentarios en ningún estado.
 */
export function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <SkipLink />

      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            <BrandLockup />
          </span>
        </div>
      </header>

      <main id="contenido" className="app-main app-main--reading" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
