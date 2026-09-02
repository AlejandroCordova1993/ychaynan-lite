import { handlePreflight, jsonResponse } from '../_shared/http.ts';
import {
  DEFAULT_CRITERIA,
  ACTIVE_CRITERIA_IDS,
  ACTIVE_MODULE_IDS,
} from '../_shared/assessmentRubric.ts';
import type { GenerateAssessmentInput, GenerationFocus } from './prompt.ts';

interface VerifiedUser {
  id: string;
  appMetadata: Record<string, unknown>;
}

export interface GeneratedQuestion {
  position: number;
  prompt: string;
  instructions: string;
  suggestedMinWords: number | null;
  suggestedMaxWords: number | null;
  activeCriteria: string[];
  activeModules: string[];
  curriculumLinks: Record<string, unknown>;
}

export interface GeneratedAssessmentDraft {
  title: string;
  purpose: string;
  generalInstructions: string;
  questions: GeneratedQuestion[];
}

interface Dependencies {
  allowedOrigins: readonly string[];
  verifyUser(token: string): Promise<VerifiedUser | null>;
  generate(input: GenerateAssessmentInput): Promise<GeneratedAssessmentDraft>;
}

const FOCUSES = new Set<GenerationFocus>([
  'balanced',
  'reading_comprehension',
  'critical_reasoning',
  'writing_conventions',
]);
const MAX_READING_CHARS = 24_000;

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

function parseInput(body: unknown): GenerateAssessmentInput {
  if (!body || typeof body !== 'object') throw new TypeError('invalid request');
  const data = body as Record<string, unknown>;
  const readingText = typeof data.readingText === 'string' ? data.readingText.trim() : '';
  if (!readingText || readingText.length > MAX_READING_CHARS)
    throw new TypeError('invalid reading');

  const questionCount = data.questionCount === undefined ? 3 : data.questionCount;
  if (!Number.isInteger(questionCount) || Number(questionCount) < 1 || Number(questionCount) > 4) {
    throw new TypeError('invalid question count');
  }
  const focus = data.focus === undefined ? 'balanced' : data.focus;
  if (typeof focus !== 'string' || !FOCUSES.has(focus as GenerationFocus)) {
    throw new TypeError('invalid focus');
  }
  const purpose = typeof data.purpose === 'string' ? data.purpose.trim() : undefined;
  if (purpose && purpose.length > 1000) throw new TypeError('invalid purpose');

  return {
    readingText,
    purpose,
    questionCount: Number(questionCount),
    focus: focus as GenerationFocus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringField(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string') {
    if (required) throw new Error('malformed response');
    return '';
  }
  const result = value.trim();
  if (required && !result) throw new Error('malformed response');
  if (result.length > max) throw new Error('malformed response');
  return result;
}

function nullableInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error('malformed response');
  }
  return Number(value);
}

export function normalizeGeneratedDraft(
  value: unknown,
  expectedCount: number,
): GeneratedAssessmentDraft {
  if (!isRecord(value)) throw new Error('malformed response');
  const rawQuestions = value.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== expectedCount) {
    throw new Error('malformed response');
  }

  const questions = rawQuestions.map((raw, index) => {
    if (!isRecord(raw)) throw new Error('malformed response');
    const criteria = Array.isArray(raw.activeCriteria)
      ? raw.activeCriteria.filter(
          (id): id is string => typeof id === 'string' && ACTIVE_CRITERIA_IDS.has(id),
        )
      : [];
    const modules = Array.isArray(raw.activeModules)
      ? raw.activeModules.filter(
          (id): id is string => typeof id === 'string' && ACTIVE_MODULE_IDS.has(id),
        )
      : [];
    if (criteria.length === 0) throw new Error('malformed response');
    const minWords = nullableInteger(raw.suggestedMinWords, 0, 2000);
    const maxWords = nullableInteger(raw.suggestedMaxWords, 1, 3000);
    if (minWords !== null && maxWords !== null && minWords > maxWords) {
      throw new Error('malformed response');
    }
    const curriculumLinks = isRecord(raw.curriculumLinks) ? raw.curriculumLinks : {};
    return {
      position: index + 1,
      prompt: stringField(raw.prompt, 2000, true),
      instructions: stringField(raw.instructions, 4000),
      suggestedMinWords: minWords,
      suggestedMaxWords: maxWords,
      activeCriteria: [...new Set(criteria)],
      activeModules: [...new Set(modules)],
      curriculumLinks,
    };
  });

  return {
    title: stringField(value.title, 160, true),
    purpose: stringField(value.purpose, 1000, true),
    generalInstructions: stringField(value.generalInstructions, 6000),
    questions,
  };
}

export function createGenerateAssessmentDraftHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const preflight = handlePreflight(request, dependencies.allowedOrigins);
    if (preflight) return preflight;
    if (request.method !== 'POST') {
      return jsonResponse(
        { ok: false, error: 'Método no permitido.' },
        405,
        origin,
        dependencies.allowedOrigins,
      );
    }

    const token = bearerToken(request);
    const user = token ? await dependencies.verifyUser(token) : null;
    if (!user) {
      return jsonResponse(
        { ok: false, error: 'Sesión inválida.' },
        401,
        origin,
        dependencies.allowedOrigins,
      );
    }
    if (user.appMetadata.role !== 'teacher') {
      return jsonResponse(
        { ok: false, error: 'Permiso insuficiente.' },
        403,
        origin,
        dependencies.allowedOrigins,
      );
    }

    try {
      const input = parseInput(await request.json());
      const draft = await dependencies.generate(input);
      return jsonResponse(
        { ok: true, data: normalizeGeneratedDraft(draft, input.questionCount) },
        200,
        origin,
        dependencies.allowedOrigins,
      );
    } catch (error) {
      const message =
        error instanceof TypeError && error.message.startsWith('invalid')
          ? 'Solicitud inválida.'
          : error instanceof Error && error.message === 'malformed response'
            ? 'La IA devolvió una propuesta incompleta.'
            : 'No pudimos generar una propuesta. Inténtalo nuevamente.';
      const status =
        message === 'Solicitud inválida.' ? 400 : message.includes('incompleta') ? 502 : 502;
      console.error('generate-assessment-draft failed', {
        code: error instanceof Error ? error.message : 'unknown',
      });
      return jsonResponse(
        { ok: false, error: message },
        status,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}

export { DEFAULT_CRITERIA };
