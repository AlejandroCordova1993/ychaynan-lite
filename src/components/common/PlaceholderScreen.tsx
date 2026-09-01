import { PageHeader } from '../layout/PageHeader';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="stack">
      <PageHeader title={title} />
      <div className="empty">
        <p>Esta pantalla se implementará en una fase posterior.</p>
        <p className="text-small">
          El esquema y los contratos ya están definidos; falta la lógica de servidor que la
          sostiene.
        </p>
      </div>
    </div>
  );
}
