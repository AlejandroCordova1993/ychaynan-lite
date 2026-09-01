import { describe, expect, it, vi } from 'vitest';
import { createManageAssessmentAccessHandler } from './handler';

const assessmentId = '11111111-1111-1111-1111-111111111111';
const groupId = '22222222-2222-2222-2222-222222222222';

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

function dependencies(role: string | null = 'teacher') {
  return {
    allowedOrigins: ['http://localhost:5173'],
    pepper: 'pepper-de-prueba',
    verifyUser: vi.fn().mockResolvedValue(role ? { id: 'teacher-1', appMetadata: { role } } : null),
    listActiveStudents: vi.fn().mockResolvedValue([
      { id: 'student-1', fullName: 'Ana Ruiz' },
      { id: 'student-2', fullName: 'Luis Peña' },
    ]),
    openAssessment: vi.fn().mockResolvedValue(undefined),
    regenerateAccess: vi.fn().mockResolvedValue(undefined),
    unblockAccess: vi.fn().mockResolvedValue(undefined),
  };
}

describe('manage-assessment-access', () => {
  it('rechaza una petición sin un JWT docente válido', async () => {
    const deps = dependencies(null);
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'open', assessmentId, groupId }, 'inválido'));

    expect(response.status).toBe(401);
    expect(deps.openAssessment).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta autenticada sin rol teacher', async () => {
    const deps = dependencies('student');
    const handler = createManageAssessmentAccessHandler(deps);

    const response = await handler(request({ action: 'open', assessmentId, groupId }));

    expect(response.status).toBe(403);
    expect(deps.openAssessment).not.toHaveBeenCalled();
  });

  it('genera un código claro por estudiante y envía solo hashes a PostgreSQL', async () => {
    const deps = dependencies();
    const handler = createManageAssessmentAccessHandler(deps, () => new Uint8Array(8));

    const response = await handler(request({ action: 'open', assessmentId, groupId }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      { studentId: 'student-1', fullName: 'Ana Ruiz', code: 'AAAAAAAA' },
      { studentId: 'student-2', fullName: 'Luis Peña', code: 'AAAAAAAA' },
    ]);
    expect(deps.openAssessment).toHaveBeenCalledWith(
      assessmentId,
      groupId,
      expect.arrayContaining([
        { student_id: 'student-1', code_hash: expect.stringMatching(/^[a-f0-9]{64}$/) },
        { student_id: 'student-2', code_hash: expect.stringMatching(/^[a-f0-9]{64}$/) },
      ]),
    );
    expect(JSON.stringify(deps.openAssessment.mock.calls)).not.toContain('AAAAAAAA');
  });

  it('regenera y desbloquea únicamente mediante las operaciones internas', async () => {
    const deps = dependencies();
    const handler = createManageAssessmentAccessHandler(deps, () => new Uint8Array(8));

    const regenerated = await handler(request({ action: 'regenerate', accessId: 'access-1' }));
    const unblocked = await handler(request({ action: 'unblock', accessId: 'access-1' }));

    expect(regenerated.status).toBe(200);
    await expect(regenerated.json()).resolves.toEqual({ ok: true, data: { code: 'AAAAAAAA' } });
    expect(deps.regenerateAccess).toHaveBeenCalledWith(
      'access-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(unblocked.status).toBe(200);
    expect(deps.unblockAccess).toHaveBeenCalledWith('access-1');
  });
});
