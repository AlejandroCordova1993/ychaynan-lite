import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { EVALUATION_DIMENSIONS } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import {
  listDiagnosticAssessments,
  listGroupsForAssessment,
  loadDiagnosticReport,
} from './diagnosticReport';
import { listAppliedAssessments } from './submissions';

/**
 * Cliente Supabase simulado con la misma convención que
 * `src/lib/api/submissions.test.ts`: `from(tabla)` devuelve una cadena donde
 * cada método encadenable se devuelve a sí mismo y los terminales resuelven la
 * fila (o filas) registradas para esa tabla.
 */
function createClient(tables: Record<string, unknown>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from: vi.fn((table: string) => {
      const terminal = () => Promise.resolve({ data: tables[table] ?? null, error: null });
      const record = (method: string) =>
        vi.fn((...args: unknown[]) => {
          calls.push({ table, method, args });
          return chain;
        });
      const recordTerminal = (method: string) =>
        vi.fn((...args: unknown[]) => {
          calls.push({ table, method, args });
          return terminal();
        });
      const chain: Record<string, unknown> = {
        select: record('select'),
        eq: record('eq'),
        in: record('in'),
        order: recordTerminal('order'),
        single: recordTerminal('single'),
        maybeSingle: recordTerminal('maybeSingle'),
        then: (resolve: (value: unknown) => unknown) => terminal().then(resolve),
      };
      return chain;
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const questionRows = [
  {
    id: 'q2',
    position: 2,
    prompt: 'Segunda consigna',
    instructions: '',
    suggested_min_words: null,
    suggested_max_words: null,
    active_criteria: ['core.pertinencia'],
    active_modules: ['optional.proposito_punto_vista'],
  },
  {
    id: 'q1',
    position: 1,
    prompt: 'Primera consigna',
    instructions: 'Instrucción de la primera',
    suggested_min_words: 60,
    suggested_max_words: 120,
    active_criteria: ['core.pertinencia', 'core.cohesion'],
    active_modules: [],
  },
];

function criterion(criterionId: string, level: number) {
  return {
    criterionId,
    level,
    reason: `Razón de ${criterionId}`,
    evidences: ['fragmento citado'],
    confidence: 0.8,
    review: 'none',
  };
}

function moduleResult(moduleId: string, level: number) {
  return {
    moduleId,
    level,
    reason: `Razón de ${moduleId}`,
    evidences: ['fragmento citado'],
    confidence: 0.7,
    review: 'none',
  };
}

/** `result_json` coherente con `questionRows` (posiciones 1 y 2, en ese orden). */
function validResultJson() {
  return {
    questionResults: [
      {
        position: 1,
        criteria: [criterion('core.pertinencia', 3), criterion('core.cohesion', 2)],
        modules: [],
        observations: [
          {
            code: 'PERT',
            fragment: 'un fragmento',
            explanation: 'La respuesta se desvía de la consigna.',
            severity: 'medium',
          },
        ],
        strengths: ['Retoma la consigna'],
        priorities: ['Precisar la respuesta'],
      },
      {
        position: 2,
        criteria: [criterion('core.pertinencia', 4)],
        modules: [moduleResult('optional.proposito_punto_vista', 2)],
        observations: [],
        strengths: [],
        priorities: [],
      },
    ],
    dimensionSummaries: EVALUATION_DIMENSIONS.map((dimension) => ({
      dimension,
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0.5,
      strengths: [],
      priorities: [],
    })),
    globalConfidence: 0.82,
    limitations: [],
  };
}

const assessmentRow = {
  id: 'assessment-1',
  title: 'Diagnóstico inicial',
  status: 'closed',
  opened_at: '2026-09-01T08:00:00.000Z',
};
const groupRow = { id: 'group-a', name: '1.º BGU A', school_year: '2026-2027' };

function accessRow(studentId: string, name: string, state: string, groupId = 'group-a') {
  return {
    id: `access-${studentId}`,
    student_id: studentId,
    state,
    students: { full_name_original: name, group_id: groupId },
  };
}

function evaluationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eval-1',
    submission_id: 'sub-1',
    status: 'completed',
    result_json: validResultJson(),
    confidence: 0.82,
    requested_at: '2026-09-02T10:00:00.000Z',
    completed_at: '2026-09-02T10:02:00.000Z',
    error_code: null,
    teacher_adjustments: null,
    teacher_note: null,
    reviewed_at: null,
    ...overrides,
  };
}

/** Escenario base: un estudiante entregado y evaluado, otro solo con acceso. */
function baseTables(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assessments: assessmentRow,
    groups: groupRow,
    questions: questionRows,
    assessment_access: [
      accessRow('student-zoe', 'Zoe Núñez', 'submitted'),
      accessRow('student-ana', 'Ana Ruiz', 'unused'),
      accessRow('student-otro', 'Otro Paralelo', 'submitted', 'group-b'),
    ],
    submissions: [
      {
        id: 'sub-1',
        student_id: 'student-zoe',
        status: 'submitted',
        started_at: '2026-09-02T09:00:00.000Z',
        submitted_at: '2026-09-02T09:40:00.000Z',
      },
      {
        id: 'sub-otro',
        student_id: 'student-otro',
        status: 'submitted',
        started_at: '2026-09-02T09:00:00.000Z',
        submitted_at: '2026-09-02T09:30:00.000Z',
      },
    ],
    responses: [
      {
        submission_id: 'sub-1',
        question_id: 'q1',
        original_text: 'La ñandú corrió: "rápido", según el texto.',
        word_count: 8,
        submitted_at: '2026-09-02T09:40:00.000Z',
      },
      {
        submission_id: 'sub-1',
        question_id: 'q2',
        original_text: '   ',
        word_count: 0,
        submitted_at: null,
      },
    ],
    ai_evaluations: [evaluationRow()],
    ...overrides,
  };
}

function groupsTableRow(id: string, name: string) {
  return { id, name, school_year: '2026-2027', status: 'active' };
}

// UUID válidos porque `listGroupsForAssessment` reutiliza `listGroups`, que
// valida cada fila contra `groupSchema` (`id` es `z.string().uuid()`).
const uuidGroupA = '11111111-1111-1111-1111-111111111111';
const uuidGroupB = '22222222-2222-2222-2222-222222222222';
const uuidGroupC = '33333333-3333-3333-3333-333333333333';

describe('selectores del resumen diagnóstico', () => {
  it('listDiagnosticAssessments reutiliza listAppliedAssessments sin una segunda consulta', () => {
    expect(listDiagnosticAssessments).toBe(listAppliedAssessments);
  });

  it('listGroupsForAssessment devuelve solo los paralelos con al menos un estudiante con acceso a esa evaluación', async () => {
    // Tres paralelos en la escuela, pero solo A y B tienen accesos para
    // `assessment-1`; C nunca aparece en `assessment_access`. Si la función
    // siguiera reexportando `listGroups` sin filtrar, devolvería los tres.
    const { client } = createClient({
      assessment_access: [
        accessRow('student-1', 'Estudiante Uno', 'submitted', uuidGroupA),
        accessRow('student-2', 'Estudiante Dos', 'unused', uuidGroupB),
      ],
      groups: [
        groupsTableRow(uuidGroupA, '1.º BGU A'),
        groupsTableRow(uuidGroupB, '1.º BGU B'),
        groupsTableRow(uuidGroupC, '1.º BGU C'),
      ],
    });

    const groups = await listGroupsForAssessment(client, 'assessment-1');

    expect(groups.map((group) => group.id)).toEqual([uuidGroupA, uuidGroupB]);
  });

  it('listGroupsForAssessment devuelve un arreglo vacío cuando nadie tiene acceso a esa evaluación', async () => {
    const { client } = createClient({
      assessment_access: [],
      groups: [groupsTableRow(uuidGroupA, '1.º BGU A')],
    });

    const groups = await listGroupsForAssessment(client, 'assessment-1');

    expect(groups).toEqual([]);
  });
});

describe('loadDiagnosticReport', () => {
  it('arma un reporte completo con metadatos, preguntas ordenadas y solo el paralelo pedido', async () => {
    const { client, calls } = createClient(baseTables());

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    expect(report.assessment).toEqual({
      id: 'assessment-1',
      title: 'Diagnóstico inicial',
      status: 'closed',
      openedAt: '2026-09-01T08:00:00.000Z',
    });
    expect(report.group).toEqual({ id: 'group-a', name: '1.º BGU A', schoolYear: '2026-2027' });
    expect(report.questions.map((question) => question.position)).toEqual([1, 2]);
    expect(report.questions[0]).toEqual({
      questionId: 'q1',
      position: 1,
      prompt: 'Primera consigna',
      instructions: 'Instrucción de la primera',
      activeCriteria: ['core.pertinencia', 'core.cohesion'],
      activeModules: [],
      suggestedMinWords: 60,
      suggestedMaxWords: 120,
    });
    expect(typeof report.loadedAt).toBe('string');

    // El estudiante de otro paralelo no entra; el orden es alfabético en español.
    expect(report.students.map((student) => student.studentName)).toEqual([
      'Ana Ruiz',
      'Zoe Núñez',
    ]);

    const zoe = report.students[1];
    expect(zoe.status).toBe('entregado');
    expect(zoe.accessState).toBe('submitted');
    expect(zoe.submissionId).toBe('sub-1');
    expect(zoe.startedAt).toBe('2026-09-02T09:00:00.000Z');
    expect(zoe.submittedAt).toBe('2026-09-02T09:40:00.000Z');

    // La respuesta original llega verbatim, con tildes, ñ y comillas intactas.
    expect(zoe.responses[0]).toEqual({
      questionId: 'q1',
      position: 1,
      originalText: 'La ñandú corrió: "rápido", según el texto.',
      wordCount: 8,
      omitted: false,
      submittedAt: '2026-09-02T09:40:00.000Z',
    });
    // Texto en blanco = omitida, con la misma regla de `getSubmissionDetail`.
    expect(zoe.responses[1]).toEqual({
      questionId: 'q2',
      position: 2,
      originalText: '   ',
      wordCount: 0,
      omitted: true,
      submittedAt: '2026-09-02T09:40:00.000Z',
    });

    expect(zoe.evaluation).toMatchObject({
      id: 'eval-1',
      status: 'completed',
      confidence: 0.82,
      requestedAt: '2026-09-02T10:00:00.000Z',
      completedAt: '2026-09-02T10:02:00.000Z',
      errorCode: null,
      teacherAdjustments: null,
      teacherNote: null,
      reviewedAt: null,
      contractViolation: null,
    });
    // `result_json` pasó por `parseEvaluationResult`: la pregunta omitida queda
    // en `no_aplica` porque el cargador le entregó la omisión real.
    const result = zoe.evaluation?.result;
    expect(result?.questionResults).toHaveLength(2);
    expect(result?.questionResults[0].criteria[0]).toMatchObject({
      criterionId: 'core.pertinencia',
      level: 3,
    });
    expect(result?.questionResults[0].observations[0]).toMatchObject({
      code: 'PERT',
      review: 'none',
    });
    expect(result?.questionResults[1].criteria[0].level).toBe('no_aplica');
    expect(result?.questionResults[1].modules[0].level).toBe('no_aplica');

    // Ninguna consulta queda sin acotar por evaluación, paralelo o lista de ids.
    const queried = new Set(calls.filter((call) => call.method === 'select').map((c) => c.table));
    expect(queried.size).toBeGreaterThan(0);
    for (const table of queried) {
      const bounded = calls.some(
        (call) => call.table === table && (call.method === 'eq' || call.method === 'in'),
      );
      expect(bounded, `la consulta a ${table} no está acotada`).toBe(true);
    }
  });

  it('devuelve un reporte vacío pero válido cuando el paralelo no tiene estudiantes con acceso', async () => {
    const { client } = createClient(
      baseTables({
        assessment_access: [accessRow('student-otro', 'Otro Paralelo', 'submitted', 'group-b')],
      }),
    );

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    expect(report.students).toEqual([]);
    expect(report.questions).toHaveLength(2);
    expect(report.assessment.id).toBe('assessment-1');
  });

  it('marca la entrega con contrato inválido en vez de lanzar cuando `result_json` no valida', async () => {
    const { client } = createClient(
      baseTables({
        ai_evaluations: [evaluationRow({ result_json: { questionResults: 'no es una lista' } })],
      }),
    );

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    const zoe = report.students.find((student) => student.studentId === 'student-zoe');
    expect(zoe?.evaluation?.result).toBeNull();
    expect(zoe?.evaluation?.contractViolation).toEqual(expect.any(String));
    expect(zoe?.evaluation?.contractViolation).toContain('result_json');
  });

  it('marca contrato inválido cuando `teacher_adjustments` no valida contra adjustmentsSchema', async () => {
    const { client } = createClient(
      baseTables({
        ai_evaluations: [
          evaluationRow({
            status: 'reviewed',
            reviewed_at: '2026-09-03T10:00:00.000Z',
            teacher_adjustments: [{ position: 9, id: '', level: 7, reason: '' }],
          }),
        ],
      }),
    );

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    const zoe = report.students.find((student) => student.studentId === 'student-zoe');
    expect(zoe?.evaluation?.teacherAdjustments).toBeNull();
    expect(zoe?.evaluation?.contractViolation).toContain('teacher_adjustments');
  });

  it('conserva los ajustes docentes válidos ya parseados', async () => {
    const { client } = createClient(
      baseTables({
        ai_evaluations: [
          evaluationRow({
            status: 'reviewed',
            reviewed_at: '2026-09-03T10:00:00.000Z',
            teacher_note: 'Revisado en clase.',
            teacher_adjustments: [
              { position: 1, id: 'core.pertinencia', level: 4, reason: 'Sí responde la consigna.' },
            ],
          }),
        ],
      }),
    );

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    const zoe = report.students.find((student) => student.studentId === 'student-zoe');
    expect(zoe?.evaluation?.contractViolation).toBeNull();
    expect(zoe?.evaluation?.teacherAdjustments).toEqual([
      { position: 1, id: 'core.pertinencia', level: 4, reason: 'Sí responde la consigna.' },
    ]);
    expect(zoe?.evaluation?.teacherNote).toBe('Revisado en clase.');
    expect(zoe?.evaluation?.reviewedAt).toBe('2026-09-03T10:00:00.000Z');
  });

  it('toma la última evaluación por `requested_at` aunque las filas lleguen desordenadas', async () => {
    const { client } = createClient(
      baseTables({
        ai_evaluations: [
          evaluationRow({
            id: 'eval-media',
            status: 'failed',
            result_json: null,
            requested_at: '2026-09-02T11:00:00.000Z',
          }),
          evaluationRow({
            id: 'eval-ultima',
            status: 'reviewed',
            reviewed_at: '2026-09-02T13:00:00.000Z',
            requested_at: '2026-09-02T12:00:00.000Z',
          }),
          evaluationRow({ id: 'eval-primera', requested_at: '2026-09-02T10:00:00.000Z' }),
        ],
      }),
    );

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    const zoe = report.students.find((student) => student.studentId === 'student-zoe');
    expect(zoe?.evaluation?.id).toBe('eval-ultima');
    expect(zoe?.evaluation?.status).toBe('reviewed');
    expect(zoe?.evaluation?.requestedAt).toBe('2026-09-02T12:00:00.000Z');
  });

  it('mantiene en el reporte al estudiante con acceso que nunca inició la entrega', async () => {
    const { client } = createClient(baseTables());

    const report = await loadDiagnosticReport(client, 'assessment-1', 'group-a');

    const ana = report.students.find((student) => student.studentId === 'student-ana');
    expect(ana).toBeDefined();
    expect(ana?.status).toBe('esperado');
    expect(ana?.submissionId).toBeNull();
    expect(ana?.startedAt).toBeNull();
    expect(ana?.submittedAt).toBeNull();
    expect(ana?.evaluation).toBeNull();
    // Sigue con una fila por pregunta, todas omitidas y sin nivel.
    expect(ana?.responses).toEqual([
      {
        questionId: 'q1',
        position: 1,
        originalText: null,
        wordCount: 0,
        omitted: true,
        submittedAt: null,
      },
      {
        questionId: 'q2',
        position: 2,
        originalText: null,
        wordCount: 0,
        omitted: true,
        submittedAt: null,
      },
    ]);
  });
});
