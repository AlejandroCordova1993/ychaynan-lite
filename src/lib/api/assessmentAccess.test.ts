import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { openAssessment, regenerateAccess, unblockAccess } from './assessmentAccess';

function client(data: unknown, error: { message: string } | null = null) {
  return {
    functions: { invoke: vi.fn().mockResolvedValue({ data, error }) },
  } as unknown as SupabaseClient;
}

const overview = {
  assessmentId: 'assessment-1',
  slug: 'diagnostico-2026',
  title: 'Diagnóstico inicial',
  legacyCount: 0,
  accesses: [
    {
      id: 'access-1',
      studentId: 'student-1',
      fullName: 'Ana Ruiz',
      groupName: '3ro BGU A',
      state: 'unused',
      submissionStatus: 'none',
      failedAttempts: 0,
      cooldownUntil: null,
      code: 'ABCD2345',
      codeStatus: 'available',
    },
  ],
};

describe('assessmentAccess API', () => {
  it('abre una evaluación y recibe ya la lista recuperable', async () => {
    const fake = client({ ok: true, data: overview });

    await expect(openAssessment(fake, 'assessment-1', 'group-1')).resolves.toEqual(overview);
    expect(fake.functions.invoke).toHaveBeenCalledWith('manage-assessment-access', {
      body: { action: 'open', assessmentId: 'assessment-1', groupId: 'group-1' },
    });
  });

  it('regenera y desbloquea mediante la misma función', async () => {
    const regenerateClient = client({ ok: true, data: { accessId: 'access-1', code: 'WXYZ6789' } });
    const unblockClient = client({ ok: true });

    await expect(regenerateAccess(regenerateClient, 'access-1')).resolves.toBe('WXYZ6789');
    await expect(unblockAccess(unblockClient, 'access-1')).resolves.toBeUndefined();
  });

  it('propaga un error de la función privada sin exponer detalles internos', async () => {
    const fake = client(null, { message: 'boom' });

    await expect(regenerateAccess(fake, 'access-1')).rejects.toThrow(/No se pudo gestionar/);
  });
});
