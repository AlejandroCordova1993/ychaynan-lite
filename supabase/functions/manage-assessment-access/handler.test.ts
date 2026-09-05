import { describe, expect, it, vi } from 'vitest';
import { deriveRecoverableAccessCode, hashAccessCode } from '../_shared/crypto.ts';
import { createManageAssessmentAccessHandler } from './handler.ts';

const assessmentId = '11111111-1111-1111-1111-111111111111';
const groupId = '22222222-2222-2222-2222-222222222222';
const anaId = '33333333-3333-3333-3333-333333333333';
const luisId = '44444444-4444-4444-4444-444444444444';
const pepper = 'pepper-de-prueba';

function request(body: unknown, token = 'jwt-docente') {
  return new Request('https://edge.example/manage-assessment-access', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function recoverableAccess(
  overrides: Partial<{
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
  }> = {},
) {
  const studentId = overrides.studentId ?? anaId;
  const codeGeneration = overrides.codeGeneration ?? 1;
  const codeHash =
    overrides.codeHash ??
    (codeGeneration >= 1
      ? await hashAccessCode(
          await deriveRecoverableAccessCode(pepper, assessmentId, studentId, codeGeneration),
          pepper,
        )
      : 'hash-heredado');
  return {
    id: 'access-1',
    studentId,
    fullName: 'Ana Ruiz',
    groupName: '3ro BGU A',
    state: 'unused',
    submissionStatus: 'none',
    failedAttempts: 0,
    cooldownUntil: null,
    ...overrides,
    codeGeneration,
    codeHash,
  };
}

function dependencies(
  role: string | null = 'teacher',
  accesses: Array<Record<string, unknown>> = [],
) {
  const snapshot = {
    assessment: { id: assessmentId, slug: 'diagnostico-2026', title: 'Diagnóstico inicial' },
    accesses,
  };
  return {
    allowedOrigins: ['http://localhost:5173'],
    pepper,
    verifyUser: vi.fn().mockResolvedValue(role ? { id: 'teacher-1', appMetadata: { role } } : null),
    listActiveStudents: vi.fn().mockResolvedValue([
      { id: anaId, fullName: 'Ana Ruiz' },
      { id: luisId, fullName: 'Luis Peña' },
    ]),
    loadOpenAssessment: vi.fn().mockResolvedValue(accesses.length ? snapshot : null),
    openAssessment: vi.fn().mockResolvedValue(undefined),
    regenerateAccess: vi.fn().mockResolvedValue(undefined),
    rotateLegacyAccesses: vi.fn().mockResolvedValue({ rotated: 0, revokedSessions: 0 }),
    unblockAccess: vi.fn().mockResolvedValue(undefined),
  };
}

describe('manage-assessment-access', () => {
  it('rechaza una petición sin un JWT docente válido', async () => {
    const deps = dependencies(null);
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'list' }, 'inválido'));

    expect(response.status).toBe(401);
    expect(deps.loadOpenAssessment).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta autenticada sin rol teacher', async () => {
    const deps = dependencies('student');
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'list' }));

    expect(response.status).toBe(403);
    expect(deps.loadOpenAssessment).not.toHaveBeenCalled();
  });

  it('reconstruye el código vigente de cada acceso recuperable', async () => {
    const deps = dependencies('teacher', [await recoverableAccess()]);
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'list' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.slug).toBe('diagnostico-2026');
    expect(payload.data.accesses[0]).toMatchObject({
      fullName: 'Ana Ruiz',
      groupName: '3ro BGU A',
      state: 'unused',
      submissionStatus: 'none',
      codeStatus: 'available',
      code: await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 1),
    });
  });

  it('nunca devuelve el hash almacenado junto con la lista', async () => {
    const access = await recoverableAccess();
    const deps = dependencies('teacher', [access]);
    const handler = createManageAssessmentAccessHandler(deps);

    const body = await (await handler(request({ action: 'list' }))).text();

    expect(body).not.toContain(access.codeHash);
  });

  it('marca como heredado el código aleatorio que ya no puede reconstruirse', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ codeGeneration: 0 })]);
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (await handler(request({ action: 'list' }))).json();

    expect(payload.data.legacyCount).toBe(1);
    expect(payload.data.accesses[0]).toMatchObject({ codeStatus: 'legacy', code: null });
  });

  it('oculta el código de una entrega enviada o revocada', async () => {
    const deps = dependencies('teacher', [
      await recoverableAccess({ state: 'submitted', submissionStatus: 'submitted' }),
      await recoverableAccess({ id: 'access-2', studentId: luisId, state: 'revoked' }),
    ]);
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (await handler(request({ action: 'list' }))).json();

    expect(payload.data.accesses[0]).toMatchObject({ codeStatus: 'hidden', code: null });
    expect(payload.data.accesses[1]).toMatchObject({ codeStatus: 'hidden', code: null });
  });

  it('omite el código cuando la derivación no coincide con el hash guardado', async () => {
    const deps = dependencies('teacher', [
      await recoverableAccess({ codeHash: 'hash-que-no-cuadra' }),
    ]);
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (await handler(request({ action: 'list' }))).json();

    expect(payload.data.accesses[0]).toMatchObject({ codeStatus: 'unavailable', code: null });
  });

  it('regenera con la generación siguiente e invalida el código anterior', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ codeGeneration: 2 })]);
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (
      await handler(request({ action: 'regenerate', accessId: 'access-1' }))
    ).json();

    const anterior = await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 2);
    const siguiente = await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 3);
    expect(payload.data.code).toBe(siguiente);
    expect(payload.data.code).not.toBe(anterior);
    expect(deps.regenerateAccess).toHaveBeenCalledWith(
      'access-1',
      await hashAccessCode(siguiente, pepper),
      3,
    );
  });

  it('convierte un código heredado a la primera generación recuperable', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ codeGeneration: 0 })]);
    const handler = createManageAssessmentAccessHandler(deps);

    await handler(request({ action: 'regenerate', accessId: 'access-1' }));

    expect(deps.regenerateAccess).toHaveBeenCalledWith(
      'access-1',
      await hashAccessCode(
        await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 1),
        pepper,
      ),
      1,
    );
  });

  it('no regenera el acceso de una entrega enviada', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ state: 'submitted' })]);
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'regenerate', accessId: 'access-1' }));

    expect(response.status).toBe(409);
    expect(deps.regenerateAccess).not.toHaveBeenCalled();
  });

  it('rota únicamente los accesos heredados elegibles', async () => {
    const deps = dependencies('teacher', [
      await recoverableAccess({ codeGeneration: 0 }),
      await recoverableAccess({
        id: 'access-2',
        studentId: luisId,
        fullName: 'Luis Peña',
        codeGeneration: 0,
        state: 'submitted',
      }),
      await recoverableAccess({ id: 'access-3', studentId: luisId, codeGeneration: 1 }),
    ]);
    deps.rotateLegacyAccesses.mockResolvedValue({ rotated: 1, revokedSessions: 1 });
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (await handler(request({ action: 'rotateLegacy', assessmentId }))).json();

    expect(deps.rotateLegacyAccesses).toHaveBeenCalledWith(assessmentId, [
      {
        access_id: 'access-1',
        code_hash: await hashAccessCode(
          await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 1),
          pepper,
        ),
      },
    ]);
    expect(payload.data).toMatchObject({ rotated: 1, revokedSessions: 1 });
  });

  it('rechaza una pestaña que pide convertir otra evaluación sin modificar accesos', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ codeGeneration: 0 })]);
    const handler = createManageAssessmentAccessHandler(deps);
    const response = await handler(request({ action: 'rotateLegacy', assessmentId: groupId }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Recarga');
    expect(deps.rotateLegacyAccesses).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', '   ', 123])(
    'rechaza assessmentId ausente o inválido: %s',
    async (invalidId) => {
      const deps = dependencies('teacher', [await recoverableAccess({ codeGeneration: 0 })]);
      const handler = createManageAssessmentAccessHandler(deps);
      expect(
        (await handler(request({ action: 'rotateLegacy', assessmentId: invalidId }))).status,
      ).toBe(400);
      expect(deps.loadOpenAssessment).not.toHaveBeenCalled();
      expect(deps.rotateLegacyAccesses).not.toHaveBeenCalled();
    },
  );

  it('abre la evaluación con códigos recuperables y devuelve la lista inicial', async () => {
    const deps = dependencies('teacher', [await recoverableAccess()]);
    const handler = createManageAssessmentAccessHandler(deps);

    const payload = await (
      await handler(request({ action: 'open', assessmentId, groupId }))
    ).json();

    expect(deps.openAssessment).toHaveBeenCalledWith(assessmentId, groupId, [
      {
        student_id: anaId,
        code_hash: await hashAccessCode(
          await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 1),
          pepper,
        ),
      },
      {
        student_id: luisId,
        code_hash: await hashAccessCode(
          await deriveRecoverableAccessCode(pepper, assessmentId, luisId, 1),
          pepper,
        ),
      },
    ]);
    expect(payload.data.accesses[0].code).toBe(
      await deriveRecoverableAccessCode(pepper, assessmentId, anaId, 1),
    );
  });

  it('desbloquea sin tocar el código vigente', async () => {
    const deps = dependencies('teacher', [await recoverableAccess({ state: 'blocked' })]);
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'unblock', accessId: 'access-1' }));

    expect(response.status).toBe(200);
    expect(deps.unblockAccess).toHaveBeenCalledWith('access-1');
    expect(deps.regenerateAccess).not.toHaveBeenCalled();
  });
});
