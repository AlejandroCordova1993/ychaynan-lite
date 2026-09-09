/**
 * Modelo normalizado del resumen diagnóstico y aplicación estricta del
 * resultado efectivo (spec §4.1).
 *
 * Este módulo es puro, síncrono y determinista: no conoce React, ni Supabase,
 * ni CSV/Excel, ni realiza entrada/salida de ningún tipo. Recibe un reporte ya
 * cargado y validado por `src/lib/api/diagnosticReport.ts` y devuelve tipos y
 * resultados calculados. Las dimensiones, criterios y códigos de observación
 * provienen de `supabase/functions/_shared/aiEvaluation.ts`; aquí no se
 * redefinen.
 */
import type {
  EvaluationLevel,
  EvaluationObservation,
  EvaluationResult,
  EvaluationReview,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import { adjustmentsSchema, type TeacherAdjustment } from '../../lib/api/evaluationReview';
import type { SubmissionOverviewStatus } from '../../lib/api/submissions';

/* ------------------------------------------------------------------ *
 * Entrada normalizada
 * ------------------------------------------------------------------ */

export interface DiagnosticAssessmentMeta {
  id: string;
  title: string;
  /** `open` | `closed` | `archived`, tal como lo devuelve `assessments.status`. */
  status: string;
  openedAt: string | null;
}

export interface DiagnosticGroupMeta {
  id: string;
  name: string;
  schoolYear: string;
}

/** Pregunta congelada de la evaluación, común a todos los estudiantes. */
export interface DiagnosticQuestion {
  questionId: string;
  position: number;
  prompt: string;
  instructions: string;
  activeCriteria: string[];
  activeModules: string[];
  suggestedMinWords: number | null;
  suggestedMaxWords: number | null;
}

/** Respuesta original del estudiante; nunca se recorta ni se sintetiza. */
export interface DiagnosticResponse {
  questionId: string;
  position: number;
  originalText: string | null;
  wordCount: number;
  omitted: boolean;
  submittedAt: string | null;
}

/**
 * Última fila de `ai_evaluations` de la entrega según `requested_at`, con su
 * `result_json` ya validado con `parseEvaluationResult`.
 */
export interface DiagnosticEvaluation {
  id: string;
  status: SubmissionEvaluationStatus;
  /** `result_json` ya interpretado; `null` si la fila no trae uno utilizable. */
  result: EvaluationResult | null;
  confidence: number | null;
  requestedAt: string;
  completedAt: string | null;
  errorCode: string | null;
  teacherAdjustments: TeacherAdjustment[] | null;
  teacherNote: string | null;
  reviewedAt: string | null;
  /**
   * Detalle corto de una violación de contrato detectada por el cargador
   * (por ejemplo `result_json` o `teacher_adjustments` que no validan). Cuando
   * viene poblado, la entrega bloquea el informe en vez de excluirse en
   * silencio (§9).
   */
  contractViolation: string | null;
}

export interface DiagnosticStudentEntry {
  studentId: string;
  studentName: string;
  /** Estado crudo de `assessment_access.state`. */
  accessState: string;
  /** Estado derivado con `mapAccessState` de `src/lib/api/submissions.ts`. */
  status: SubmissionOverviewStatus;
  submissionId: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  responses: DiagnosticResponse[];
  evaluation: DiagnosticEvaluation | null;
}

export interface DiagnosticReport {
  assessment: DiagnosticAssessmentMeta;
  group: DiagnosticGroupMeta;
  questions: DiagnosticQuestion[];
  students: DiagnosticStudentEntry[];
  /** Fecha y hora exactas del corte con el que se cargó el reporte. */
  loadedAt: string;
}

/* ------------------------------------------------------------------ *
 * Resultado efectivo (§4.1)
 * ------------------------------------------------------------------ */

export type EffectiveSource = 'provisional_ia' | 'revisado_docente';
export type EffectiveJudgmentKind = 'criterion' | 'module';

export interface EffectiveJudgment {
  position: number;
  kind: EffectiveJudgmentKind;
  id: string;
  /** Nivel vigente: el de `result_json` o el del ajuste docente. */
  level: EvaluationLevel;
  /** Razón vigente, con la misma regla que `level`. */
  reason: string;
  originalLevel: EvaluationLevel;
  originalReason: string;
  adjusted: boolean;
  confidence: number;
  /** Revisión de evidencia informada por la IA; el ajuste docente no la borra. */
  review: EvaluationReview;
  evidences: string[];
}

export interface EffectiveQuestionResult {
  position: number;
  judgments: EffectiveJudgment[];
  observations: EvaluationObservation[];
  strengths: string[];
  priorities: string[];
}

export interface EffectiveResult {
  evaluationId: string;
  source: EffectiveSource;
  questions: EffectiveQuestionResult[];
  globalConfidence: number;
  limitations: string[];
  requestedAt: string;
  reviewedAt: string | null;
}

export type DiagnosticContractErrorCode =
  | 'invalid_payload'
  | 'adjustment_invalid_shape'
  | 'adjustment_duplicated'
  | 'adjustment_unknown_target';

export interface DiagnosticContractError {
  code: DiagnosticContractErrorCode;
  studentId: string;
  submissionId: string | null;
  evaluationId: string | null;
  /** Pregunta del ajuste conflictivo, si el error apunta a una. */
  position: number | null;
  /** Identificador de criterio o módulo del ajuste conflictivo, si aplica. */
  id: string | null;
  detail: string;
}

export type EffectiveUnusableReason =
  'no_evaluation' | 'in_progress' | 'failed' | 'discarded' | 'missing_result';

/**
 * Unión discriminada: el caso de error de contrato no se puede ignorar sin que
 * TypeScript lo señale. No se usa `throw` porque es un error de negocio
 * esperado; las excepciones quedan para errores de programación.
 */
export type EffectiveResultOutcome =
  | { status: 'usable'; result: EffectiveResult }
  | { status: 'unusable'; reason: EffectiveUnusableReason }
  | { status: 'contract_error'; error: DiagnosticContractError };

export interface EffectiveResultInput {
  studentId: string;
  submissionId: string | null;
  evaluation: DiagnosticEvaluation | null;
}

/** Clave `posición + identificador`; el separador nulo evita colisiones. */
function targetKey(position: number, id: string): string {
  return `${position}\u0000${id}`;
}

export function applyEffectiveResult(input: EffectiveResultInput): EffectiveResultOutcome {
  const evaluation = input.evaluation;
  if (!evaluation) return { status: 'unusable', reason: 'no_evaluation' };

  const fail = (
    code: DiagnosticContractErrorCode,
    detail: string,
    target?: { position: number; id: string },
  ): EffectiveResultOutcome => ({
    status: 'contract_error',
    error: {
      code,
      studentId: input.studentId,
      submissionId: input.submissionId,
      evaluationId: evaluation.id,
      position: target?.position ?? null,
      id: target?.id ?? null,
      detail,
    },
  });

  if (evaluation.contractViolation) return fail('invalid_payload', evaluation.contractViolation);

  if (evaluation.status === 'pending' || evaluation.status === 'running') {
    return { status: 'unusable', reason: 'in_progress' };
  }
  if (evaluation.status === 'failed') return { status: 'unusable', reason: 'failed' };
  if (evaluation.status === 'discarded') return { status: 'unusable', reason: 'discarded' };
  if (!evaluation.result) return { status: 'unusable', reason: 'missing_result' };

  const result = evaluation.result;
  const source: EffectiveSource =
    evaluation.status === 'reviewed' ? 'revisado_docente' : 'provisional_ia';

  // Los ajustes solo rigen sobre una evaluación revisada. En cualquier otro
  // estado el resultado sale de `result_json` sin tocar.
  const adjustments = new Map<string, TeacherAdjustment>();
  if (evaluation.status === 'reviewed' && evaluation.teacherAdjustments !== null) {
    const parsed = adjustmentsSchema.safeParse(evaluation.teacherAdjustments);
    if (!parsed.success) {
      return fail('adjustment_invalid_shape', parsed.error.issues[0]?.message ?? 'adjustments');
    }
    const targets = new Set<string>();
    for (const question of result.questionResults) {
      for (const criterion of question.criteria) {
        targets.add(targetKey(question.position, criterion.criterionId));
      }
      for (const moduleResult of question.modules) {
        targets.add(targetKey(question.position, moduleResult.moduleId));
      }
    }
    // Se validan TODOS los ajustes antes de aplicar cualquiera: si uno falla,
    // la entrega completa queda bloqueada y ninguno se aplica (§4.1).
    for (const adjustment of parsed.data) {
      const key = targetKey(adjustment.position, adjustment.id);
      const target = { position: adjustment.position, id: adjustment.id };
      if (adjustments.has(key)) return fail('adjustment_duplicated', key, target);
      if (!targets.has(key)) return fail('adjustment_unknown_target', key, target);
      adjustments.set(key, adjustment);
    }
  }

  const judgment = (
    position: number,
    kind: EffectiveJudgmentKind,
    id: string,
    original: {
      level: EvaluationLevel;
      reason: string;
      confidence: number;
      review: EvaluationReview;
      evidences: string[];
    },
  ): EffectiveJudgment => {
    const adjustment = adjustments.get(targetKey(position, id));
    return {
      position,
      kind,
      id,
      level: adjustment ? adjustment.level : original.level,
      reason: adjustment ? adjustment.reason : original.reason,
      originalLevel: original.level,
      originalReason: original.reason,
      adjusted: adjustment !== undefined,
      confidence: original.confidence,
      review: original.review,
      evidences: [...original.evidences],
    };
  };

  return {
    status: 'usable',
    result: {
      evaluationId: evaluation.id,
      source,
      questions: result.questionResults.map((question) => ({
        position: question.position,
        judgments: [
          ...question.criteria.map((criterion) =>
            judgment(question.position, 'criterion', criterion.criterionId, criterion),
          ),
          ...question.modules.map((moduleResult) =>
            judgment(question.position, 'module', moduleResult.moduleId, moduleResult),
          ),
        ],
        observations: question.observations.map((observation) => ({ ...observation })),
        strengths: [...question.strengths],
        priorities: [...question.priorities],
      })),
      globalConfidence: result.globalConfidence,
      limitations: [...result.limitations],
      requestedAt: evaluation.requestedAt,
      reviewedAt: evaluation.reviewedAt,
    },
  };
}
