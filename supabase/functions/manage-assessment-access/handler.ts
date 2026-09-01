import { generateAccessCode, hashAccessCode } from '../_shared/crypto.ts';
import { handlePreflight, jsonResponse } from '../_shared/http.ts';

interface VerifiedUser {
  id: string;
  appMetadata: Record<string, unknown>;
}

interface Student {
  id: string;
  fullName: string;
}

interface Dependencies {
  allowedOrigins: readonly string[];
  pepper: string;
  verifyUser(token: string): Promise<VerifiedUser | null>;
  listActiveStudents(groupId: string): Promise<Student[]>;
  openAssessment(
    assessmentId: string,
    groupId: string,
    accesses: Array<{ student_id: string; code_hash: string }>,
  ): Promise<void>;
  regenerateAccess(accessId: string, codeHash: string): Promise<void>;
  unblockAccess(accessId: string): Promise<void>;
}

type RandomBytes = (length: number) => Uint8Array;

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

export function createManageAssessmentAccessHandler(
  dependencies: Dependencies,
  randomBytes?: RandomBytes,
) {
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
      const body = (await request.json()) as Record<string, unknown>;
      if (body.action === 'open') {
        if (typeof body.assessmentId !== 'string' || typeof body.groupId !== 'string') {
          throw new TypeError('Solicitud incompleta.');
        }
        const students = await dependencies.listActiveStudents(body.groupId);
        const receipts = await Promise.all(
          students.map(async (student) => {
            const code = generateAccessCode(randomBytes);
            return {
              studentId: student.id,
              fullName: student.fullName,
              code,
              codeHash: await hashAccessCode(code, dependencies.pepper),
            };
          }),
        );
        await dependencies.openAssessment(
          body.assessmentId,
          body.groupId,
          receipts.map(({ studentId, codeHash }) => ({
            student_id: studentId,
            code_hash: codeHash,
          })),
        );
        return jsonResponse(
          {
            ok: true,
            data: receipts.map(({ studentId, fullName, code }) => ({ studentId, fullName, code })),
          },
          200,
          origin,
          dependencies.allowedOrigins,
        );
      }

      if (body.action === 'regenerate' && typeof body.accessId === 'string') {
        const code = generateAccessCode(randomBytes);
        await dependencies.regenerateAccess(
          body.accessId,
          await hashAccessCode(code, dependencies.pepper),
        );
        return jsonResponse({ ok: true, data: { code } }, 200, origin, dependencies.allowedOrigins);
      }

      if (body.action === 'unblock' && typeof body.accessId === 'string') {
        await dependencies.unblockAccess(body.accessId);
        return jsonResponse({ ok: true }, 200, origin, dependencies.allowedOrigins);
      }

      return jsonResponse(
        { ok: false, error: 'Solicitud inválida.' },
        400,
        origin,
        dependencies.allowedOrigins,
      );
    } catch (error) {
      console.error('manage-assessment-access failed', error);
      return jsonResponse(
        { ok: false, error: 'No se pudo completar la operación.' },
        400,
        origin,
        dependencies.allowedOrigins,
      );
    }
  };
}
