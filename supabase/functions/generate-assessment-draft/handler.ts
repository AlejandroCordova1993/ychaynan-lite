import { handlePreflight, jsonResponse } from '../_shared/http.ts';
import {
  GENERATION_ERROR_CATALOG,
  GenerationError,
  generationErrorBody,
  parseGeneratedDraft,
  parseGenerationRequest,
  type GeneratedAssessmentDraft,
  type GenerateAssessmentInput,
  type GenerationErrorCode,
} from '../_shared/aiGeneration.ts';

interface VerifiedUser {
  id: string;
  appMetadata: Record<string, unknown>;
}

interface Dependencies {
  allowedOrigins: readonly string[];
  verifyUser(token: string): Promise<VerifiedUser | null>;
  generate(input: GenerateAssessmentInput): Promise<GeneratedAssessmentDraft>;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new GenerationError('invalid_request', 'unparsable_body');
  }
}

export function createGenerateAssessmentDraftHandler(dependencies: Dependencies) {
  const { allowedOrigins } = dependencies;

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const preflight = handlePreflight(request, allowedOrigins);
    if (preflight) return preflight;

    // El estado HTTP siempre proviene del catálogo de códigos, nunca de comparar mensajes.
    const fail = (code: GenerationErrorCode) =>
      jsonResponse(
        generationErrorBody(code),
        GENERATION_ERROR_CATALOG[code].status,
        origin,
        allowedOrigins,
      );

    if (request.method !== 'POST') return fail('method_not_allowed');

    try {
      // La verificación va dentro del try: si Supabase o la red fallan, la excepción no
      // puede escapar del handler ni salir del contrato estructurado de errores.
      const token = bearerToken(request);
      const user = token ? await dependencies.verifyUser(token) : null;
      if (!user) throw new GenerationError('invalid_session', 'missing_or_invalid_token');
      if (user.appMetadata.role !== 'teacher') {
        throw new GenerationError('forbidden', 'role_not_teacher');
      }

      const input = parseGenerationRequest(await readJsonBody(request));
      const proposal = await dependencies.generate(input);
      const draft = parseGeneratedDraft(proposal, input.questionCount);
      return jsonResponse({ ok: true, data: draft }, 200, origin, allowedOrigins);
    } catch (error) {
      const code: GenerationErrorCode =
        error instanceof GenerationError ? error.code : 'provider_unavailable';
      // Solo se registra la razón estable; el detalle del proveedor nunca sale de la función.
      console.error('generate-assessment-draft failed', {
        code,
        detail: error instanceof GenerationError ? error.detail : 'unexpected',
      });
      return fail(code);
    }
  };
}
