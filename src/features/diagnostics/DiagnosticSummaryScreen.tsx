/**
 * Pantalla «Resumen diagnóstico» (spec §5).
 *
 * Compone los filtros compartidos y los componentes de presentación en el orden
 * de lectura del §5. No calcula ningún agregado: todo llega de
 * `computeDiagnosticMetrics`, que a su vez deriva la procedencia y los problemas
 * de contrato de `applyEffectiveResult`. Cambiar la fuente de resultados no
 * vuelve a consultar la base: filtra el informe ya cargado. Cambiar evaluación o
 * paralelo invalida el informe anterior antes de mostrar el siguiente (§9).
 */
import { useMemo } from 'react';
import './diagnostics.css';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { CoverageCards } from './CoverageCards';
import { CriteriaTable } from './CriteriaTable';
import { DiagnosticFilters } from './DiagnosticFilters';
import { DimensionTable } from './DimensionTable';
import { ObservationsTable } from './ObservationsTable';
import { StudentsTable } from './StudentsTable';
import type { GroupCriterionStat } from './diagnosticMetrics';
import {
  ASSESSMENT_STATUS_LABELS,
  formatAverage,
  formatDateTime,
  selectedSourceCounts,
  rubricLabel,
} from './diagnosticPresentation';
import { useDiagnosticReport } from './useDiagnosticReport';

/** §5.6: menos de tres estudiantes medidos no etiqueta falencia ni fortaleza. */
const MIN_MEASURED_STUDENTS = 3;
/** Cuántos criterios destacar; la tabla de criterios ya muestra todos. */
const RANKING_LIMIT = 5;

interface RankingRow {
  stat: GroupCriterionStat;
  average: number;
  /** Juicios en los niveles del extremo correspondiente; solo desempata. */
  tieCount: number;
}

/**
 * Reordena filas ya calculadas. No recalcula promedios ni conteos: el promedio
 * y `levelCounts` vienen de `computeDiagnosticMetrics`.
 */
function rankCriteria(
  criteria: readonly GroupCriterionStat[],
  kind: 'falencias' | 'fortalezas',
): RankingRow[] {
  const rows = criteria.flatMap<RankingRow>((stat) =>
    stat.average === null || stat.studentsMeasured === 0
      ? []
      : [
          {
            stat,
            average: stat.average,
            tieCount:
              kind === 'falencias'
                ? stat.levelCounts[1] + stat.levelCounts[2]
                : stat.levelCounts[3] + stat.levelCounts[4],
          },
        ],
  );
  rows.sort((a, b) => {
    if (a.average !== b.average) {
      return kind === 'falencias' ? a.average - b.average : b.average - a.average;
    }
    return b.tieCount - a.tieCount;
  });
  return rows.slice(0, RANKING_LIMIT);
}

function RankingTable({
  caption,
  rows,
  tieHeader,
}: {
  caption: string;
  rows: RankingRow[];
  tieHeader: string;
}) {
  if (rows.length === 0) {
    return <p className="empty">Todavía no hay criterios medidos en esta selección.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Criterio o módulo</th>
            <th scope="col" className="table__number">
              Promedio (1–4)
            </th>
            <th scope="col" className="table__number">
              Estudiantes medidos
            </th>
            <th scope="col" className="table__number">
              {tieHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stat.id}>
              <th scope="row">{rubricLabel(row.stat.id)}</th>
              <td className="table__number">
                {row.stat.studentsMeasured < MIN_MEASURED_STUDENTS
                  ? 'Muestra insuficiente'
                  : formatAverage(row.average)}
              </td>
              <td className="table__number">{row.stat.studentsMeasured}</td>
              <td className="table__number">{row.tieCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DiagnosticSummaryScreen() {
  const { selection, fullMetrics, metrics, loading, error, onSelectionChange } =
    useDiagnosticReport();

  const selectedCounts = metrics
    ? selectedSourceCounts(metrics.students, selection?.source ?? 'todos')
    : { provisional: 0, reviewed: 0, total: 0 };
  const usable = selectedCounts.total;
  const falencias = useMemo(
    () => (metrics ? rankCriteria(metrics.criteria, 'falencias') : []),
    [metrics],
  );
  const fortalezas = useMemo(
    () => (metrics ? rankCriteria(metrics.criteria, 'fortalezas') : []),
    [metrics],
  );
  const contractErrors = fullMetrics?.contractErrors ?? [];
  const namesById = new Map(
    (fullMetrics?.students ?? []).map((item) => [item.studentId, item.studentName]),
  );

  return (
    <div className="diagnostic-summary stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · resultados"
        title="Resumen diagnóstico"
        lead="Elige una evaluación aplicada y un paralelo para leer sus resultados. No se presenta una nota global: se priorizan las cuatro dimensiones, los criterios y la cobertura."
      />
      <DiagnosticFilters onSelectionChange={onSelectionChange} disabled={loading} />
      {loading && <p role="status">Cargando el resumen diagnóstico…</p>}
      {error && (
        <Notice tone="error">
          No pudimos cargar el resumen de este paralelo. Vuelve a elegir la evaluación o actualiza
          la página para intentarlo nuevamente.
        </Notice>
      )}
      {!loading && !error && fullMetrics && metrics && (
        <>
          <section className="stack" aria-label="Datos del corte">
            <dl className="cluster">
              <div>
                <dt className="mono-label">Evaluación</dt>
                <dd>{fullMetrics.assessment.title}</dd>
              </div>
              <div>
                <dt className="mono-label">Paralelo</dt>
                <dd>{fullMetrics.group.name}</dd>
              </div>
              <div>
                <dt className="mono-label">Estado de la evaluación</dt>
                <dd>
                  {ASSESSMENT_STATUS_LABELS[fullMetrics.assessment.status] ??
                    fullMetrics.assessment.status}
                </dd>
              </div>
              <div>
                <dt className="mono-label">Fecha de corte</dt>
                <dd>{formatDateTime(fullMetrics.loadedAt)}</dd>
              </div>
            </dl>
          </section>
          {selectedCounts.provisional > 0 ? (
            <Notice tone="warning">
              Resultados mixtos: contienen evaluación provisional de IA
            </Notice>
          ) : selectedCounts.reviewed > 0 ? (
            <Notice tone="success">
              Resultados revisados por la docente: todos los niveles vigentes fueron confirmados o
              ajustados.
            </Notice>
          ) : (
            <Notice tone="info">
              Esta selección no contiene ningún resultado utilizable de IA.
            </Notice>
          )}
          {contractErrors.length > 0 && (
            <Notice tone="error">
              {contractErrors.length} entrega(s) con una salida de IA que viola el contrato:{' '}
              {contractErrors
                .map((item) => namesById.get(item.studentId) ?? item.studentId)
                .join(', ')}
              . Reevalúa o descarta cada una desde el detalle de la entrega y vuelve a cargar el
              informe; no se excluyen en silencio de los promedios.
            </Notice>
          )}
          <CoverageCards coverage={fullMetrics.coverage} />
          {fullMetrics.coverage.expected === 0 ? (
            <p className="empty">
              Este paralelo no tiene estudiantes con acceso a la evaluación seleccionada.
            </p>
          ) : usable === 0 ? (
            <>
              <Notice tone="warning">
                No hay resultados utilizables con esta selección: las tablas de desempeño quedan
                vacías hasta que existan evaluaciones completadas o revisadas.
              </Notice>
              <section className="stack" aria-label="Estudiantes">
                <h2>Por estudiante</h2>
                <StudentsTable students={metrics.students} />
              </section>
            </>
          ) : (
            <>
              <p className="text-small text-muted">
                Las tablas se ordenan desde sus encabezados. El orden solo cambia la lectura; nunca
                los cálculos.
              </p>
              <section className="stack" aria-label="Dimensiones">
                <h2>Dimensiones</h2>
                <DimensionTable
                  dimensions={metrics.dimensions}
                  studentsExpected={metrics.coverage.expected}
                />
              </section>
              <section className="stack" aria-label="Criterios">
                <h2>Criterios</h2>
                <CriteriaTable criteria={metrics.criteria} />
              </section>
              <section className="stack" aria-label="Falencias frecuentes">
                <h2>Falencias frecuentes</h2>
                <RankingTable
                  caption="Falencias frecuentes"
                  rows={falencias}
                  tieHeader="Juicios en niveles 1–2"
                />
              </section>
              <section className="stack" aria-label="Fortalezas">
                <h2>Fortalezas</h2>
                <RankingTable
                  caption="Fortalezas"
                  rows={fortalezas}
                  tieHeader="Juicios en niveles 3–4"
                />
              </section>
              <section className="stack" aria-label="Observaciones de IA">
                <h2>Observaciones IA frecuentes</h2>
                <ObservationsTable observations={metrics.observations} />
              </section>
              <section className="stack" aria-label="Estudiantes">
                <h2>Por estudiante</h2>
                <StudentsTable students={metrics.students} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
