/**
 * Pruebas del libro de Excel del resumen diagnóstico (spec §6.1).
 *
 * La salida es un `ArrayBuffer` binario, así que cada prueba vuelve a abrirlo
 * con `exceljs` y afirma sobre la estructura leída: es la única forma de
 * demostrar que el archivo quedó correcto y no solo que el código llamó a la
 * API adecuada.
 */
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type {
  CriterionEvaluation,
  EvaluationLevel,
  EvaluationObservation,
  EvaluationResult,
  ModuleEvaluation,
  QuestionEvaluation,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { EVALUATION_DIMENSIONS } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import { buildDiagnosticJudgmentRows } from './diagnosticCsv';
import { computeDiagnosticMetrics } from './diagnosticMetrics';
import type {
  DiagnosticEvaluation,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticResponse,
  DiagnosticStudentEntry,
} from './diagnosticModel';
import { buildDiagnosticWorkbook } from './diagnosticWorkbook';

/* ------------------------------------------------------------------ *
 * Fixtures — mismo patrón que diagnosticCsv.test.ts / diagnosticMetrics.test.ts
 * ------------------------------------------------------------------ */

function makeQuestion(
  position: number,
  activeCriteria: string[],
  activeModules: string[] = [],
  extra: Partial<DiagnosticQuestion> = {},
): DiagnosticQuestion {
  return {
    questionId: `q${position}`,
    position,
    prompt: `Consigna ${position}`,
    instructions: `Instrucciones ${position}`,
    activeCriteria,
    activeModules,
    suggestedMinWords: null,
    suggestedMaxWords: null,
    ...extra,
  };
}

function makeResponses(
  questions: DiagnosticQuestion[],
  omittedPositions: number[] = [],
  overrides: Partial<Record<number, Partial<DiagnosticResponse>>> = {},
): DiagnosticResponse[] {
  return questions.map((question) => {
    const omitted = omittedPositions.includes(question.position);
    return {
      questionId: question.questionId,
      position: question.position,
      originalText: omitted ? null : `Respuesta ${question.position} con ñ y tildes.`,
      wordCount: omitted ? 0 : 6,
      omitted,
      submittedAt: omitted ? null : '2026-09-01T09:00:00.000Z',
      ...overrides[question.position],
    };
  });
}

function criterion(
  criterionId: string,
  level: EvaluationLevel,
  extra: Partial<CriterionEvaluation> = {},
): CriterionEvaluation {
  return {
    criterionId,
    level,
    reason: `Razón de ${criterionId}`,
    evidences: [],
    confidence: 0.8,
    review: 'none',
    ...extra,
  };
}

function moduleResult(
  moduleId: string,
  level: EvaluationLevel,
  extra: Partial<ModuleEvaluation> = {},
): ModuleEvaluation {
  return {
    moduleId,
    level,
    reason: `Razón de ${moduleId}`,
    evidences: [],
    confidence: 0.7,
    review: 'none',
    ...extra,
  };
}

function questionResult(
  position: number,
  criteria: CriterionEvaluation[],
  options: { modules?: ModuleEvaluation[]; observations?: EvaluationObservation[] } = {},
): QuestionEvaluation {
  return {
    position,
    criteria,
    modules: options.modules ?? [],
    observations: options.observations ?? [],
    strengths: [],
    priorities: [],
  };
}

function evaluationResult(questionResults: QuestionEvaluation[]): EvaluationResult {
  return {
    questionResults,
    dimensionSummaries: EVALUATION_DIMENSIONS.map((dimension) => ({
      dimension,
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    })),
    globalConfidence: 0.8,
    limitations: [],
  };
}

function makeEvaluation(
  status: SubmissionEvaluationStatus,
  result: EvaluationResult | null,
  extra: Partial<DiagnosticEvaluation> = {},
): DiagnosticEvaluation {
  return {
    id: `eval-${status}`,
    status,
    result,
    confidence: 0.8,
    requestedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:02:00.000Z',
    errorCode: null,
    teacherAdjustments: null,
    teacherNote: null,
    reviewedAt: null,
    contractViolation: null,
    ...extra,
  };
}

function makeStudent(
  studentId: string,
  studentName: string,
  overrides: Partial<DiagnosticStudentEntry> = {},
): DiagnosticStudentEntry {
  return {
    studentId,
    studentName,
    accessState: 'submitted',
    status: 'entregado',
    submissionId: `sub-${studentId}`,
    startedAt: '2026-09-01T08:00:00.000Z',
    submittedAt: '2026-09-01T09:00:00.000Z',
    responses: [],
    evaluation: null,
    ...overrides,
  };
}

function makeReport(
  questions: DiagnosticQuestion[],
  students: DiagnosticStudentEntry[],
  extra: Partial<DiagnosticReport['assessment']> = {},
): DiagnosticReport {
  return {
    assessment: {
      id: 'assess-1',
      title: 'Diagnóstico inicial',
      status: 'closed',
      openedAt: '2026-08-30T12:00:00.000Z',
      ...extra,
    },
    group: { id: 'group-1', name: '3ro BGU A', schoolYear: '2026-2027' },
    questions,
    students,
    loadedAt: '2026-09-08T12:00:00.000Z',
  };
}

/* ------------------------------------------------------------------ *
 * Utilidades de lectura del archivo recién escrito
 * ------------------------------------------------------------------ */

async function readBack(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

async function buildAndRead(report: DiagnosticReport): Promise<ExcelJS.Workbook> {
  const metrics = computeDiagnosticMetrics(report);
  const buffer = await buildDiagnosticWorkbook(report, metrics);
  expect(buffer).toBeInstanceOf(ArrayBuffer);
  return readBack(buffer);
}

/** `autoFilter` vuelve de la lectura como `'A1:K1'` o como `{from, to}`. */
function autoFilterRef(sheet: ExcelJS.Worksheet): string | null {
  const filter = sheet.autoFilter as unknown;
  if (typeof filter === 'string') return filter;
  if (filter && typeof filter === 'object' && 'from' in filter && 'to' in filter) {
    const { from, to } = filter as { from: unknown; to: unknown };
    const cell = (value: unknown): string => {
      if (typeof value === 'string') return value;
      const point = value as { row: number; column: number };
      return `R${point.row}C${point.column}`;
    };
    return `${cell(from)}:${cell(to)}`;
  }
  return null;
}

function headerOf(sheet: ExcelJS.Worksheet): string[] {
  const row = sheet.getRow(1);
  const values: string[] = [];
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    values.push(String(row.getCell(column).value ?? ''));
  }
  return values;
}

/** Filas de datos (sin el encabezado) de una hoja. */
function dataRowCount(sheet: ExcelJS.Worksheet): number {
  return Math.max(0, sheet.rowCount - 1);
}

function columnIndex(sheet: ExcelJS.Worksheet, header: string): number {
  const index = headerOf(sheet).indexOf(header);
  expect(index, `columna «${header}» en la hoja ${sheet.name}`).toBeGreaterThanOrEqual(0);
  return index + 1;
}

const SHEET_NAMES = ['Resumen', 'Estudiantes', 'Criterios', 'Respuestas', 'Observaciones'];

/* ------------------------------------------------------------------ *
 * Reporte de referencia usado por la mayoría de las pruebas
 * ------------------------------------------------------------------ */

const questions = [
  makeQuestion(1, ['core.pertinencia', 'core.comprension_explicita']),
  makeQuestion(2, ['core.lectura_critica'], ['optional.estructura_argumentativa']),
];

const observations: EvaluationObservation[] = [
  {
    code: 'PERT_01',
    fragment: 'fragmento uno',
    explanation: 'explicación uno',
    severity: 'medium',
    review: 'none',
  },
  {
    code: 'PERT_02',
    fragment: 'fragmento dos',
    explanation: 'explicación dos',
    severity: 'low',
    review: 'needs_evidence_review',
  },
];

function usableResult(firstLevel: EvaluationLevel): EvaluationResult {
  return evaluationResult([
    questionResult(
      1,
      [criterion('core.pertinencia', firstLevel), criterion('core.comprension_explicita', 3)],
      { observations },
    ),
    questionResult(2, [criterion('core.lectura_critica', 2)], {
      modules: [moduleResult('optional.estructura_argumentativa', 1)],
    }),
  ]);
}

function baseReport(): DiagnosticReport {
  return makeReport(questions, [
    makeStudent('a', 'Ana Muñoz', {
      responses: makeResponses(questions),
      evaluation: makeEvaluation('completed', usableResult(3)),
    }),
    makeStudent('b', 'Bruno Páez', {
      responses: makeResponses(questions, [2]),
      evaluation: makeEvaluation('reviewed', usableResult(1), {
        reviewedAt: '2026-09-02T11:00:00.000Z',
        teacherAdjustments: [
          { position: 1, id: 'core.pertinencia', level: 4, reason: 'Corregido por evidencia.' },
        ],
      }),
    }),
    // Sin evaluación utilizable: sigue en cobertura y en `Estudiantes`, pero no
    // aporta ningún nivel ni observación.
    makeStudent('c', 'Carla Iza', {
      responses: makeResponses(questions),
      evaluation: makeEvaluation('discarded', usableResult(4)),
    }),
  ]);
}

/* ------------------------------------------------------------------ *
 * Pruebas
 * ------------------------------------------------------------------ */

describe('buildDiagnosticWorkbook — estructura del libro (§6.1)', () => {
  it('escribe exactamente las cinco hojas, en el orden del spec', async () => {
    const workbook = await buildAndRead(baseReport());

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(SHEET_NAMES);
  });

  it('congela el encabezado de cada hoja en la primera fila', async () => {
    const workbook = await buildAndRead(baseReport());

    for (const sheet of workbook.worksheets) {
      const view = sheet.views?.[0] as { state?: string; ySplit?: number } | undefined;
      expect(view?.state, `vista congelada en ${sheet.name}`).toBe('frozen');
      expect(view?.ySplit, `ySplit en ${sheet.name}`).toBe(1);
    }
  });

  it('habilita el filtro automático sobre el rango del encabezado de cada hoja', async () => {
    const workbook = await buildAndRead(baseReport());

    for (const sheet of workbook.worksheets) {
      const ref = autoFilterRef(sheet);
      expect(ref, `filtro automático en ${sheet.name}`).not.toBeNull();
      expect(ref, `filtro automático en ${sheet.name}`).toMatch(/^(A1:[A-Z]+1|R1C1:R1C\d+)$/);
    }
  });

  it('no deja ninguna hoja oculta', async () => {
    const workbook = await buildAndRead(baseReport());

    for (const sheet of workbook.worksheets) {
      expect(sheet.state ?? 'visible', `estado de ${sheet.name}`).toBe('visible');
    }
  });

  it('no escribe ninguna fórmula: todo llega ya calculado', async () => {
    const workbook = await buildAndRead(baseReport());

    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          expect(cell.type, `celda ${sheet.name}!${cell.address}`).not.toBe(
            ExcelJS.ValueType.Formula,
          );
        });
      });
    }
  });
});

describe('buildDiagnosticWorkbook — tipos reales de celda', () => {
  it('escribe la fecha de entrega como objeto Date, no como texto', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Estudiantes');
    expect(sheet).toBeDefined();
    const column = columnIndex(sheet!, 'Entrega');

    const cell = sheet!.getRow(2).getCell(column);

    expect(cell.value).toBeInstanceOf(Date);
    expect((cell.value as Date).toISOString()).toBe('2026-09-01T09:00:00.000Z');
  });

  it('escribe la fecha de corte del Resumen como objeto Date', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();
    const conceptColumn = columnIndex(sheet!, 'Concepto');
    const valueColumn = columnIndex(sheet!, 'Valor');

    let found: unknown = null;
    sheet!.eachRow((row) => {
      if (row.getCell(conceptColumn).value === 'Fecha de corte') {
        found = row.getCell(valueColumn).value;
      }
    });

    expect(found).toBeInstanceOf(Date);
    expect((found as Date).toISOString()).toBe('2026-09-08T12:00:00.000Z');
  });

  it('escribe los promedios dimensionales como número, no como texto localizado', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Estudiantes');
    expect(sheet).toBeDefined();
    const column = columnIndex(sheet!, 'Comprensión lectora');

    const cell = sheet!.getRow(2).getCell(column);

    // Comprensión lectora agrupa core.comprension_explicita (3) y
    // core.lectura_critica (2) → 2.5. core.pertinencia pertenece a otra
    // dimensión y no entra aquí.
    expect(typeof cell.value).toBe('number');
    expect(cell.value).toBe(2.5);
  });

  it('redondea el promedio a dos decimales en la presentación, conservando el tipo número', async () => {
    const oneQuestion = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(oneQuestion, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(oneQuestion),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 1)])]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(oneQuestion),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 2)])]),
        ),
      }),
      makeStudent('c', 'Carla', {
        responses: makeResponses(oneQuestion),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 2)])]),
        ),
      }),
    ]);
    const workbook = await buildAndRead(report);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();
    const conceptColumn = columnIndex(sheet!, 'Concepto');
    const valueColumn = columnIndex(sheet!, 'Valor');

    let found: unknown = null;
    sheet!.eachRow((row) => {
      // core.pertinencia pertenece a la dimensión «Respuesta y razonamiento».
      if (row.getCell(conceptColumn).value === 'Respuesta y razonamiento') {
        found = row.getCell(valueColumn).value;
      }
    });

    // (1 + 2 + 2) / 3 = 1.666… → 1.67 como número, nunca como "1,67".
    expect(typeof found).toBe('number');
    expect(found).toBe(1.67);
  });

  it('escribe la confianza como número', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Criterios');
    expect(sheet).toBeDefined();
    const column = columnIndex(sheet!, 'Confianza');

    expect(typeof sheet!.getRow(2).getCell(column).value).toBe('number');
  });
});

describe('buildDiagnosticWorkbook — filas esperadas', () => {
  it('escribe una fila de Criterios por estudiante × pregunta × criterio/módulo activo', async () => {
    const report = baseReport();
    const workbook = await buildAndRead(report);
    const sheet = workbook.getWorksheet('Criterios');
    expect(sheet).toBeDefined();

    // 3 estudiantes × [(2 criterios preg.1) + (1 criterio + 1 módulo preg.2)] = 12.
    expect(dataRowCount(sheet!)).toBe(12);
  });

  it('usa exactamente las mismas filas que el CSV de la Task 4', async () => {
    const report = baseReport();
    const workbook = await buildAndRead(report);
    const sheet = workbook.getWorksheet('Criterios');
    expect(sheet).toBeDefined();

    expect(dataRowCount(sheet!)).toBe(buildDiagnosticJudgmentRows(report).length);
  });

  it('escribe una fila de Respuestas por estudiante × pregunta', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Respuestas');
    expect(sheet).toBeDefined();

    // 3 estudiantes × 2 preguntas = 6.
    expect(dataRowCount(sheet!)).toBe(6);
  });

  it('escribe una fila de Observaciones por observación de un resultado utilizable', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Observaciones');
    expect(sheet).toBeDefined();

    // Ana (2) + Bruno (2); Carla está descartada y no aporta observaciones.
    expect(dataRowCount(sheet!)).toBe(4);
  });

  it('escribe una fila de Estudiantes por estudiante con acceso, aunque no tenga evaluación', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Estudiantes');
    expect(sheet).toBeDefined();

    expect(dataRowCount(sheet!)).toBe(3);
  });
});

describe('buildDiagnosticWorkbook — contenido', () => {
  it('conserva la respuesta original literal, sin recortarla ni sintetizarla', async () => {
    const verbatim = 'Línea uno con ñ, comas, "comillas"\ny una segunda línea.';
    const oneQuestion = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(oneQuestion, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(oneQuestion, [], { 1: { originalText: verbatim } }),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
        ),
      }),
    ]);
    const workbook = await buildAndRead(report);
    const sheet = workbook.getWorksheet('Respuestas');
    expect(sheet).toBeDefined();
    const column = columnIndex(sheet!, 'Respuesta original');

    expect(sheet!.getRow(2).getCell(column).value).toBe(verbatim);
  });

  it('marca la respuesta omitida como omitida y sin nivel numérico', async () => {
    const workbook = await buildAndRead(baseReport());
    const respuestas = workbook.getWorksheet('Respuestas');
    expect(respuestas).toBeDefined();
    const omittedColumn = columnIndex(respuestas!, 'Omitida');
    const questionColumn = columnIndex(respuestas!, 'Pregunta');
    const wordsColumn = columnIndex(respuestas!, 'Palabras');

    const omittedRows: number[] = [];
    respuestas!.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && row.getCell(omittedColumn).value === 'Sí') omittedRows.push(rowNumber);
    });

    expect(omittedRows).toHaveLength(1);
    const row = respuestas!.getRow(omittedRows[0]);
    expect(row.getCell(questionColumn).value).toBe(2);
    expect(row.getCell(wordsColumn).value).toBe(0);
  });

  it('conserva la procedencia: nivel original, nivel efectivo y fuente del ajuste docente', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Criterios');
    expect(sheet).toBeDefined();
    const studentColumn = columnIndex(sheet!, 'Estudiante');
    const idColumn = columnIndex(sheet!, 'Criterio o módulo');
    const originalColumn = columnIndex(sheet!, 'Nivel original');
    const effectiveColumn = columnIndex(sheet!, 'Nivel efectivo');
    const sourceColumn = columnIndex(sheet!, 'Fuente');
    const reasonColumn = columnIndex(sheet!, 'Razón efectiva');

    let target: ExcelJS.Row | null = null;
    sheet!.eachRow((row, rowNumber) => {
      if (
        rowNumber > 1 &&
        row.getCell(studentColumn).value === 'Bruno Páez' &&
        row.getCell(idColumn).value === 'core.pertinencia'
      ) {
        target = row;
      }
    });

    expect(target).not.toBeNull();
    const row = target as unknown as ExcelJS.Row;
    expect(row.getCell(originalColumn).value).toBe(1);
    expect(row.getCell(effectiveColumn).value).toBe(4);
    expect(row.getCell(sourceColumn).value).toBe('revisado_docente');
    expect(row.getCell(reasonColumn).value).toBe('Corregido por evidencia.');
  });

  it('deja el nivel vacío para una entrega sin resultado utilizable, nunca en cero', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Criterios');
    expect(sheet).toBeDefined();
    const studentColumn = columnIndex(sheet!, 'Estudiante');
    const originalColumn = columnIndex(sheet!, 'Nivel original');
    const effectiveColumn = columnIndex(sheet!, 'Nivel efectivo');

    let checked = 0;
    sheet!.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && row.getCell(studentColumn).value === 'Carla Iza') {
        expect(row.getCell(originalColumn).value ?? null).toBeNull();
        expect(row.getCell(effectiveColumn).value ?? null).toBeNull();
        checked += 1;
      }
    });

    expect(checked).toBe(4);
  });

  it('anota el aviso de procedencia mixta en la hoja Resumen', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();
    const conceptColumn = columnIndex(sheet!, 'Concepto');
    const valueColumn = columnIndex(sheet!, 'Valor');

    let notice: unknown = null;
    sheet!.eachRow((row) => {
      if (row.getCell(conceptColumn).value === 'Aviso') notice = row.getCell(valueColumn).value;
    });

    expect(notice).toBe('Resultados mixtos: contienen evaluación provisional de IA');
  });

  it('lleva todas las categorías de cobertura del motor a la hoja Resumen', async () => {
    const report = baseReport();
    const metrics = computeDiagnosticMetrics(report);
    const workbook = await buildAndRead(report);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();
    const sectionColumn = columnIndex(sheet!, 'Sección');
    const valueColumn = columnIndex(sheet!, 'Valor');

    const values: number[] = [];
    sheet!.eachRow((row) => {
      if (row.getCell(sectionColumn).value === 'Cobertura') {
        values.push(row.getCell(valueColumn).value as number);
      }
    });

    expect(values).toHaveLength(Object.keys(metrics.coverage).length);
    expect(values.every((value) => typeof value === 'number')).toBe(true);
    expect(values[0]).toBe(metrics.coverage.expected);
  });

  it('marca la observación con revisión de evidencia pendiente sin mezclarla con las confirmadas', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Observaciones');
    expect(sheet).toBeDefined();
    const codeColumn = columnIndex(sheet!, 'Código');
    const pendingColumn = columnIndex(sheet!, 'Evidencia pendiente');

    const pending = new Map<string, string>();
    sheet!.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        pending.set(
          String(row.getCell(codeColumn).value),
          String(row.getCell(pendingColumn).value),
        );
      }
    });

    expect(pending.get('PERT_01')).toBe('No');
    expect(pending.get('PERT_02')).toBe('Sí');
  });
});

describe('buildDiagnosticWorkbook — fuente de resultados filtrada en Resumen', () => {
  /** Un solo estudiante revisado: simula el informe ya filtrado a «Solo revisados». */
  function reviewedOnlyReport(): DiagnosticReport {
    const oneQuestion = [makeQuestion(1, ['core.pertinencia'])];
    return makeReport(oneQuestion, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(oneQuestion),
        evaluation: makeEvaluation(
          'reviewed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
          { reviewedAt: '2026-09-02T11:00:00.000Z' },
        ),
      }),
    ]);
  }

  function resumenValueFor(sheet: ExcelJS.Worksheet, concept: string): unknown {
    const conceptColumn = columnIndex(sheet, 'Concepto');
    const valueColumn = columnIndex(sheet, 'Valor');
    let found: unknown = null;
    sheet.eachRow((row) => {
      if (row.getCell(conceptColumn).value === concept) found = row.getCell(valueColumn).value;
    });
    return found;
  }

  it('escribe "Todos los utilizables" cuando no se pasa una fuente', async () => {
    const workbook = await buildAndRead(baseReport());
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();

    expect(resumenValueFor(sheet!, 'Fuente de resultados')).toBe('Todos los utilizables');
  });

  it('escribe la etiqueta legible de la fuente filtrada activa', async () => {
    const report = reviewedOnlyReport();
    const metrics = computeDiagnosticMetrics(report);
    const buffer = await buildDiagnosticWorkbook(report, metrics, 'revisados');
    const workbook = await readBack(buffer);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();

    expect(resumenValueFor(sheet!, 'Fuente de resultados')).toBe('Solo revisados');
  });

  it('etiqueta la sección de Cobertura con la fuente activa cuando hay un filtro, en vez de dejarla como "Cobertura" a secas', async () => {
    const report = reviewedOnlyReport();
    const metrics = computeDiagnosticMetrics(report);
    const buffer = await buildDiagnosticWorkbook(report, metrics, 'revisados');
    const workbook = await readBack(buffer);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();
    const sectionColumn = columnIndex(sheet!, 'Sección');

    const sections = new Set<string>();
    sheet!.eachRow((row) => {
      sections.add(String(row.getCell(sectionColumn).value ?? ''));
    });

    // Antes del arreglo, la sección de cobertura filtrada seguía llamándose
    // «Cobertura» a secas, como si describiera a todo el paralelo.
    expect(sections.has('Cobertura (fuente: Solo revisados)')).toBe(true);
    expect(sections.has('Cobertura')).toBe(false);
  });

  it('no afirma «todos los niveles vigentes» en el aviso de Resumen cuando la fuente está filtrada', async () => {
    const report = reviewedOnlyReport();
    const metrics = computeDiagnosticMetrics(report);
    const buffer = await buildDiagnosticWorkbook(report, metrics, 'revisados');
    const workbook = await readBack(buffer);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();

    const notice = resumenValueFor(sheet!, 'Aviso');

    expect(typeof notice).toBe('string');
    // Con la fuente sin filtrar, esta misma condición de cobertura sí produce
    // la frase absoluta; bajo un filtro no puede afirmar lo mismo sobre un
    // paralelo del que solo se exportó una parte.
    expect(notice as string).not.toMatch(/todos los niveles vigentes/);
    expect(notice as string).toContain('Solo revisados');
  });

  it('mantiene la frase original sin filtrar cuando la fuente es «todos»', async () => {
    const report = reviewedOnlyReport();
    const metrics = computeDiagnosticMetrics(report);
    const buffer = await buildDiagnosticWorkbook(report, metrics, 'todos');
    const workbook = await readBack(buffer);
    const sheet = workbook.getWorksheet('Resumen');
    expect(sheet).toBeDefined();

    expect(resumenValueFor(sheet!, 'Aviso')).toBe(
      'Resultados revisados por la docente: todos los niveles vigentes fueron confirmados o ajustados.',
    );
  });
});
