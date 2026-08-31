/** Estado de carga comprensible y anunciado sin interrumpir (guía §20). */
export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <main className="app-main app-main--centered">
      <p role="status" className="loading">
        {label}
      </p>
    </main>
  );
}
