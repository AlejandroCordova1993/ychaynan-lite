import { deriveRecoverableAccessCode, hashAccessCode } from '../_shared/crypto.ts';
import { handlePreflight, jsonResponse } from '../_shared/http.ts';

interface VerifiedUser {
  id: string;
  appMetadata: Record<string, unknown>;
}

interface Student {
  id: string;
  fullName: string;
}

/** Fila cruda de la base. `codeHash` nunca sale de esta función. */
export interface AccessRow {
  id: string;
  studentId: string;
  fullName: string;
  groupName: string;
  state: string;
  submissionStatus: string;
  failedAttempts: number;
  cooldownUntil: string | null;
  codeGeneration: number;
  codeHash: string;
}

export interface OpenAssessmentSnapshot {
  assessment: { id: string; slug: string; title: string };
  accesses: AccessRow[];
}

interface Dependencies {
  allowedOrigins: readonly string[];
  pepper: string;
  verifyUser(token: string): Promise<VerifiedUser | null>;
  listActiveStudents(groupId: string): Promise<Student[]>;
  loadOpenAssessment(): Promise<OpenAssessmentSnapshot | null>;
  openAssessment(
    assessmentId: string,
    groupId: string,
    accesses: Array<{ student_id: string; code_hash: string }>,
  ): Promise<void>;
  regenerateAccess(accessId: string, codeHash: string, codeGeneration: number): Promise<void>;
  rotateLegacyAccesses(
    assessmentId: string,
    codes: Array<{ access_id: string; code_hash: string }>,
  ): Promise<{ rotated: number; revokedSessions: number }>;
  unblockAccess(accessId: string): Promise<void>;
}

/** Estados que todavía necesitan un código utilizable. */
const CODE_BEARING_STATES = ['unused', 'active', 'blocked'];

type CodeStatus = 'available' | 'legacy' | 'hidden' | 'unavailable';

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

async function resolveCode(
  pepper: string,
  assessmentId: string,
  access: AccessRow,
): Promise<{ code: string | null; codeStatus: CodeStatus }> {
  if (!CODE_BEARING_STATES.includes(access.state)) {
    return { code: null, codeStatus: 'hidden' };
  }
  if (access.codeGeneration < 1) {
    return { code: null, codeStatus: 'legacy' };
  }

  const code = await deriveRecoverableAccessCode(
    pepper,
    assessmentId,
    access.studentId,
    access.codeGeneration,
  );
  if ((await hashAccessCode(code, pepper)) !== access.codeHash) {
    // Nunca se registra el código ni el hash: solo el acceso afectado.
    console.warn('access code derivation mismatch', { accessId: access.id });
    return { code: null, codeStatus: 'unavailable' };
  }
  return { code, codeStatus: 'available' };
}

async function presentSnapshot(pepper: string, snapshot: OpenAssessmentSnapshot) {
  const accesses = await Promise.all(
    snapshot.accesses.map(async (access) => {
      const { code, codeStatus } = await resolveCode(pepper, snapshot.assessment.id, access);
      return {
        id: access.id,
        studentId: access.studentId,
        fullName: access.fullName,
        groupName: access.groupName,
        state: access.state,
        submissionStatus: access.submissionStatus,
        failedAttempts: access.failedAttempts,
        cooldownUntil: access.cooldownUntil,
        code,
        codeStatus,
      };
    }),
  );

  return {
    assessmentId: snapshot.assessment.id,
    slug: snapshot.assessment.slug,
    title: snapshot.assessment.title,
    legacyCount: accesses.filter(({ codeStatus }) => codeStatus === 'legacy').length,
    accesses,
  };
}

export function createManageAssessmentAccessHandler(dependencies: Dependencies) {
  const { allowedOrigins, pepper } = dependencies;

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const preflight = handlePreflight(request, allowedOrigins);
    if (preflight) return preflight;

    const respond = (body: unknown, status: number) =>
      jsonResponse(body, status, origin, allowedOrigins);

    if (request.method !== 'POST') {
      return respond({ ok: false, error: 'Método no permitido.' }, 405);
    }

    const token = bearerToken(request);
    const user = token ? await dependencies.verifyUser(token) : null;
    if (!user) {
      return respond({ ok: false, error: 'Sesión inválida.' }, 401);
    }
    if (user.appMetadata.role !== 'teacher') {
      return respond({ ok: false, error: 'Permiso insuficiente.' }, 403);
    }

    try {
      const body = (await request.json()) as Record<string, unknown>;

      if (body.action === 'list') {
        const snapshot = await dependencies.loadOpenAssessment();
        if (!snapshot) return respond({ ok: true, data: null }, 200);
        return respond({ ok: true, data: await presentSnapshot(pepper, snapshot) }, 200);
      }

      if (body.action === 'open') {
        if (typeof body.assessmentId !== 'string' || typeof body.groupId !== 'string') {
          throw new TypeError('Solicitud incompleta.');
        }
        const students = await dependencies.listActiveStudents(body.groupId);
        const accesses = await Promise.all(
          students.map(async (student) => ({
            student_id: student.id,
            code_hash: await hashAccessCode(
              await deriveRecoverableAccessCode(pepper, body.assessmentId as string, student.id, 1),
              pepper,
            ),
          })),
        );
        await dependencies.openAssessment(body.assessmentId, body.groupId, accesses);

        const snapshot = await dependencies.loadOpenAssessment();
        if (!snapshot) return respond({ ok: false, error: 'Evaluación no disponible.' }, 409);
        return respond({ ok: true, data: await presentSnapshot(pepper, snapshot) }, 200);
      }

      if (body.action === 'regenerate' && typeof body.accessId === 'string') {
        const snapshot = await dependencies.loadOpenAssessment();
        const access = snapshot?.accesses.find(({ id }) => id === body.accessId);
        if (!snapshot || !access) {
          return respond({ ok: false, error: 'Acceso no disponible.' }, 404);
        }
        if (access.state === 'submitted') {
          return respond({ ok: false, error: 'La entrega ya fue enviada.' }, 409);
        }

        const codeGeneration = Math.max(access.codeGeneration, 0) + 1;
        const code = await deriveRecoverableAccessCode(
          pepper,
          snapshot.assessment.id,
          access.studentId,
          codeGeneration,
        );
        await dependencies.regenerateAccess(
          access.id,
          await hashAccessCode(code, pepper),
          codeGeneration,
        );
        return respond({ ok: true, data: { accessId: access.id, code } }, 200);
      }

      if (body.action === 'rotateLegacy') {
        const snapshot = await dependencies.loadOpenAssessment();
        if (!snapshot) return respond({ ok: false, error: 'Evaluación no disponible.' }, 404);

        const legacy = snapshot.accesses.filter(
          (access) => access.codeGeneration < 1 && CODE_BEARING_STATES.includes(access.state),
        );
        const codes = await Promise.all(
          legacy.map(async (access) => ({
            access_id: access.id,
            code_hash: await hashAccessCode(
              await deriveRecoverableAccessCode(
                pepper,
                snapshot.assessment.id,
                access.studentId,
                1,
              ),
              pepper,
            ),
          })),
        );
        const result = codes.length
          ? await dependencies.rotateLegacyAccesses(snapshot.assessment.id, codes)
          : { rotated: 0, revokedSessions: 0 };

        const refreshed = await dependencies.loadOpenAssessment();
        return respond(
          {
            ok: true,
            data: {
              ...result,
              list: refreshed ? await presentSnapshot(pepper, refreshed) : null,
            },
          },
          200,
        );
      }

      if (body.action === 'unblock' && typeof body.accessId === 'string') {
        await dependencies.unblockAccess(body.accessId);
        return respond({ ok: true }, 200);
      }

      return respond({ ok: false, error: 'Solicitud inválida.' }, 400);
    } catch (error) {
      console.error('manage-assessment-access failed', error);
      return respond({ ok: false, error: 'No se pudo completar la operación.' }, 400);
    }
  };
}
