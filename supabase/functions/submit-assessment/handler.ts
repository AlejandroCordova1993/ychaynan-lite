import { handlePreflight, jsonResponse } from '../_shared/http.ts';
import { hashSessionToken } from '../_shared/studentSession.ts';

interface Dependencies {
  allowedOrigins: readonly string[];
  submit(input: {
    tokenHash: string;
    clientSubmissionKey: string;
    expectedVersion: number;
    confirmed: boolean;
  }): Promise<Record<string, unknown>>;
}
export function createSubmitAssessmentHandler(dependencies: Dependencies) {
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
      if (
        typeof body.token !== 'string' ||
        typeof body.clientSubmissionKey !== 'string' ||
        !Number.isInteger(body.expectedVersion) ||
        body.confirmed !== true
      )
        throw new Error('invalid submission');
      const result = await dependencies.submit({
        tokenHash: await hashSessionToken(body.token),
        clientSubmissionKey: body.clientSubmissionKey,
        expectedVersion: body.expectedVersion as number,
        confirmed: true,
      });
      if (!result.ok) throw new Error('invalid submission');
      return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
    } catch (error) {
      console.error('submit-assessment rejected', error);
      return jsonResponse(
        { ok: false, error: 'No pudimos registrar la entrega.' },
        400,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
