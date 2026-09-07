import { hashAccessCode } from '../_shared/crypto.ts';
import {
  handlePreflight,
  jsonResponse,
  readJsonObject,
  RequestBodyError,
} from '../_shared/http.ts';
import { INPUT_LIMITS, unicodeLength } from '../_shared/inputLimits.ts';
import { normalizeStudentGroup, normalizeStudentName } from '../_shared/normalize.ts';
import { createStudentSessionSecrets } from '../_shared/studentSession.ts';

const GENERIC_ERROR = 'No pudimos validar tus datos. Revisa la información e intenta nuevamente.';
type RandomBytes = (length: number) => Uint8Array;

const FIELD_LIMITS = {
  assessmentSlug: INPUT_LIMITS.assessment.slugChars,
  fullName: INPUT_LIMITS.access.fullNameChars,
  groupName: INPUT_LIMITS.access.groupNameChars,
  personalCode: INPUT_LIMITS.access.personalCodeChars,
  fingerprint: INPUT_LIMITS.access.fingerprintChars,
} as const;

function requireBoundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') throw new RequestBodyError(400, 'invalid_body');
  const trimmed = value.trim();
  if (!trimmed || unicodeLength(trimmed) > maximum) throw new RequestBodyError(400, 'invalid_body');
  return trimmed;
}

interface ValidationInput {
  assessmentSlug: string;
  fullNameNormalized: string;
  groupNameNormalized: string;
  codeHash: string;
  fingerprintHash: string;
  tokenHash: string;
  clientSubmissionKey: string;
  sessionMinutes: number;
}
interface Dependencies {
  allowedOrigins: readonly string[];
  pepper: string;
  sessionMinutes: number;
  validate(
    input: ValidationInput,
  ): Promise<{ submissionId: string; expiresAt: string; draftVersion: number }>;
}

async function hmac(value: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`fingerprint:${value}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function createValidateStudentHandler(
  dependencies: Dependencies,
  randomBytes?: RandomBytes,
) {
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
        maxBytes: INPUT_LIMITS.edgeBodyBytes.validateStudent,
        allowedFields: Object.keys(FIELD_LIMITS),
      });
      const assessmentSlug = requireBoundedText(body.assessmentSlug, FIELD_LIMITS.assessmentSlug);
      const fullName = requireBoundedText(body.fullName, FIELD_LIMITS.fullName);
      const groupName = requireBoundedText(body.groupName, FIELD_LIMITS.groupName);
      const personalCode = requireBoundedText(body.personalCode, FIELD_LIMITS.personalCode);
      const fingerprint = requireBoundedText(body.fingerprint, FIELD_LIMITS.fingerprint);
      const secrets = await createStudentSessionSecrets(randomBytes);
      const result = await dependencies.validate({
        assessmentSlug,
        fullNameNormalized: normalizeStudentName(fullName),
        groupNameNormalized: normalizeStudentGroup(groupName),
        codeHash: await hashAccessCode(personalCode, dependencies.pepper),
        fingerprintHash: await hmac(fingerprint, dependencies.pepper),
        tokenHash: secrets.tokenHash,
        clientSubmissionKey: secrets.clientSubmissionKey,
        sessionMinutes: Math.min(180, Math.max(1, dependencies.sessionMinutes)),
      });
      return jsonResponse(
        {
          ok: true,
          data: {
            ...result,
            token: secrets.token,
            clientSubmissionKey: secrets.clientSubmissionKey,
          },
        },
        200,
        origin,
        dependencies.allowedOrigins,
      );
    } catch (error) {
      if (error instanceof RequestBodyError) {
        console.error('validate-student rejected', error.code);
        return jsonResponse(
          { ok: false, error: GENERIC_ERROR },
          error.status,
          origin,
          dependencies.allowedOrigins,
        );
      }
      console.error('validate-student rejected', error);
      return jsonResponse(
        { ok: false, error: GENERIC_ERROR },
        401,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
