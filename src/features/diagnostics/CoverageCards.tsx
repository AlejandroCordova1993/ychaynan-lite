/**
 * Tarjetas de cobertura del §5.3: esperados, entregados, evaluados utilizables
 * y revisados.
 *
 * Presentación pura: cada cifra la clasificó `computeDiagnosticMetrics`. La
 * única operación aritmética es unir las dos categorías utilizables
 * (`provisional` + `reviewed`) que el motor ya separó; ninguna regla de
 * clasificación se reimplementa aquí.
 */
import type { CoverageStats } from './diagnosticMetrics';

export interface CoverageCardsProps {
  coverage: CoverageStats;
}

export function CoverageCards({ coverage }: CoverageCardsProps) {
  const usable = coverage.provisional + coverage.reviewed;
  const cards = [
    {
      label: 'Estudiantes esperados',
      value: coverage.expected,
      hint: 'Con acceso a la evaluación',
    },
    {
      label: 'Entregas realizadas',
      value: coverage.submitted,
      hint: `${coverage.started} iniciaron`,
    },
    {
      label: 'Evaluaciones utilizables',
      value: usable,
      hint: `${coverage.provisional} provisionales · ${coverage.reviewed} revisadas`,
    },
    {
      label: 'Revisadas por la docente',
      value: coverage.reviewed,
      hint: 'Resultado con ajustes docentes aplicados',
    },
  ];

  return (
    <section className="stack" aria-label="Cobertura del paralelo">
      <h2>Cobertura</h2>
      <ul className="section-grid">
        {cards.map((card) => (
          <li className="section-card" key={card.label}>
            <p className="mono-label">{card.label}</p>
            <p className="table__number">{card.value}</p>
            <p className="text-small text-muted">{card.hint}</p>
          </li>
        ))}
      </ul>
      <p className="text-small text-muted">
        Sin evaluación utilizable: {coverage.withoutUsableEvaluation} · Descartadas:{' '}
        {coverage.discarded} · Fallidas: {coverage.failed} · En curso: {coverage.inProgress}.
      </p>
    </section>
  );
}
