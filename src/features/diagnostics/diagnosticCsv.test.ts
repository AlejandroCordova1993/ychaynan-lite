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
import { CORE_CRITERIA } from '../../../supabase/functions/_shared/assessmentRubric.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import type {
  DiagnosticEvaluation,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticResponse,
  DiagnosticStudentEntry,
} from './diagnosticModel';
import { computeDiagnosticMetrics } from './diagnosticMetrics';
import { buildDiagnosticCsv, diagnosticFileName } from './diagnosticCsv';

/* ------------------------------------------------------------------ *
 * Fixtures — mismo patrón que diagnosticMetrics.test.ts
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

const BOM = String.fromCharCode(0xfeff);

function csvRows(csv: string): string[] {
  // Quita el BOM inicial y descarta la fila vacía final tras el último \r\n.
  const withoutBom = csv.startsWith(BOM) ? csv.slice(BOM.length) : csv;
  return withoutBom.split('\r\n').slice(0, -1);
}

/* ------------------------------------------------------------------ *
 * Pruebas
 * ------------------------------------------------------------------ */

describe('buildDiagnosticCsv — codificación (§6.2)', () => {
  it('conserva el BOM inicial', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);

    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('escapa tildes, comas, comillas y saltos de línea (RFC 4180) sin mutilar la ñ', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Muñoz, Ana "Anita"\nRuiz', {
        responses: makeResponses(questions, [], {
          1: { originalText: 'Respuesta con ñ, comas, "comillas" y\nsalto de línea.' },
        }),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);

    expect(csv).toContain('"Muñoz, Ana ""Anita""\nRuiz"');
    expect(csv).toContain('"Respuesta con ñ, comas, ""comillas"" y\nsalto de línea."');
  });

  it('neutraliza celdas que empiezan por =, +, -, @', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', '=HYPERLINK("http://malo.test")', {
        responses: makeResponses(questions, [], { 1: { originalText: '+2+3' } }),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 3, { reason: '-razón' })]),
          ]),
        ),
      }),
      makeStudent('b', '@SUM(A1)', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);

    expect(csv).toContain('"\'=HYPERLINK(""http://malo.test"")"');
    expect(csv).toContain("'+2+3");
    expect(csv).toContain("'-razón");
    expect(csv).toContain("'@SUM(A1)");
  });
});

describe('buildDiagnosticCsv — filas (tabla larga por estudiante × pregunta × criterio/módulo)', () => {
  it('conserva respuestas de todas las entregas y vacía solo los juicios ajenos al filtro', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana provisional', {
        responses: makeResponses(questions, [], { 1: { originalText: 'Texto de Ana.' } }),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 2)])]),
        ),
      }),
      makeStudent('b', 'Bruno revisado', {
        responses: makeResponses(questions, [], { 1: { originalText: 'Texto de Bruno.' } }),
        evaluation: makeEvaluation(
          'reviewed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
          { reviewedAt: '2026-09-02T11:00:00.000Z' },
        ),
      }),
      makeStudent('c', 'Carla sin evaluación', {
        responses: makeResponses(questions, [], { 1: { originalText: 'Texto de Carla.' } }),
        evaluation: null,
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report, 'revisado_docente');

    const rows = csvRows(buildDiagnosticCsv(report, metrics, 'revisados'));
    const header = rows[0].split(',');
    const data = rows.slice(1).map((row) => row.split(','));
    const studentIndex = header.indexOf('Estudiante');
    const responseIndex = header.indexOf('Respuesta original');
    const levelIndex = header.indexOf('Nivel efectivo');
    const sourceIndex = header.indexOf('Fuente');

    expect(data).toHaveLength(3);
    expect(data.map((row) => row[studentIndex])).toEqual([
      'Ana provisional',
      'Bruno revisado',
      'Carla sin evaluación',
    ]);
    expect(data.map((row) => row[responseIndex])).toEqual([
      'Texto de Ana.',
      'Texto de Bruno.',
      'Texto de Carla.',
    ]);
    expect(data.map((row) => row[levelIndex])).toEqual(['', '3', '']);
    expect(data.map((row) => row[sourceIndex])).toEqual(['', 'revisado_docente', '']);
  });

  it('produce exactamente estudiantes × preguntas × (criterios + módulos activos)', () => {
    const questions = [
      makeQuestion(1, ['core.pertinencia', 'core.comprension_explicita']),
      makeQuestion(2, ['core.lectura_critica'], ['optional.estructura_argumentativa']),
    ];
    const usable = (position1Level: EvaluationLevel) =>
      evaluationResult([
        questionResult(1, [
          criterion('core.pertinencia', position1Level),
          criterion('core.comprension_explicita', 3),
        ]),
        questionResult(2, [criterion('core.lectura_critica', 2)], {
          modules: [moduleResult('optional.estructura_argumentativa', 1)],
        }),
      ]);
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('completed', usable(3)),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('completed', usable(1)),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0];
    const dataRows = rows.slice(1);

    // 2 estudiantes × [(2 criterios preg.1) + (1 criterio + 1 módulo preg.2)] = 2 × 4 = 8.
    expect(dataRows).toHaveLength(8);
    expect(header.split(',')).toContain('Nivel efectivo');
  });

  it('no fabrica un nivel cuando no hay resultado utilizable (pending/discarded)', () => {
    const questions = [makeQuestion(1, ['core.pertinencia', 'core.comprension_explicita'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('pending', null),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'discarded',
          evaluationResult([
            questionResult(1, [
              criterion('core.pertinencia', 4),
              criterion('core.comprension_explicita', 4),
            ]),
          ]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0].split(',');
    const originalLevelIdx = header.indexOf('Nivel original');
    const effectiveLevelIdx = header.indexOf('Nivel efectivo');
    const dataRows = rows.slice(1).map((row) => row.split(','));

    // 2 estudiantes × 2 criterios = 4 filas, ninguna con nivel (ni pending ni discarded aportan).
    expect(dataRows).toHaveLength(4);
    for (const row of dataRows) {
      expect(row[originalLevelIdx]).toBe('');
      expect(row[effectiveLevelIdx]).toBe('');
    }
  });

  it('conserva no_aplica como dato real, distinto de una fila vacía', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions, [1]),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 'no_aplica')])]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0].split(',');
    const originalLevelIdx = header.indexOf('Nivel original');
    const omittedIdx = header.indexOf('Omitida');
    const dataRow = rows[1].split(',');

    expect(dataRow[originalLevelIdx]).toBe('no_aplica');
    expect(dataRow[omittedIdx]).toBe('Sí');
  });

  it('aplica el ajuste docente exacto (source revisado_docente) reusando applyEffectiveResult', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'reviewed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 1)])]),
          {
            teacherAdjustments: [
              { position: 1, id: 'core.pertinencia', level: 4, reason: 'Corregido por evidencia.' },
            ],
          },
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0].split(',');
    const originalLevelIdx = header.indexOf('Nivel original');
    const effectiveLevelIdx = header.indexOf('Nivel efectivo');
    const sourceIdx = header.indexOf('Fuente');
    const reasonIdx = header.indexOf('Razón');
    const dataRow = rows[1].split(',');

    expect(dataRow[originalLevelIdx]).toBe('1');
    expect(dataRow[effectiveLevelIdx]).toBe('4');
    expect(dataRow[sourceIdx]).toBe('revisado_docente');
    expect(dataRow[reasonIdx]).toBe('Corregido por evidencia.');
  });

  it('une los códigos de observación de la misma pregunta con un separador distinto de la coma', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 3)], {
              observations: [
                {
                  code: 'PERT_01',
                  fragment: 'fragmento uno',
                  explanation: 'explicación',
                  severity: 'medium',
                  review: 'none',
                },
                {
                  code: 'PERT_02',
                  fragment: 'fragmento dos',
                  explanation: 'explicación',
                  severity: 'low',
                  review: 'none',
                },
              ],
            }),
          ]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0].split(',');
    const obsIdx = header.indexOf('Códigos de observación');
    const dataRow = rows[1].split(',');

    expect(dataRow[obsIdx]).toBe('PERT_01; PERT_02');
    expect(dataRow[obsIdx]).not.toContain(',');
  });
});

describe('buildDiagnosticCsv — etiquetas de rúbrica reutilizadas', () => {
  it('usa la etiqueta legible del catálogo compartido, no un texto inventado', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]),
        ),
      }),
    ]);
    const metrics = computeDiagnosticMetrics(report);
    const expectedLabel = CORE_CRITERIA.find(({ id }) => id === 'core.pertinencia')?.label;

    const csv = buildDiagnosticCsv(report, metrics);
    const rows = csvRows(csv);
    const header = rows[0].split(',');
    const labelIdx = header.indexOf('Etiqueta');
    const dataRow = rows[1].split(',');

    expect(dataRow[labelIdx]).toBe(expectedLabel);
  });
});

describe('diagnosticFileName', () => {
  it('produce el patrón documentado con segmentos saneados', () => {
    const name = diagnosticFileName('Diagnóstico Inicial 2026', '3ro BGU A', '2026-09-08', 'csv');

    expect(name).toBe('yachaynan-diagnostico_diagnostico-inicial-2026_3ro-bgu-a_2026-09-08.csv');
  });

  it('sanea mayúsculas, tildes y caracteres no seguros para un nombre de archivo', () => {
    const name = diagnosticFileName(
      'Evaluación N.º 1 (piloto)',
      'Paralelo "B"/2026',
      '2026-09-08',
      'xlsx',
    );

    expect(name).toMatch(/^yachaynan-diagnostico_[a-z0-9-]+_[a-z0-9-]+_[a-z0-9-]+\.xlsx$/);
    const stem = name.slice(0, name.lastIndexOf('.'));
    expect(stem).not.toMatch(/[\s/"().ºÁÉÍÓÚñÑ]/);
  });
});
