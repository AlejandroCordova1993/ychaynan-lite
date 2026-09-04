import { ACTIVE_CRITERIA_IDS, ACTIVE_MODULE_IDS } from './assessmentRubric.ts';

export const EVALUATION_PROMPT_VERSION = 'evaluation-v1.0';

export const EVALUATION_LIMITS = {
  responseMaxChars: 20_000,
  reasonMaxChars: 1_200,
  evidenceMaxChars: 600,
  evidenceCountMax: 4,
  observationFragmentMaxChars: 600,
  observationExplanationMaxChars: 1_200,
  textItemMaxChars: 600,
  textItemCountMax: 8,
  limitationCountMax: 8,
} as const;

export const EVALUATION_DIMENSIONS = [
  'comprension_lectora',
  'respuesta_razonamiento',
  'organizacion_discursiva',
  'convenciones_escritura',
] as const;
export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

export const EVALUATION_OBSERVATION_CODES = [
  'TIPO',
  'ORT-L',
  'ORT-A',
  'MAY',
  'PUNT',
  'CONC',
  'VERB',
  'PREP',
  'SINT',
  'REF',
  'CONEC',
  'LEX',
  'REG',
  'REP',
  'PARA',
  'COH',
  'PERT',
  'TESIS',
  'EVID',
  'RAZ',
  'INF',
  'CRIT',
  'AMB',
  'FAL',
  'FUENTE',
  'CIT',
  'PERS',
] as const;
const OBSERVATION_CODES = new Set<string>(EVALUATION_OBSERVATION_CODES);
const CRITERION_IDS: ReadonlySet<string> = ACTIVE_CRITERIA_IDS;
const MODULE_IDS: ReadonlySet<string> = ACTIVE_MODULE_IDS;

export type EvaluationLevel = 1 | 2 | 3 | 4 | 'no_aplica';
export type EvaluationReview = 'none' | 'needs_evidence_review' | 'needs_teacher_review';
export type ObservationSeverity = 'low' | 'medium' | 'high';

export interface EvaluationQuestion {
  position: number;
  prompt: string;
  instructions: string;
  responseText: string;
  wordCount: number;
  activeCriteria: string[];
  activeModules: string[];
  suggestedMinWords?: number | null;
  suggestedMaxWords?: number | null;
}

export interface CriterionEvaluation {
  criterionId: string;
  level: EvaluationLevel;
  reason: string;
  evidences: string[];
  confidence: number;
  review: EvaluationReview;
}

export interface ModuleEvaluation {
  moduleId: string;
  level: EvaluationLevel;
  reason: string;
  evidences: string[];
  confidence: number;
  review: EvaluationReview;
}

export interface EvaluationObservation {
  code: string;
  fragment: string;
  explanation: string;
  severity: ObservationSeverity;
}

export interface QuestionEvaluation {
  position: number;
  criteria: CriterionEvaluation[];
  modules: ModuleEvaluation[];
  observations: EvaluationObservation[];
  strengths: string[];
  priorities: string[];
}

export interface DimensionSummary {
  dimension: EvaluationDimension;
  applicableCriteria: number;
  scoredCriteria: number;
  averageLevel: number | null;
  confidence: number;
  strengths: string[];
  priorities: string[];
}

export interface EvaluationResult {
  questionResults: QuestionEvaluation[];
  dimensionSummaries: DimensionSummary[];
  globalConfidence: number;
  limitations: string[];
}

export type EvaluationErrorCode =
  | 'invalid_session'
  | 'forbidden'
  | 'invalid_request'
  | 'submission_not_found'
  | 'submission_not_submitted'
  | 'evaluation_in_progress'
  | 'already_evaluated'
  | 'ai_not_configured'
  | 'ai_timeout'
  | 'invalid_ai_response'
  | 'provider_unavailable'
  | 'persist_failed'
  | 'method_not_allowed';

export const EVALUATION_ERROR_CATALOG: Record<
  EvaluationErrorCode,
  { status: number; message: string }
> = {
  invalid_session: { status: 401, message: 'Tu sesión no es válida. Vuelve a ingresar.' },
  forbidden: { status: 403, message: 'Tu cuenta no tiene permiso para evaluar entregas.' },
  invalid_request: { status: 400, message: 'La solicitud de evaluación no es válida.' },
  submission_not_found: { status: 404, message: 'No encontramos esa entrega.' },
  submission_not_submitted: {
    status: 409,
    message: 'La entrega todavía no está lista para evaluar.',
  },
  evaluation_in_progress: { status: 409, message: 'La evaluación ya está en curso.' },
  already_evaluated: { status: 200, message: 'La entrega ya cuenta con una evaluación.' },
  ai_not_configured: { status: 503, message: 'La evaluación con IA no está configurada.' },
  ai_timeout: { status: 504, message: 'La evaluación tardó demasiado. Inténtalo nuevamente.' },
  invalid_ai_response: {
    status: 502,
    message: 'La IA devolvió una evaluación incompleta o inválida.',
  },
  provider_unavailable: {
    status: 502,
    message: 'La evaluación con IA no está disponible en este momento.',
  },
  persist_failed: { status: 500, message: 'No pudimos guardar la evaluación.' },
  method_not_allowed: { status: 405, message: 'Método no permitido.' },
};

export class EvaluationError extends Error {
  readonly code: EvaluationErrorCode;
  readonly detail: string;

  constructor(code: EvaluationErrorCode, detail: string = code) {
    super(`${code}:${detail}`);
    this.name = 'EvaluationError';
    this.code = code;
    this.detail = detail;
  }
}

export interface EvaluationErrorBody {
  ok: false;
  error: { code: EvaluationErrorCode; message: string };
}

export function evaluationErrorBody(code: EvaluationErrorCode): EvaluationErrorBody {
  return { ok: false, error: { code, message: EVALUATION_ERROR_CATALOG[code].message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidRequest(detail: string): never {
  throw new EvaluationError('invalid_request', detail);
}

function invalidResponse(detail: string): never {
  throw new EvaluationError('invalid_ai_response', detail);
}

function assertExactFields(value: Record<string, unknown>, expected: ReadonlySet<string>): void {
  const present = new Set(Object.keys(value));
  for (const key of present) if (!expected.has(key)) invalidResponse('unexpected_field');
  for (const key of expected) if (!present.has(key)) invalidResponse('missing_field');
}

function text(value: unknown, max: number, detail = 'text'): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalidResponse(detail);
  return value.trim();
}

function textList(value: unknown, maxItems: number, maxChars: number, detail: string): string[] {
  if (!Array.isArray(value) || value.length > maxItems) invalidResponse(detail);
  return value.map((item) => text(item, maxChars, detail));
}

function confidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    invalidResponse('confidence');
  }
  return value;
}

function level(value: unknown): EvaluationLevel {
  if (value === 'no_aplica') return value;
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  invalidResponse('level');
}

function review(value: unknown): EvaluationReview {
  if (value === 'none' || value === 'needs_evidence_review' || value === 'needs_teacher_review') {
    return value;
  }
  invalidResponse('review');
}

function parseCriterionResult(value: unknown, allowedId: string): CriterionEvaluation {
  if (!isRecord(value)) invalidResponse('criterion_shape');
  const expected = new Set(['criterionId', 'level', 'reason', 'evidences', 'confidence', 'review']);
  assertExactFields(value, expected);
  if (value.criterionId !== allowedId) invalidResponse('criterion_not_allowed');
  return {
    criterionId: allowedId,
    level: level(value.level),
    reason: text(value.reason, EVALUATION_LIMITS.reasonMaxChars),
    evidences: textList(
      value.evidences,
      EVALUATION_LIMITS.evidenceCountMax,
      EVALUATION_LIMITS.evidenceMaxChars,
      'evidence_too_long',
    ),
    confidence: confidence(value.confidence),
    review: review(value.review),
  };
}

function parseModuleResult(value: unknown, allowedId: string): ModuleEvaluation {
  if (!isRecord(value)) invalidResponse('module_shape');
  const expected = new Set(['moduleId', 'level', 'reason', 'evidences', 'confidence', 'review']);
  assertExactFields(value, expected);
  if (value.moduleId !== allowedId) invalidResponse('module_not_allowed');
  return {
    moduleId: allowedId,
    level: level(value.level),
    reason: text(value.reason, EVALUATION_LIMITS.reasonMaxChars),
    evidences: textList(
      value.evidences,
      EVALUATION_LIMITS.evidenceCountMax,
      EVALUATION_LIMITS.evidenceMaxChars,
      'evidence_too_long',
    ),
    confidence: confidence(value.confidence),
    review: review(value.review),
  };
}

function parseObservation(value: unknown): EvaluationObservation {
  if (!isRecord(value)) invalidResponse('observation_shape');
  assertExactFields(value, new Set(['code', 'fragment', 'explanation', 'severity']));
  if (typeof value.code !== 'string' || !OBSERVATION_CODES.has(value.code)) {
    invalidResponse('observation_code');
  }
  if (value.severity !== 'low' && value.severity !== 'medium' && value.severity !== 'high') {
    invalidResponse('observation_severity');
  }
  return {
    code: value.code,
    fragment: text(value.fragment, EVALUATION_LIMITS.observationFragmentMaxChars),
    explanation: text(value.explanation, EVALUATION_LIMITS.observationExplanationMaxChars),
    severity: value.severity,
  };
}

const QUESTION_FIELDS = new Set([
  'position',
  'criteria',
  'modules',
  'observations',
  'strengths',
  'priorities',
]);

const DIMENSION_FIELDS = new Set([
  'dimension',
  'applicableCriteria',
  'scoredCriteria',
  'averageLevel',
  'confidence',
  'strengths',
  'priorities',
]);

export function parseEvaluationRequest(body: unknown): {
  submissionId: string;
  forceRetry: boolean;
} {
  if (!isRecord(body)) invalidRequest('body');
  const keys = new Set(Object.keys(body));
  for (const key of keys)
    if (key !== 'submissionId' && key !== 'forceRetry') invalidRequest('field');
  if (
    typeof body.submissionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.submissionId,
    )
  ) {
    invalidRequest('submission_id');
  }
  if (body.forceRetry !== undefined && typeof body.forceRetry !== 'boolean') {
    invalidRequest('force_retry');
  }
  return { submissionId: body.submissionId, forceRetry: body.forceRetry === true };
}

export function parseEvaluationResult(
  value: unknown,
  questions: EvaluationQuestion[],
): EvaluationResult {
  if (!isRecord(value)) invalidResponse('shape');
  assertExactFields(
    value,
    new Set(['questionResults', 'dimensionSummaries', 'globalConfidence', 'limitations']),
  );
  if (!Array.isArray(value.questionResults) || value.questionResults.length !== questions.length) {
    invalidResponse('question_results');
  }
  const questionResults = value.questionResults.map((raw, index) => {
    if (!isRecord(raw)) invalidResponse('question_shape');
    assertExactFields(raw, QUESTION_FIELDS);
    const question = questions[index];
    if (raw.position !== question.position) invalidResponse('position');
    if (!Array.isArray(raw.criteria)) invalidResponse('criteria_missing');
    const criterionIds = new Set<string>();
    const criteria = raw.criteria.map((criterion) => {
      if (!isRecord(criterion) || typeof criterion.criterionId !== 'string') {
        invalidResponse('criterion_shape');
      }
      if (!CRITERION_IDS.has(criterion.criterionId)) invalidResponse('criterion_not_allowed');
      if (!question.activeCriteria.includes(criterion.criterionId))
        invalidResponse('criterion_not_allowed');
      if (criterionIds.has(criterion.criterionId)) invalidResponse('criterion_duplicated');
      criterionIds.add(criterion.criterionId);
      return parseCriterionResult(criterion, criterion.criterionId);
    });
    for (const id of question.activeCriteria)
      if (!criterionIds.has(id)) invalidResponse('criterion_missing');

    if (!Array.isArray(raw.modules)) invalidResponse('modules_missing');
    const moduleIds = new Set<string>();
    const modules = raw.modules.map((moduleResult) => {
      if (!isRecord(moduleResult) || typeof moduleResult.moduleId !== 'string') {
        invalidResponse('module_shape');
      }
      if (!MODULE_IDS.has(moduleResult.moduleId)) invalidResponse('module_not_allowed');
      if (!question.activeModules.includes(moduleResult.moduleId))
        invalidResponse('module_not_allowed');
      if (moduleIds.has(moduleResult.moduleId)) invalidResponse('module_duplicated');
      moduleIds.add(moduleResult.moduleId);
      return parseModuleResult(moduleResult, moduleResult.moduleId);
    });
    if (raw.modules.length !== question.activeModules.length) invalidResponse('modules_missing');
    for (const id of question.activeModules)
      if (!moduleIds.has(id)) invalidResponse('module_missing');

    if (raw.criteria.length !== question.activeCriteria.length) invalidResponse('criteria_missing');

    if (!Array.isArray(raw.observations) || raw.observations.length > 20)
      invalidResponse('observations');
    return {
      position: question.position,
      criteria,
      modules,
      observations: raw.observations.map(parseObservation),
      strengths: textList(
        raw.strengths,
        EVALUATION_LIMITS.textItemCountMax,
        EVALUATION_LIMITS.textItemMaxChars,
        'strengths',
      ),
      priorities: textList(
        raw.priorities,
        EVALUATION_LIMITS.textItemCountMax,
        EVALUATION_LIMITS.textItemMaxChars,
        'priorities',
      ),
    };
  });

  if (!Array.isArray(value.dimensionSummaries) || value.dimensionSummaries.length !== 4) {
    invalidResponse('dimensions');
  }
  const dimensions = new Set<string>();
  const dimensionSummaries = value.dimensionSummaries.map((raw) => {
    if (!isRecord(raw)) invalidResponse('dimension_shape');
    assertExactFields(raw, DIMENSION_FIELDS);
    if (!EVALUATION_DIMENSIONS.includes(raw.dimension as EvaluationDimension))
      invalidResponse('dimension');
    if (dimensions.has(raw.dimension as string)) invalidResponse('dimension_duplicated');
    dimensions.add(raw.dimension as string);
    if (!Number.isInteger(raw.applicableCriteria) || (raw.applicableCriteria as number) < 0)
      invalidResponse('dimension_count');
    if (
      !Number.isInteger(raw.scoredCriteria) ||
      (raw.scoredCriteria as number) < 0 ||
      (raw.scoredCriteria as number) > (raw.applicableCriteria as number)
    )
      invalidResponse('dimension_count');
    if (
      raw.averageLevel !== null &&
      (typeof raw.averageLevel !== 'number' || raw.averageLevel < 1 || raw.averageLevel > 4)
    )
      invalidResponse('dimension_average');
    return {
      dimension: raw.dimension as EvaluationDimension,
      applicableCriteria: raw.applicableCriteria as number,
      scoredCriteria: raw.scoredCriteria as number,
      averageLevel: raw.averageLevel as number | null,
      confidence: confidence(raw.confidence),
      strengths: textList(
        raw.strengths,
        EVALUATION_LIMITS.textItemCountMax,
        EVALUATION_LIMITS.textItemMaxChars,
        'strengths',
      ),
      priorities: textList(
        raw.priorities,
        EVALUATION_LIMITS.textItemCountMax,
        EVALUATION_LIMITS.textItemMaxChars,
        'priorities',
      ),
    };
  });
  for (const dimension of EVALUATION_DIMENSIONS)
    if (!dimensions.has(dimension)) invalidResponse('dimensions');

  return {
    questionResults,
    dimensionSummaries,
    globalConfidence: confidence(value.globalConfidence),
    limitations: textList(
      value.limitations,
      EVALUATION_LIMITS.limitationCountMax,
      EVALUATION_LIMITS.textItemMaxChars,
      'limitations',
    ),
  };
}

export function normalizeEvidenceForMatch(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

export function markMissingEvidenceForReview(
  result: EvaluationResult,
  questions: EvaluationQuestion[],
  readingText: string,
): EvaluationResult {
  const reading = normalizeEvidenceForMatch(readingText);
  const byPosition = new Map(questions.map((question) => [question.position, question]));
  const verify = <T extends CriterionEvaluation | ModuleEvaluation>(item: T, source: string): T => {
    const evidenceIsValid =
      item.level === 'no_aplica' ||
      (item.evidences.length > 0 &&
        item.evidences.every((evidence) => {
          const normalized = normalizeEvidenceForMatch(evidence);
          return normalized.length > 0 && source.includes(normalized);
        }));
    return evidenceIsValid ? { ...item } : { ...item, review: 'needs_evidence_review' };
  };

  return {
    ...result,
    questionResults: result.questionResults.map((questionResult) => {
      const question = byPosition.get(questionResult.position);
      const source = normalizeEvidenceForMatch(`${reading}\n${question?.responseText ?? ''}`);
      return {
        ...questionResult,
        criteria: questionResult.criteria.map((item) => verify(item, source)),
        modules: questionResult.modules.map((item) => verify(item, source)),
        observations: questionResult.observations.map((item) => ({ ...item })),
        strengths: [...questionResult.strengths],
        priorities: [...questionResult.priorities],
      };
    }),
    dimensionSummaries: result.dimensionSummaries.map((dimension) => ({
      ...dimension,
      strengths: [...dimension.strengths],
      priorities: [...dimension.priorities],
    })),
    limitations: [...result.limitations],
  };
}
