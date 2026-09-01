import { hashAccessCode } from '../_shared/crypto';
import { handlePreflight, jsonResponse } from '../_shared/http';
import { normalizeStudentGroup, normalizeStudentName } from '../_shared/normalize';
import { createStudentSessionSecrets } from '../_shared/studentSession';

const GENERIC_ERROR = 'No pudimos validar tus datos. Revisa la información e intenta nuevamente.';
type RandomBytes = (length: number) => Uint8Array;

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
      const body = (await request.json()) as Record<string, unknown>;
      const required = [
        'assessmentSlug',
        'fullName',
        'groupName',
        'personalCode',
        'fingerprint',
      ] as const;
      if (
        required.some((field) => typeof body[field] !== 'string' || !(body[field] as string).trim())
      )
        throw new Error('invalid');
      const secrets = await createStudentSessionSecrets(randomBytes);
      const result = await dependencies.validate({
        assessmentSlug: (body.assessmentSlug as string).trim(),
        fullNameNormalized: normalizeStudentName(body.fullName as string),
        groupNameNormalized: normalizeStudentGroup(body.groupName as string),
        codeHash: await hashAccessCode(body.personalCode as string, dependencies.pepper),
        fingerprintHash: await hmac(body.fingerprint as string, dependencies.pepper),
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
