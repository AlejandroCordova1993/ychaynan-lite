import { describe, expect, it } from 'vitest';
import type {
  CriterionEvaluation,
  EvaluationLevel,
  EvaluationResult,
  ModuleEvaluation,
  QuestionEvaluation,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { EVALUATION_DIMENSIONS } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { TeacherAdjustment } from '../../lib/api/evaluationReview';
import { applyEffectiveResult, type DiagnosticEvaluation } from './diagnosticModel';

function criterion(
  criterionId: string,
  level: EvaluationLevel,
  extra: Partial<CriterionEvaluation> = {},
): CriterionEvaluation {
  return {
    criterionId,
    level,
    reason: `Razón IA de ${criterionId}`,
    evidences: ['fragmento'],
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
    reason: `Razón IA de ${moduleId}`,
    evidences: ['fragmento'],
    confidence: 0.7,
    review: 'none',
    ...extra,
  };
}

function question(
  position: number,
  criteria: CriterionEvaluation[],
  modules: ModuleEvaluation[] = [],
): QuestionEvaluation {
  return { position, criteria, modules, observations: [], strengths: [], priorities: [] };
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

function evaluation(overrides: Partial<DiagnosticEvaluation> = {}): DiagnosticEvaluation {
  return {
    id: 'eval-1',
    status: 'completed',
    result: evaluationResult([
      question(1, [criterion('core.pertinencia', 3), criterion('core.cohesion', 2)]),
      question(
        2,
        [criterion('core.pertinencia', 4)],
        [moduleResult('optional.proposito_punto_vista', 2)],
      ),
    ]),
    confidence: 0.8,
    requestedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:02:00.000Z',
    errorCode: null,
    teacherAdjustments: null,
    teacherNote: null,
    reviewedAt: null,
    contractViolation: null,
    ...overrides,
  };
}

function input(evaluationRow: DiagnosticEvaluation | null) {
  return { studentId: 'stu-1', submissionId: 'sub-1', evaluation: evaluationRow };
}

function snapshot(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function levelOf(
  outcome: ReturnType<typeof applyEffectiveResult>,
  position: number,
  id: string,
): EvaluationLevel | undefined {
  if (outcome.status !== 'usable') return undefined;
  return outcome.result.questions
    .find((item) => item.position === position)
    ?.judgments.find((item) => item.id === id)?.level;
}

describe('applyEffectiveResult — resultado efectivo (§4.1)', () => {
  it('marca una evaluación completed como provisional de IA y conserva niveles y razones', () => {
    const outcome = applyEffectiveResult(input(evaluation()));

    expect(outcome.status).toBe('usable');
    if (outcome.status !== 'usable') throw new Error('resultado esperado utilizable');
    expect(outcome.result.source).toBe('provisional_ia');
    expect(levelOf(outcome, 1, 'core.pertinencia')).toBe(3);
    expect(levelOf(outcome, 2, 'optional.proposito_punto_vista')).toBe(2);
    const judgment = outcome.result.questions[0].judgments[0];
    expect(judgment.adjusted).toBe(false);
    expect(judgment.reason).toBe('Razón IA de core.pertinencia');
    expect(judgment.originalLevel).toBe(3);
  });

  it('sustituye exactamente el criterio ajustado y conserva el resto del result_json', () => {
    const row = evaluation({
      status: 'reviewed',
      reviewedAt: '2026-09-02T08:00:00.000Z',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'La docente ve cohesión sólida.' },
      ],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('usable');
    if (outcome.status !== 'usable') throw new Error('resultado esperado utilizable');
    expect(outcome.result.source).toBe('revisado_docente');
    expect(levelOf(outcome, 1, 'core.cohesion')).toBe(4);
    expect(levelOf(outcome, 1, 'core.pertinencia')).toBe(3);
    expect(levelOf(outcome, 2, 'core.pertinencia')).toBe(4);

    const adjusted = outcome.result.questions[0].judgments.find(
      (item) => item.id === 'core.cohesion',
    );
    expect(adjusted?.adjusted).toBe(true);
    expect(adjusted?.reason).toBe('La docente ve cohesión sólida.');
    expect(adjusted?.originalLevel).toBe(2);
    expect(adjusted?.originalReason).toBe('Razón IA de core.cohesion');

    const untouched = outcome.result.questions[0].judgments.find(
      (item) => item.id === 'core.pertinencia',
    );
    expect(untouched?.adjusted).toBe(false);
  });

  it('no muta el result_json original al aplicar un ajuste docente', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        {
          position: 2,
          id: 'optional.proposito_punto_vista',
          level: 4,
          reason: 'Módulo corregido.',
        },
      ],
    });
    const before = snapshot(row.result);
    deepFreeze(row.result);

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('usable');
    expect(levelOf(outcome, 2, 'optional.proposito_punto_vista')).toBe(4);
    expect(snapshot(row.result)).toEqual(before);
    expect(row.result?.questionResults[1].modules[0].level).toBe(2);
  });

  it('bloquea la entrega completa cuando hay dos ajustes con la misma posición e identificador', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'Primero.' },
        { position: 2, id: 'core.pertinencia', level: 1, reason: 'Segundo.' },
        { position: 1, id: 'core.cohesion', level: 1, reason: 'Duplicado.' },
      ],
    });
    const before = snapshot(row.result);

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('contract_error');
    if (outcome.status !== 'contract_error') throw new Error('error de contrato esperado');
    expect(outcome.error.code).toBe('adjustment_duplicated');
    expect(outcome.error.submissionId).toBe('sub-1');
    expect(outcome.error.studentId).toBe('stu-1');
    expect(outcome.error.evaluationId).toBe('eval-1');
    expect(outcome.error.position).toBe(1);
    expect(outcome.error.id).toBe('core.cohesion');
    // Ninguno de los ajustes de esa entrega se aplica: no hay resultado y el
    // original sigue intacto (nunca una aplicación parcial).
    expect('result' in outcome).toBe(false);
    expect(snapshot(row.result)).toEqual(before);
  });

  it('bloquea la entrega completa cuando un ajuste apunta a una posición inexistente', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'Válido.' },
        { position: 3, id: 'core.pertinencia', level: 1, reason: 'Pregunta inexistente.' },
      ],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('contract_error');
    if (outcome.status !== 'contract_error') throw new Error('error de contrato esperado');
    expect(outcome.error.code).toBe('adjustment_unknown_target');
    expect(outcome.error.position).toBe(3);
    expect('result' in outcome).toBe(false);
  });

  it('bloquea la entrega completa cuando un ajuste apunta a un criterio inactivo en esa pregunta', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'Válido.' },
        {
          position: 2,
          id: 'core.cohesion',
          level: 1,
          reason: 'Criterio inactivo en la pregunta 2.',
        },
      ],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('contract_error');
    if (outcome.status !== 'contract_error') throw new Error('error de contrato esperado');
    expect(outcome.error.code).toBe('adjustment_unknown_target');
    expect(outcome.error.position).toBe(2);
    expect(outcome.error.id).toBe('core.cohesion');
  });

  it('bloquea la entrega completa cuando un ajuste tiene forma inválida', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'Válido.' },
        { position: 1, id: 'core.pertinencia', level: 7, reason: 'Nivel inexistente.' },
      ] as unknown as TeacherAdjustment[],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('contract_error');
    if (outcome.status !== 'contract_error') throw new Error('error de contrato esperado');
    expect(outcome.error.code).toBe('adjustment_invalid_shape');
    expect(outcome.error.submissionId).toBe('sub-1');
    expect('result' in outcome).toBe(false);
  });

  it('propaga como error de contrato una violación detectada por el cargador', () => {
    const row = evaluation({ status: 'completed', result: null, contractViolation: 'result_json' });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('contract_error');
    if (outcome.status !== 'contract_error') throw new Error('error de contrato esperado');
    expect(outcome.error.code).toBe('invalid_payload');
    expect(outcome.error.detail).toBe('result_json');
  });

  it('aplica un ajuste con nivel no_aplica sin convertirlo en cero', () => {
    const row = evaluation({
      status: 'reviewed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 'no_aplica', reason: 'No corresponde.' },
      ],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(levelOf(outcome, 1, 'core.cohesion')).toBe('no_aplica');
  });

  it('ignora los ajustes de una evaluación que todavía no fue revisada', () => {
    const row = evaluation({
      status: 'completed',
      teacherAdjustments: [
        { position: 1, id: 'core.cohesion', level: 4, reason: 'Borrador sin revisar.' },
      ],
    });

    const outcome = applyEffectiveResult(input(row));

    expect(outcome.status).toBe('usable');
    if (outcome.status !== 'usable') throw new Error('resultado esperado utilizable');
    expect(outcome.result.source).toBe('provisional_ia');
    expect(levelOf(outcome, 1, 'core.cohesion')).toBe(2);
  });

  it.each([
    ['pending', 'in_progress'],
    ['running', 'in_progress'],
    ['failed', 'failed'],
    ['discarded', 'discarded'],
  ] as const)('no entrega resultado utilizable con estado %s', (status, reason) => {
    const outcome = applyEffectiveResult(input(evaluation({ status })));

    expect(outcome.status).toBe('unusable');
    if (outcome.status !== 'unusable') throw new Error('resultado esperado no utilizable');
    expect(outcome.reason).toBe(reason);
  });

  it('no entrega resultado utilizable cuando la entrega no tiene evaluación', () => {
    const outcome = applyEffectiveResult(input(null));

    expect(outcome.status).toBe('unusable');
    if (outcome.status !== 'unusable') throw new Error('resultado esperado no utilizable');
    expect(outcome.reason).toBe('no_evaluation');
  });

  it('no entrega resultado utilizable cuando falta el result_json', () => {
    const outcome = applyEffectiveResult(input(evaluation({ status: 'reviewed', result: null })));

    expect(outcome.status).toBe('unusable');
    if (outcome.status !== 'unusable') throw new Error('resultado esperado no utilizable');
    expect(outcome.reason).toBe('missing_result');
  });
});
