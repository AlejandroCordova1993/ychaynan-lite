import { handlePreflight, jsonResponse } from '../_shared/http.ts';
import { hashSessionToken } from '../_shared/studentSession.ts';

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
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.token !== 'string' || typeof body.clientSubmissionKey !== 'string')
        throw new Error('invalid session');
      const base = {
        tokenHash: await hashSessionToken(body.token),
        clientSubmissionKey: body.clientSubmissionKey,
      };
      if (body.action === 'load') {
        const result = await dependencies.load(base);
        if (!result.ok) throw new Error('invalid session');
        return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
      }
      if (
        body.action === 'save' &&
        Number.isInteger(body.expectedVersion) &&
        Array.isArray(body.responses)
      ) {
        const result = await dependencies.save({
          ...base,
          expectedVersion: body.expectedVersion as number,
          responses: body.responses as DraftResponse[],
        });
        if (result.conflict)
          return jsonResponse(
            { ok: false, data: result },
            409,
            origin,
            dependencies.allowedOrigins,
          );
        if (!result.ok) throw new Error('invalid session');
        return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
      }
      throw new Error('invalid request');
    } catch (error) {
      console.error('save-draft rejected', error);
      return jsonResponse(
        { ok: false, error: 'No pudimos sincronizar el borrador.' },
        401,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
