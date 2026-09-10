/**
 * Libro de Excel del resumen diagnóstico (spec §6.1).
 *
 * Cinco hojas en el orden del spec: `Resumen`, `Estudiantes`, `Criterios`,
 * `Respuestas` y `Observaciones`. Todo llega ya calculado desde
 * `diagnosticMetrics.ts` y `applyEffectiveResult`: aquí no se recalcula ninguna
 * regla ni se escribe una sola fórmula de Excel. Las filas de `Criterios` salen
 * de `buildDiagnosticJudgmentRows`, la misma función que arma el CSV, para que
 * ambos exportadores no puedan divergir sobre qué es una fila.
 *
 * `exceljs` se carga con `await import('exceljs')` **dentro** de la función y
 * nunca con un `import` estático de nivel de módulo: así queda en un chunk
 * aparte y no entra en el bundle inicial que carga `/docente`.
 */
import type { EvaluationLevel } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { applyEffectiveResult, type DiagnosticReport } from './diagnosticModel';
import type { DiagnosticMetrics, StudentMetrics } from './diagnosticMetrics';
import { buildDiagnosticJudgmentRows } from './diagnosticCsv';
import {
  ASSESSMENT_STATUS_LABELS,
  DIMENSION_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS as FILTER_SOURCE_LABELS,
  selectedSourceCounts,
  sourceMatchesFilter,
  type DiagnosticSource,
} from './diagnosticPresentation';

/** Tipos mínimos de `exceljs` que este módulo usa, sin importarlo de forma estática. */
type ExcelJsModule = typeof import('exceljs');
type Worksheet = ReturnType<InstanceType<ExcelJsModule['Workbook']>['addWorksheet']>;

/** Valor admitido en una celda; `null` deja la celda vacía (nunca un cero falso). */
type CellValue = string | number | Date | null;

interface SheetColumn {
  header: string;
  width: number;
}

const DATE_FORMAT = 'yyyy-mm-dd hh:mm';

/**
 * Redondeo a dos decimales, igual que `formatAverage` de la capa de
 * presentación, pero conservando el tipo `number`: el archivo guarda el valor
 * numérico, nunca un texto localizado (§4.2).
 */
function roundAverage(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

/** `no_aplica` viaja como texto; los niveles 1–4 como número real. */
function levelCell(level: EvaluationLevel | null): CellValue {
  if (level === null) return null;
  return level === 'no_aplica' ? 'no_aplica' : level;
}

function dateCell(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function yesNo(value: boolean | null): string {
  if (value === null) return '';
  return value ? 'Sí' : 'No';
}

const ACCESS_LABELS: Readonly<Record<string, string>> = {
  esperado: 'Esperado',
  iniciado: 'Iniciado',
  entregado: 'Entregado',
  bloqueado: 'Bloqueado',
  revocado: 'Revocado',
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  sin_evaluacion_utilizable: 'Sin evaluación utilizable',
  provisional: 'Provisional de IA',
  revisada: 'Revisada por la docente',
  descartada: 'Descartada',
  fallida: 'Falló',
  en_curso: 'En curso',
};

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  provisional_ia: 'Provisional de IA',
  revisado_docente: 'Revisado por la docente',
};

/**
 * Mismo aviso, con el mismo texto y la misma condición que muestra
 * `DiagnosticSummaryScreen`, para la fuente «todos»: el archivo nunca puede
 * decir algo distinto del tablero sobre la procedencia de los resultados.
 *
 * Bajo una fuente filtrada (`revisados` o `provisionales`) la frase nombra
 * explícitamente qué resultados se agregaron. La población y la cobertura
 * siguen siendo las del paralelo completo.
 */
function provenanceNotice(metrics: DiagnosticMetrics, source: DiagnosticSource): string {
  const counts = selectedSourceCounts(metrics.students, source);
  if (counts.provisional > 0) {
    return 'Resultados mixtos: contienen evaluación provisional de IA';
  }
  if (counts.reviewed > 0) {
    if (source === 'todos') {
      return 'Resultados revisados por la docente: todos los niveles vigentes fueron confirmados o ajustados.';
    }
    return `Fuente filtrada «${FILTER_SOURCE_LABELS[source]}»: solo se agregan resultados revisados por la docente; sus niveles fueron confirmados o ajustados.`;
  }
  return 'Esta selección no contiene ningún resultado utilizable de IA.';
}

/** Categorías de cobertura en el orden del §4.2, con su etiqueta legible. */
const COVERAGE_ROWS: readonly { key: keyof DiagnosticMetrics['coverage']; label: string }[] = [
  { key: 'expected', label: 'Esperados' },
  { key: 'started', label: 'Iniciados' },
  { key: 'submitted', label: 'Entregados' },
  { key: 'withoutUsableEvaluation', label: 'Sin evaluación utilizable' },
  { key: 'provisional', label: 'Provisionales' },
  { key: 'reviewed', label: 'Revisadas' },
  { key: 'discarded', label: 'Descartadas' },
  { key: 'failed', label: 'Fallidas' },
  { key: 'inProgress', label: 'En curso' },
];

/**
 * Escribe encabezado, filas y formato sobrio de una hoja: encabezado en negrita
 * y congelado, filtro automático sobre el rango del encabezado, fechas con
 * formato de fecha y ninguna hoja oculta.
 */
function writeSheet(sheet: Worksheet, columns: readonly SheetColumn[], rows: CellValue[][]): void {
  sheet.columns = columns.map(({ header, width }) => ({ header, width }));
  sheet.state = 'visible';
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  for (const values of rows) {
    const row = sheet.addRow(values.map((value) => value ?? null));
    values.forEach((value, index) => {
      if (value instanceof Date) row.getCell(index + 1).numFmt = DATE_FORMAT;
    });
  }
}

function resumenRows(metrics: DiagnosticMetrics, source: DiagnosticSource): CellValue[][] {
  const rows: CellValue[][] = [
    ['Evaluación', 'Título', metrics.assessment.title, null, null],
    [
      'Evaluación',
      'Estado',
      ASSESSMENT_STATUS_LABELS[metrics.assessment.status] ?? metrics.assessment.status,
      null,
      null,
    ],
    ['Evaluación', 'Apertura', dateCell(metrics.assessment.openedAt), null, null],
    ['Paralelo', 'Nombre', metrics.group.name, null, null],
    ['Paralelo', 'Año lectivo', metrics.group.schoolYear, null, null],
    ['Corte', 'Fecha de corte', dateCell(metrics.loadedAt), null, null],
    ['Fuente', 'Fuente de resultados', FILTER_SOURCE_LABELS[source], null, null],
    ['Procedencia', 'Aviso', provenanceNotice(metrics, source), null, null],
  ];

  for (const { key, label } of COVERAGE_ROWS) {
    rows.push(['Cobertura', label, metrics.coverage[key], null, null]);
  }

  rows.push(['Omisiones', 'Respuestas omitidas', metrics.omissions.omittedResponses, null, null]);
  rows.push([
    'Omisiones',
    'Estudiantes con omisiones',
    metrics.omissions.studentsWithOmissions,
    null,
    null,
  ]);

  for (const dimension of metrics.dimensions) {
    rows.push([
      'Dimensión',
      DIMENSION_LABELS[dimension.dimension] ?? dimension.dimension,
      roundAverage(dimension.average),
      dimension.studentsMeasured,
      dimension.applicableJudgments,
    ]);
  }

  return rows;
}

function studentDimensionCells(student: StudentMetrics, metrics: DiagnosticMetrics): CellValue[] {
  return metrics.dimensions.map((groupDimension) => {
    const stat = student.dimensions.find((item) => item.dimension === groupDimension.dimension);
    return roundAverage(stat?.average ?? null);
  });
}

export async function buildDiagnosticWorkbook(
  report: DiagnosticReport,
  metrics: DiagnosticMetrics,
  source: DiagnosticSource = 'todos',
): Promise<ArrayBuffer> {
  // Import diferido real: `exceljs` solo se descarga cuando la docente pide el
  // `.xlsx`, nunca al entrar a `/docente`.
  const ExcelJS: ExcelJsModule = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Yachayñan Lite';
  workbook.created = new Date(metrics.loadedAt);

  /* ---------------------------- Resumen ---------------------------- */
  writeSheet(
    workbook.addWorksheet('Resumen'),
    [
      { header: 'Sección', width: 16 },
      { header: 'Concepto', width: 30 },
      { header: 'Valor', width: 56 },
      { header: 'Estudiantes medidos', width: 20 },
      { header: 'Juicios aplicables', width: 18 },
    ],
    resumenRows(metrics, source),
  );

  /* -------------------------- Estudiantes -------------------------- */
  const startedAtById = new Map(
    report.students.map((entry) => [entry.studentId, entry.startedAt] as const),
  );
  const dimensionHeaders = metrics.dimensions.map((dimension) => ({
    header: DIMENSION_LABELS[dimension.dimension] ?? dimension.dimension,
    width: 22,
  }));
  writeSheet(
    workbook.addWorksheet('Estudiantes'),
    [
      { header: 'Estudiante', width: 28 },
      { header: 'Estado de entrega', width: 18 },
      { header: 'Estado de evaluación', width: 20 },
      { header: 'Cobertura', width: 24 },
      { header: 'Procedencia', width: 24 },
      { header: 'Inicio', width: 20 },
      { header: 'Entrega', width: 20 },
      { header: 'Respondidas', width: 13 },
      { header: 'Omitidas', width: 11 },
      { header: 'Juicios aplicables', width: 18 },
      { header: 'No aplica', width: 11 },
      ...dimensionHeaders,
    ],
    metrics.students.map((student) => [
      student.studentName,
      ACCESS_LABELS[student.accessStatus] ?? student.accessStatus,
      student.evaluationStatus ?? 'Sin evaluación',
      CATEGORY_LABELS[student.coverageCategory] ?? student.coverageCategory,
      student.source === null ? '' : (SOURCE_LABELS[student.source] ?? student.source),
      dateCell(startedAtById.get(student.studentId) ?? null),
      dateCell(student.submittedAt),
      student.answeredResponses,
      student.omittedResponses,
      student.judgments,
      student.notApplicable,
      ...studentDimensionCells(student, metrics),
    ]),
  );

  /* --------------------------- Criterios --------------------------- */
  writeSheet(
    workbook.addWorksheet('Criterios'),
    [
      { header: 'Estudiante', width: 28 },
      { header: 'Pregunta', width: 10 },
      { header: 'Criterio o módulo', width: 34 },
      { header: 'Etiqueta', width: 36 },
      { header: 'Tipo', width: 12 },
      { header: 'Nivel original', width: 14 },
      { header: 'Nivel efectivo', width: 14 },
      { header: 'Fuente', width: 20 },
      { header: 'Razón efectiva', width: 60 },
      { header: 'Confianza', width: 11 },
      { header: 'Evidencia pendiente', width: 20 },
    ],
    buildDiagnosticJudgmentRows(report, source).map((row) => [
      row.studentName,
      row.position,
      row.id,
      row.label,
      row.kind === 'module' ? 'Módulo' : 'Criterio',
      levelCell(row.originalLevel),
      levelCell(row.level),
      row.source ?? '',
      row.reason ?? '',
      row.confidence,
      yesNo(row.pendingEvidenceReview),
    ]),
  );

  /* --------------------------- Respuestas -------------------------- */
  const responseRows: CellValue[][] = [];
  for (const student of report.students) {
    if (student.submissionId === null || student.status !== 'entregado') continue;
    for (const question of report.questions) {
      const response = student.responses.find((item) => item.questionId === question.questionId);
      responseRows.push([
        student.studentName,
        question.position,
        question.prompt,
        // Literal: la respuesta original nunca se recorta ni se sintetiza.
        response?.originalText ?? '',
        response?.wordCount ?? 0,
        response ? (response.omitted ? 'Sí' : 'No') : 'Sí',
        dateCell(response?.submittedAt ?? student.submittedAt),
      ]);
    }
  }
  writeSheet(
    workbook.addWorksheet('Respuestas'),
    [
      { header: 'Estudiante', width: 28 },
      { header: 'Pregunta', width: 10 },
      { header: 'Consigna', width: 48 },
      { header: 'Respuesta original', width: 80 },
      { header: 'Palabras', width: 11 },
      { header: 'Omitida', width: 10 },
      { header: 'Fecha de entrega', width: 20 },
    ],
    responseRows,
  );

  /* ------------------------- Observaciones ------------------------- */
  const observationRows: CellValue[][] = [];
  for (const student of report.students) {
    const outcome = applyEffectiveResult({
      studentId: student.studentId,
      submissionId: student.submissionId,
      evaluation: student.evaluation,
    });
    if (outcome.status !== 'usable') continue;
    if (!sourceMatchesFilter(outcome.result.source, source)) continue;
    for (const question of outcome.result.questions) {
      for (const observation of question.observations) {
        observationRows.push([
          student.studentName,
          question.position,
          observation.code,
          observation.fragment,
          observation.explanation,
          SEVERITY_LABELS[observation.severity] ?? observation.severity,
          observation.review === 'needs_evidence_review' ? 'Sí' : 'No',
        ]);
      }
    }
  }
  writeSheet(
    workbook.addWorksheet('Observaciones'),
    [
      { header: 'Estudiante', width: 28 },
      { header: 'Pregunta', width: 10 },
      { header: 'Código', width: 18 },
      { header: 'Fragmento', width: 60 },
      { header: 'Explicación', width: 60 },
      { header: 'Severidad', width: 12 },
      { header: 'Evidencia pendiente', width: 20 },
    ],
    observationRows,
  );

  const written = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(written);
}

/**
 * `writeBuffer()` devuelve un `ArrayBuffer` o una vista tipo `Buffer` según el
 * empaquetado de `exceljs`. El contrato público de este módulo es siempre un
 * `ArrayBuffer` propio del realm actual: los bytes se copian a uno nuevo en vez
 * de exponer una vista sobre un búfer compartido (o de otro realm, como ocurre
 * con el `Buffer` de Node bajo jsdom).
 */
function toArrayBuffer(written: unknown): ArrayBuffer {
  const bytes = written instanceof ArrayBuffer ? new Uint8Array(written) : asBytes(written);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function asBytes(written: unknown): Uint8Array {
  if (ArrayBuffer.isView(written)) {
    const view = written as ArrayBufferView;
    return new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength);
  }
  throw new Error('exceljs devolvió un búfer de un tipo inesperado');
}

export { diagnosticFileName } from './diagnosticCsv';
