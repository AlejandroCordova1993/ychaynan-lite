/**
 * Observaciones IA frecuentes del §5.8: código, etiqueta legible, frecuencia,
 * severidad y cantidad pendiente de comprobar.
 *
 * Presentación pura. Las observaciones con evidencia localizada y las marcadas
 * `needs_evidence_review` llegan ya separadas por `computeDiagnosticMetrics` y
 * aquí se muestran en columnas distintas: nunca se suman en una sola cifra
 * (§4.2). La severidad se acompaña siempre de texto, no solo de color.
 */
import { SortableHeader } from './SortableHeader';
import {
  SEVERITY_LABELS,
  compareText,
  observationLabel,
  useTableSort,
  type SortableColumn,
} from './diagnosticPresentation';
import type { ObservationStat } from './diagnosticMetrics';

type ColumnKey = 'code' | 'severity' | 'confirmed' | 'pending' | 'students';

const SEVERITY_ORDER: Readonly<Record<ObservationStat['severity'], number>> = {
  low: 1,
  medium: 2,
  high: 3,
};

const COLUMNS: readonly SortableColumn<ObservationStat, ColumnKey>[] = [
  { key: 'code', header: 'Código', compare: (a, b) => compareText(a.code, b.code) },
  {
    key: 'severity',
    header: 'Severidad',
    compare: (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    initialDirection: 'desc',
  },
  {
    key: 'confirmed',
    header: 'Con evidencia localizada',
    compare: (a, b) => a.confirmed - b.confirmed,
    initialDirection: 'desc',
  },
  {
    key: 'pending',
    header: 'Pendiente de comprobar',
    compare: (a, b) => a.needsEvidenceReview - b.needsEvidenceReview,
    initialDirection: 'desc',
  },
  {
    key: 'students',
    header: 'Estudiantes',
    compare: (a, b) => a.students - b.students,
    initialDirection: 'desc',
  },
];

export interface ObservationsTableProps {
  observations: readonly ObservationStat[];
}

export function ObservationsTable({ observations }: ObservationsTableProps) {
  const { rows, sort, toggle } = useTableSort(observations, COLUMNS, {
    key: 'confirmed',
    direction: 'desc',
  });

  if (rows.length === 0) {
    return <p className="empty">La IA no registró observaciones de escritura en esta selección.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="table">
        <caption>
          Observaciones IA frecuentes: localizar evidencia no equivale a confirmación docente.
        </caption>
        <thead>
          <tr>
            <SortableHeader column={COLUMNS[0]} sort={sort} onToggle={toggle} />
            <th scope="col">Etiqueta legible</th>
            <SortableHeader column={COLUMNS[1]} sort={sort} onToggle={toggle} />
            <SortableHeader
              column={COLUMNS[2]}
              sort={sort}
              onToggle={toggle}
              className="table__number"
            />
            <SortableHeader
              column={COLUMNS[3]}
              sort={sort}
              onToggle={toggle}
              className="table__number"
            />
            <SortableHeader
              column={COLUMNS[4]}
              sort={sort}
              onToggle={toggle}
              className="table__number"
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.code}-${row.severity}`}>
              <th scope="row">{row.code}</th>
              <td>{observationLabel(row.code)}</td>
              <td>Severidad {SEVERITY_LABELS[row.severity].toLowerCase()}</td>
              <td className="table__number">{row.confirmed}</td>
              <td className="table__number">{row.needsEvidenceReview}</td>
              <td className="table__number">{row.students}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
