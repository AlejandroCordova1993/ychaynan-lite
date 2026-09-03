// Contrato único del asistente de borradores. Lo comparten la Edge Function y el navegador
// para que servidor y cliente apliquen exactamente los mismos límites y la misma validación.
// El archivo no depende de Deno, de Node ni de librerías externas: solo TypeScript estándar.
import { ACTIVE_CRITERIA_IDS, ACTIVE_MODULE_IDS } from './assessmentRubric.ts';

export const GENERATION_LIMITS = {
  readingMaxChars: 30_000,
  purposeMaxChars: 1_000,
  titleMaxChars: 160,
  generalInstructionsMaxChars: 6_000,
  promptMaxChars: 2_000,
  questionInstructionsMaxChars: 4_000,
  minQuestions: 1,
  maxQuestions: 4,
  defaultQuestions: 3,
  minWordsMax: 2_000,
  maxWordsMax: 3_000,
} as const;

export const GENERATION_FOCUSES = [
  'balanced',
  'reading_comprehension',
  'critical_reasoning',
  'writing_conventions',
] as const;

export type GenerationFocus = (typeof GENERATION_FOCUSES)[number];

export interface GenerateAssessmentInput {
  readingText: string;
  purpose?: string;
  questionCount: number;
  focus: GenerationFocus;
}

export interface GeneratedQuestion {
  position: number;
  prompt: string;
  instructions: string;
  suggestedMinWords: number | null;
  suggestedMaxWords: number | null;
  activeCriteria: string[];
  activeModules: string[];
  curriculumLinks: Record<string, never>;
}

export interface GeneratedAssessmentDraft {
  title: string;
  purpose: string;
  generalInstructions: string;
  questions: GeneratedQuestion[];
}

export type GenerationErrorCode =
  | 'invalid_session'
  | 'forbidden'
  | 'invalid_request'
  | 'ai_not_configured'
  | 'ai_timeout'
  | 'invalid_ai_response'
  | 'provider_unavailable'
  | 'method_not_allowed';

/**
 * `detail` es una razón estable pensada para decidir mensajes locales del navegador.
 * Nunca se serializa hacia el cliente desde la Edge Function.
 */
export class GenerationError extends Error {
  readonly code: GenerationErrorCode;
  readonly detail: string;

  constructor(code: GenerationErrorCode, detail: string = code) {
    super(`${code}:${detail}`);
    this.name = 'GenerationError';
    this.code = code;
    this.detail = detail;
  }
}

export const GENERATION_ERROR_CATALOG: Record<
  GenerationErrorCode,
  { status: number; message: string }
> = {
  invalid_session: { status: 401, message: 'Tu sesión no es válida. Vuelve a ingresar.' },
  forbidden: { status: 403, message: 'Tu cuenta no tiene permiso para usar el asistente.' },
  invalid_request: { status: 400, message: 'La solicitud no cumple los límites del asistente.' },
  ai_not_configured: { status: 503, message: 'El asistente de IA no está configurado.' },
  ai_timeout: { status: 504, message: 'El asistente tardó demasiado. Inténtalo nuevamente.' },
  invalid_ai_response: {
    status: 502,
    message: 'La IA devolvió una propuesta incompleta o inválida.',
  },
  provider_unavailable: {
    status: 502,
    message: 'El asistente no está disponible en este momento. Inténtalo nuevamente.',
  },
  method_not_allowed: { status: 405, message: 'Método no permitido.' },
};

export interface GenerationErrorBody {
  ok: false;
  error: { code: GenerationErrorCode; message: string };
}

export function generationErrorBody(code: GenerationErrorCode): GenerationErrorBody {
  return { ok: false, error: { code, message: GENERATION_ERROR_CATALOG[code].message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidRequest(detail: string): never {
  throw new GenerationError('invalid_request', detail);
}

function invalidDraft(detail: string): never {
  throw new GenerationError('invalid_ai_response', detail);
}

/**
 * Valida la solicitud del docente. No rechaza claves adicionales porque la función se
 * despliega por separado del frontend y una clave nueva no debe romper un cliente antiguo.
 */
export function parseGenerationRequest(body: unknown): GenerateAssessmentInput {
  if (!isRecord(body)) invalidRequest('body');
  const data = body;

  const rawReading = typeof data.readingText === 'string' ? data.readingText.trim() : '';
  if (!rawReading) invalidRequest('reading_empty');
  if (rawReading.length > GENERATION_LIMITS.readingMaxChars) invalidRequest('reading_too_long');

  const rawCount = data.questionCount ?? GENERATION_LIMITS.defaultQuestions;
  if (
    typeof rawCount !== 'number' ||
    !Number.isInteger(rawCount) ||
    rawCount < GENERATION_LIMITS.minQuestions ||
    rawCount > GENERATION_LIMITS.maxQuestions
  ) {
    invalidRequest('question_count');
  }

  const rawFocus = data.focus ?? 'balanced';
  if (
    typeof rawFocus !== 'string' ||
    !(GENERATION_FOCUSES as readonly string[]).includes(rawFocus)
  ) {
    invalidRequest('focus');
  }

  let purpose: string | undefined;
  if (data.purpose !== undefined && data.purpose !== null) {
    if (typeof data.purpose !== 'string') invalidRequest('purpose_too_long');
    const trimmed = data.purpose.trim();
    if (trimmed.length > GENERATION_LIMITS.purposeMaxChars) invalidRequest('purpose_too_long');
    purpose = trimmed || undefined;
  }

  return {
    readingText: rawReading,
    purpose,
    questionCount: rawCount,
    focus: rawFocus as GenerationFocus,
  };
}

const DRAFT_FIELDS: ReadonlySet<string> = new Set([
  'title',
  'purpose',
  'generalInstructions',
  'questions',
]);
const QUESTION_FIELDS: ReadonlySet<string> = new Set([
  'position',
  'prompt',
  'instructions',
  'suggestedMinWords',
  'suggestedMaxWords',
  'activeCriteria',
  'activeModules',
  'curriculumLinks',
]);

/** El conjunto de claves debe coincidir exactamente: ni de más ni de menos. */
function assertExactFields(value: Record<string, unknown>, expected: ReadonlySet<string>) {
  const present = new Set(Object.keys(value));
  for (const key of present) {
    if (!expected.has(key)) invalidDraft('unexpected_field');
  }
  for (const key of expected) {
    if (!present.has(key)) invalidDraft('missing_field');
  }
}

function draftText(value: unknown, max: number, required: boolean): string {
  if (typeof value !== 'string') invalidDraft('text');
  const text = value.trim();
  if (required && !text) invalidDraft('text');
  if (text.length > max) invalidDraft('text');
  return text;
}

function draftWordBound(value: unknown, min: number, max: number): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    invalidDraft('word_range');
  }
  return value;
}

function draftIdList(value: unknown, allowed: ReadonlySet<string>, kind: 'criterion' | 'module') {
  if (!Array.isArray(value)) invalidDraft(`unknown_${kind}`);
  // El conjunto conserva el orden de inserción, así que la lista devuelta respeta el
  // orden original. Los duplicados se rechazan, nunca se normalizan en silencio.
  const unique = new Set<string>();
  for (const id of value) {
    if (typeof id !== 'string' || !allowed.has(id)) invalidDraft(`unknown_${kind}`);
    if (unique.has(id)) invalidDraft(`duplicated_${kind}`);
    unique.add(id);
  }
  return [...unique];
}

/**
 * Validación estricta y única de la propuesta de la IA. No corrige, no filtra y no
 * deduplica en silencio: cualquier desviación se rechaza con una razón estable.
 */
export function parseGeneratedDraft(
  value: unknown,
  expectedCount: number,
): GeneratedAssessmentDraft {
  if (!isRecord(value)) invalidDraft('shape');
  assertExactFields(value, DRAFT_FIELDS);

  if (!Array.isArray(value.questions) || value.questions.length !== expectedCount) {
    invalidDraft('question_count');
  }

  const questions = value.questions.map((raw, index) => {
    if (!isRecord(raw)) invalidDraft('shape');
    assertExactFields(raw, QUESTION_FIELDS);

    if (raw.position !== index + 1) invalidDraft('position');

    const activeCriteria = draftIdList(raw.activeCriteria, ACTIVE_CRITERIA_IDS, 'criterion');
    if (activeCriteria.length === 0) invalidDraft('criteria_empty');
    const activeModules = draftIdList(raw.activeModules, ACTIVE_MODULE_IDS, 'module');

    const suggestedMinWords = draftWordBound(
      raw.suggestedMinWords,
      0,
      GENERATION_LIMITS.minWordsMax,
    );
    const suggestedMaxWords = draftWordBound(
      raw.suggestedMaxWords,
      1,
      GENERATION_LIMITS.maxWordsMax,
    );
    if (
      suggestedMinWords !== null &&
      suggestedMaxWords !== null &&
      suggestedMinWords > suggestedMaxWords
    ) {
      invalidDraft('word_range');
    }

    // La alineación curricular es una decisión docente: la IA no puede proponerla.
    if (!isRecord(raw.curriculumLinks) || Object.keys(raw.curriculumLinks).length > 0) {
      invalidDraft('curriculum_links_not_empty');
    }

    return {
      position: index + 1,
      prompt: draftText(raw.prompt, GENERATION_LIMITS.promptMaxChars, true),
      instructions: draftText(
        raw.instructions,
        GENERATION_LIMITS.questionInstructionsMaxChars,
        false,
      ),
      suggestedMinWords,
      suggestedMaxWords,
      activeCriteria,
      activeModules,
      curriculumLinks: {} as Record<string, never>,
    };
  });

  return {
    title: draftText(value.title, GENERATION_LIMITS.titleMaxChars, true),
    purpose: draftText(value.purpose, GENERATION_LIMITS.purposeMaxChars, true),
    generalInstructions: draftText(
      value.generalInstructions,
      GENERATION_LIMITS.generalInstructionsMaxChars,
      false,
    ),
    questions,
  };
}
