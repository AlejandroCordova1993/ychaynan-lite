/**
 * Tabla por estudiante del §5.9: estado de entrega y evaluación, preguntas
 * respondidas y omitidas, los cuatro promedios dimensionales y el enlace al
 * detalle de entrega ya existente.
 *
 * Presentación pura. La procedencia y el problema de contrato salen de lo que
 * `computeDiagnosticMetrics` obtuvo de `applyEffectiveResult`; esta tabla nunca
 * consulta `evaluation.contractViolation` ni deduce por su cuenta si un
 * resultado es utilizable. Todos los estados se comunican con texto, no con
 * color.
 */
import { Link } from 'react-router-dom';
import {
  EVALUATION_DIMENSIONS,
  type EvaluationDimension,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { SubmissionOverviewStatus } from '../../lib/api/submissions';
import { SortableHeader } from './SortableHeader';
import {
  DIMENSION_LABELS,
  compareNullableNumber,
  compareText,
  formatAverage,
  useTableSort,
  type SortableColumn,
} from './diagnosticPresentation';
import type { CoverageCategory, StudentMetrics } from './diagnosticMetrics';

const ACCESS_LABELS: Readonly<Record<SubmissionOverviewStatus, string>> = {
  esperado: 'Esperado',
  iniciado: 'Iniciado',
  entregado: 'Entregado',
  bloqueado: 'Bloqueado',
  revocado: 'Revocado',
};

const CATEGORY_LABELS: Readonly<Record<CoverageCategory, string>> = {
  sin_evaluacion_utilizable: 'Sin evaluación utilizable',
  provisional: 'Provisional de IA',
  revisada: 'Revisada por la docente',
  descartada: 'Descartada',
  fallida: 'Falló',
  en_curso: 'En curso',
};

function dimensionAverage(row: StudentMetrics, dimension: EvaluationDimension): number | null {
  return row.dimensions.find((item) => item.dimension === dimension)?.average ?? null;
}

type ColumnKey = 'student' | 'status' | 'answered' | 'omitted' | EvaluationDimension;

const COLUMNS: readonly SortableColumn<StudentMetrics, ColumnKey>[] = [
  {
    key: 'student',
    header: 'Estudiante',
    compare: (a, b) => compareText(a.studentName, b.studentName),
  },
  {
    key: 'status',
    header: 'Estado',
    compare: (a, b) =>
      compareText(ACCESS_LABELS[a.accessStatus], ACCESS_LABELS[b.accessStatus]) ||
      compareText(CATEGORY_LABELS[a.coverageCategory], CATEGORY_LABELS[b.coverageCategory]),
  },
  {
    key: 'answered',
    header: 'Respondidas',
    compare: (a, b) => a.answeredResponses - b.answeredResponses,
    initialDirection: 'desc',
  },
  {
    key: 'omitted',
    header: 'Omitidas',
    compare: (a, b) => a.omittedResponses - b.omittedResponses,
    initialDirection: 'desc',
  },
  ...EVALUATION_DIMENSIONS.map<SortableColumn<StudentMetrics, ColumnKey>>((dimension) => ({
    key: dimension,
    header: DIMENSION_LABELS[dimension],
    compare: (a, b) =>
      compareNullableNumber(dimensionAverage(a, dimension), dimensionAverage(b, dimension)),
  })),
];

export interface StudentsTableProps {
  students: readonly StudentMetrics[];
}

export function StudentsTable({ students }: StudentsTableProps) {
  const { rows, sort, toggle } = useTableSort(students, COLUMNS, {
    key: 'student',
    direction: 'asc',
  });

  return (
    <div className="table-scroll">
      <table className="table">
        <caption>Resultados por estudiante</caption>
        <thead>
          <tr>
            {COLUMNS.map((column, index) => (
              <SortableHeader
                key={column.key}
                column={column}
                sort={sort}
                onToggle={toggle}
                className={index >= 2 ? 'table__number' : undefined}
              />
            ))}
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId}>
              <th scope="row">{row.studentName}</th>
              <td>
                {ACCESS_LABELS[row.accessStatus]} · {CATEGORY_LABELS[row.coverageCategory]}
                {row.contractError && (
                  <span className="badge badge--bad"> Entrega con problema de contrato</span>
                )}
              </td>
              <td className="table__number">{row.answeredResponses}</td>
              <td className="table__number">{row.omittedResponses}</td>
              {EVALUATION_DIMENSIONS.map((dimension) => (
                <td className="table__number" key={dimension}>
                  {formatAverage(dimensionAverage(row, dimension))}
                </td>
              ))}
              <td>
                {row.submissionId ? (
                  <Link
                    className="button button--secondary"
                    to={`/docente/respuestas/${row.submissionId}`}
                    aria-label={`Ver la entrega de ${row.studentName}`}
                  >
                    Ver entrega
                  </Link>
                ) : (
                  <span>Sin entrega</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
