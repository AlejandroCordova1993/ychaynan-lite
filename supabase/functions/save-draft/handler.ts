import {
  handlePreflight,
  jsonResponse,
  readJsonObject,
  RequestBodyError,
} from '../_shared/http.ts';
import {
  hasOnlyKeys,
  INPUT_LIMITS,
  isPlainRecord,
  isUuid,
  unicodeLength,
} from '../_shared/inputLimits.ts';
import { hashSessionToken } from '../_shared/studentSession.ts';

const GENERIC_ERROR = 'No pudimos sincronizar el borrador.';
const LOAD_FIELDS = ['action', 'token', 'clientSubmissionKey'] as const;
const SAVE_FIELDS = [...LOAD_FIELDS, 'expectedVersion', 'responses'] as const;

interface DraftResponse {
  questionId: string;
  text: string;
}
interface Dependencies {
  allowedOrigins: readonly string[];
  load(input: { tokenHash: string; clientSubmissionKey: string }): Promise<Record<string, unknown>>;
  save(input: {
    tokenHash: string;
    clientSubmissionKey: string;
    expectedVersion: number;
    responses: DraftResponse[];
  }): Promise<Record<string, unknown>>;
}

function invalidBody(): RequestBodyError {
  return new RequestBodyError(400, 'invalid_body');
}

function requireBoundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') throw invalidBody();
  const trimmed = value.trim();
  if (!trimmed || unicodeLength(trimmed) > maximum) throw invalidBody();
  return trimmed;
}

function requireVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw invalidBody();
  return value;
}

function isDraftResponse(value: unknown): value is DraftResponse {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ['questionId', 'text'])) return false;
  if (typeof value.questionId !== 'string' || !isUuid(value.questionId)) return false;
  return typeof value.text === 'string' && unicodeLength(value.text) <= INPUT_LIMITS.responseChars;
}

function isDraftResponseList(value: unknown): value is DraftResponse[] {
  return (
    Array.isArray(value) &&
    value.length <= INPUT_LIMITS.assessment.questionsMax &&
    value.every(isDraftResponse)
  );
}

function requireResponses(value: unknown): DraftResponse[] {
  if (!isDraftResponseList(value)) throw invalidBody();
  const responses: DraftResponse[] = value.map((item) => ({
    questionId: item.questionId,
    text: item.text,
  }));
  if (new Set(responses.map((item) => item.questionId)).size !== responses.length)
    throw invalidBody();
  return responses;
}

export function createSaveDraftHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const preflight = handlePreflight(request, dependencies.allowedOrigins);
    if (preflight) return preflight;
    if (request.method !== 'POST')
      return jsonResponse(
        { ok: false, error: 'Método no permitido.' },
        405,
        origin,
        dependencies.allowedOrigins,
      );
    try {
      const body = await readJsonObject(request, {
        maxBytes: INPUT_LIMITS.edgeBodyBytes.saveDraft,
        allowedFields: SAVE_FIELDS,
      });
      const isLoad = body.action === 'load';
      if (!isLoad && body.action !== 'save') throw invalidBody();
      if (!hasOnlyKeys(body, isLoad ? LOAD_FIELDS : SAVE_FIELDS)) throw invalidBody();
      const token = requireBoundedText(body.token, INPUT_LIMITS.access.tokenChars);
      const clientSubmissionKey = requireBoundedText(
        body.clientSubmissionKey,
        INPUT_LIMITS.access.clientSubmissionKeyChars,
      );
      if (isLoad) {
        const result = await dependencies.load({
          tokenHash: await hashSessionToken(token),
          clientSubmissionKey,
        });
        if (!result.ok) throw new Error('invalid session');
        return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
      }
      const expectedVersion = requireVersion(body.expectedVersion);
      const responses = requireResponses(body.responses);
      const result = await dependencies.save({
        tokenHash: await hashSessionToken(token),
        clientSubmissionKey,
        expectedVersion,
        responses,
      });
      if (result.conflict)
        return jsonResponse({ ok: false, data: result }, 409, origin, dependencies.allowedOrigins);
      if (!result.ok) throw new Error('invalid session');
      return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        console.error('save-draft rejected', error.code);
        return jsonResponse(
          { ok: false, error: GENERIC_ERROR },
          error.status,
          origin,
          dependencies.allowedOrigins,
        );
      }
      console.error('save-draft rejected', error);
      return jsonResponse(
        { ok: false, error: GENERIC_ERROR },
        401,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
