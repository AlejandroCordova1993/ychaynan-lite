import {
  handlePreflight,
  invalidBody,
  jsonResponse,
  readJsonObject,
  requireBoundedText,
  requireVersion,
  RequestBodyError,
} from '../_shared/http.ts';
import { INPUT_LIMITS } from '../_shared/inputLimits.ts';
import { hashSessionToken } from '../_shared/studentSession.ts';

const GENERIC_ERROR = 'No pudimos registrar la entrega.';
const ALLOWED_FIELDS = ['token', 'clientSubmissionKey', 'expectedVersion', 'confirmed'] as const;

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
      const body = await readJsonObject(request, {
        maxBytes: INPUT_LIMITS.edgeBodyBytes.submitAssessment,
        allowedFields: ALLOWED_FIELDS,
      });
      const token = requireBoundedText(body.token, INPUT_LIMITS.access.tokenChars);
      const clientSubmissionKey = requireBoundedText(
        body.clientSubmissionKey,
        INPUT_LIMITS.access.clientSubmissionKeyChars,
      );
      const expectedVersion = requireVersion(body.expectedVersion);
      if (body.confirmed !== true) throw invalidBody();
      const result = await dependencies.submit({
        tokenHash: await hashSessionToken(token),
        clientSubmissionKey,
        expectedVersion,
        confirmed: true,
      });
      if (!result.ok) throw new Error('invalid submission');
      return jsonResponse({ ok: true, data: result }, 200, origin, dependencies.allowedOrigins);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        console.error('submit-assessment rejected', error.code);
        return jsonResponse(
          { ok: false, error: GENERIC_ERROR },
          error.status,
          origin,
          dependencies.allowedOrigins,
        );
      }
      console.error('submit-assessment rejected', error);
      return jsonResponse(
        { ok: false, error: GENERIC_ERROR },
        400,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
