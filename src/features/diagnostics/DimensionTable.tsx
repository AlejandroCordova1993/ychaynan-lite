/**
 * Tabla de las cuatro dimensiones del §5.4: promedio, estudiantes medidos,
 * juicios aplicables y cobertura.
 *
 * Presentación pura. Las filas llegan calculadas por `computeDiagnosticMetrics`;
 * aquí solo se redondea el promedio a dos decimales y se reordenan las filas.
 */
import { SortableHeader } from './SortableHeader';
import {
  DIMENSION_LABELS,
  compareNullableNumber,
  compareText,
  formatAverage,
  useTableSort,
  type SortableColumn,
} from './diagnosticPresentation';
import type { GroupDimensionStat } from './diagnosticMetrics';

type ColumnKey = 'dimension' | 'average' | 'students' | 'judgments';

const COLUMNS: readonly SortableColumn<GroupDimensionStat, ColumnKey>[] = [
  {
    key: 'dimension',
    header: 'Dimensión',
    compare: (a, b) => compareText(DIMENSION_LABELS[a.dimension], DIMENSION_LABELS[b.dimension]),
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
    key: 'judgments',
    header: 'Juicios aplicables',
    compare: (a, b) => a.applicableJudgments - b.applicableJudgments,
    initialDirection: 'desc',
  },
];

export interface DimensionTableProps {
  dimensions: readonly GroupDimensionStat[];
  /** Estudiantes con acceso, para expresar la cobertura como proporción. */
  studentsExpected: number;
}

export function DimensionTable({ dimensions, studentsExpected }: DimensionTableProps) {
  const { rows, sort, toggle } = useTableSort(dimensions, COLUMNS, {
    key: 'dimension',
    direction: 'asc',
  });

  return (
    <div className="table-scroll">
      <table className="table">
        <caption>Dimensiones</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <SortableHeader
                key={column.key}
                column={column}
                sort={sort}
                onToggle={toggle}
                className={column.key === 'dimension' ? undefined : 'table__number'}
              />
            ))}
            <th scope="col">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension}>
              <th scope="row">{DIMENSION_LABELS[row.dimension]}</th>
              <td className="table__number">{formatAverage(row.average)}</td>
              <td className="table__number">{row.studentsMeasured}</td>
              <td className="table__number">{row.applicableJudgments}</td>
              <td>
                {row.studentsMeasured} de {studentsExpected} estudiantes · {row.notApplicable}{' '}
                juicios «no aplica»
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
