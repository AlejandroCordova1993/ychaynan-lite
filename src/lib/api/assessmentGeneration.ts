import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GENERATION_ERROR_CATALOG,
  GENERATION_LIMITS,
  GenerationError,
  parseGeneratedDraft,
  parseGenerationRequest,
  type GeneratedAssessmentDraft,
  type GenerateAssessmentInput,
  type GenerationErrorCode,
} from '../../../supabase/functions/_shared/aiGeneration.ts';
import type { AssessmentDraftInput } from '../../features/assessment/assessmentSchemas';

export type {
  GeneratedAssessmentDraft,
  GenerationFocus,
} from '../../../supabase/functions/_shared/aiGeneration.ts';
export { GENERATION_LIMITS } from '../../../supabase/functions/_shared/aiGeneration.ts';

export type AssessmentGenerationInput = GenerateAssessmentInput;

/** Códigos locales del navegador para casos que nunca llegan a viajar al servidor. */
type LocalErrorCode = 'reading_empty' | 'reading_too_long' | 'purpose_too_long';

export type AssessmentGenerationErrorCode = GenerationErrorCode | LocalErrorCode;

export class AssessmentGenerationError extends Error {
  readonly code: AssessmentGenerationErrorCode;

  constructor(code: AssessmentGenerationErrorCode, message: string) {
    super(message);
    this.name = 'AssessmentGenerationError';
    this.code = code;
  }
}

// Agrupación fija en miles: el mensaje no debe depender del locale del navegador.
const READING_MAX_LABEL = String(GENERATION_LIMITS.readingMaxChars).replace(
  /\B(?=(\d{3})+(?!\d))/g,
  ' ',
);

const LOCAL_MESSAGES: Record<LocalErrorCode, string> = {
  reading_empty: 'Escribe o pega la lectura antes de pedir una propuesta.',
  reading_too_long: `La lectura supera los ${READING_MAX_LABEL} caracteres permitidos. Recórtala antes de generar.`,
  purpose_too_long: 'El propósito diagnóstico supera los 1000 caracteres permitidos.',
};

function isLocalCode(detail: string): detail is LocalErrorCode {
  return detail in LOCAL_MESSAGES;
}

function fromContract(code: GenerationErrorCode): AssessmentGenerationError {
  return new AssessmentGenerationError(code, GENERATION_ERROR_CATALOG[code].message);
}

/**
 * Traduce una solicitud inválida a un mensaje comprensible en lugar de convertirla
 * en un error genérico del proveedor.
 */
function fromLocalValidation(error: GenerationError): AssessmentGenerationError {
  if (isLocalCode(error.detail)) {
    return new AssessmentGenerationError(error.detail, LOCAL_MESSAGES[error.detail]);
  }
  return fromContract(error.code);
}

function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && value in GENERATION_ERROR_CATALOG;
}

/**
 * supabase-js entrega la respuesta no-2xx dentro de `error.context`. Solo se acepta un
 * cuerpo que respete el contrato estructurado; cualquier otra forma se descarta para no
 * mostrar texto del proveedor en el navegador.
 */
async function contractCodeFrom(error: unknown): Promise<GenerationErrorCode | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (typeof context?.json !== 'function') return null;

  try {
    const body = (await context.json()) as { ok?: unknown; error?: { code?: unknown } } | null;
    if (!body || body.ok !== false) return null;
    return isGenerationErrorCode(body.error?.code) ? body.error.code : null;
  } catch {
    return null;
  }
}

export async function generateAssessmentDraft(
  client: SupabaseClient,
  rawInput: AssessmentGenerationInput,
): Promise<GeneratedAssessmentDraft> {
  let input: GenerateAssessmentInput;
  try {
    input = parseGenerationRequest(rawInput);
  } catch (error) {
    if (error instanceof GenerationError) throw fromLocalValidation(error);
    throw fromContract('invalid_request');
  }

  const { data, error } = await client.functions.invoke('generate-assessment-draft', {
    body: input,
  });

  if (error) {
    throw fromContract((await contractCodeFrom(error)) ?? 'provider_unavailable');
  }

  const envelope = data as { ok?: unknown; data?: unknown; error?: { code?: unknown } } | null;
  if (envelope?.ok !== true) {
    throw fromContract(
      isGenerationErrorCode(envelope?.error?.code) ? envelope.error.code : 'provider_unavailable',
    );
  }

  try {
    return parseGeneratedDraft(envelope.data, input.questionCount);
  } catch {
    throw fromContract('invalid_ai_response');
  }
}

export function mergeGeneratedDraft(
  current: Pick<
    AssessmentDraftInput,
    'readingText' | 'opensAt' | 'closesAt' | 'pastePolicy' | 'curriculumVersion'
  >,
  generated: GeneratedAssessmentDraft,
): AssessmentDraftInput {
  return {
    ...current,
    title: generated.title,
    purpose: generated.purpose,
    generalInstructions: generated.generalInstructions,
    questions: generated.questions.map((question) => ({
      ...question,
      curriculumLinks: { ...question.curriculumLinks },
    })),
  };
}
