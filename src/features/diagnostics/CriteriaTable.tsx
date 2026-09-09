/**
 * Tabla de criterios del §5.5: etiqueta de rúbrica, promedio, niveles 1–4,
 * `no_aplica`, estudiantes medidos y evidencia pendiente de revisión.
 *
 * Presentación pura: las filas y sus conteos llegan de
 * `computeDiagnosticMetrics`; aquí solo se redondea y se reordena.
 */
import { SortableHeader } from './SortableHeader';
import {
  compareNullableNumber,
  compareText,
  formatAverage,
  rubricLabel,
  useTableSort,
  type SortableColumn,
} from './diagnosticPresentation';
import type { GroupCriterionStat } from './diagnosticMetrics';

type ColumnKey = 'criterion' | 'average' | 'students' | 'pending';

const COLUMNS: readonly SortableColumn<GroupCriterionStat, ColumnKey>[] = [
  {
    key: 'criterion',
    header: 'Criterio o módulo',
    compare: (a, b) => compareText(rubricLabel(a.id), rubricLabel(b.id)),
  },
  {
    key: 'average',
    header: 'Promedio (1–4)',
    compare: (a, b) => compareNullableNumber(a.average, b.average),
  },
  {
    key: 'students',
    header: 'Estudiantes medidos',
    compare: (a, b) => a.studentsMeasured - b.studentsMeasured,
    initialDirection: 'desc',
  },
  {
    key: 'pending',
    header: 'Evidencia pendiente',
    compare: (a, b) => a.pendingEvidenceReview - b.pendingEvidenceReview,
    initialDirection: 'desc',
  },
];

export interface CriteriaTableProps {
  criteria: readonly GroupCriterionStat[];
}

export function CriteriaTable({ criteria }: CriteriaTableProps) {
  const { rows, sort, toggle } = useTableSort(criteria, COLUMNS, {
    key: 'criterion',
    direction: 'asc',
  });

  return (
    <div className="table-scroll">
      <table className="table">
        <caption>Criterios de la rúbrica</caption>
        <thead>
          <tr>
            <SortableHeader column={COLUMNS[0]} sort={sort} onToggle={toggle} />
            <SortableHeader
              column={COLUMNS[1]}
              sort={sort}
              onToggle={toggle}
              className="table__number"
            />
            <th scope="col" className="table__number">
              Nivel 1
            </th>
            <th scope="col" className="table__number">
              Nivel 2
            </th>
            <th scope="col" className="table__number">
              Nivel 3
            </th>
            <th scope="col" className="table__number">
              Nivel 4
            </th>
            <th scope="col" className="table__number">
              No aplica
            </th>
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {rubricLabel(row.id)}
                {row.kind === 'module' && <span className="text-small text-muted"> (módulo)</span>}
              </th>
              <td className="table__number">{formatAverage(row.average)}</td>
              <td className="table__number">{row.levelCounts[1]}</td>
              <td className="table__number">{row.levelCounts[2]}</td>
              <td className="table__number">{row.levelCounts[3]}</td>
              <td className="table__number">{row.levelCounts[4]}</td>
              <td className="table__number">{row.notApplicable}</td>
              <td className="table__number">{row.studentsMeasured}</td>
              <td className="table__number">{row.pendingEvidenceReview}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
