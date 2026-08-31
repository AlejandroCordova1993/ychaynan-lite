import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup';

/** Pantalla de acceso: sin menú, encabezado discreto y una sola acción. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <main className="app-main app-main--centered">
        <div className="stack">
          <div className="brand">
            <BrandLockup />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
