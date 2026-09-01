import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { openAssessment, regenerateAccess, unblockAccess } from './assessmentAccess';

function client(data: unknown, error: { message: string } | null = null) {
  return {
    functions: { invoke: vi.fn().mockResolvedValue({ data, error }) },
  } as unknown as SupabaseClient;
}

describe('assessmentAccess API', () => {
  it('abre una evaluación y valida los recibos de códigos', async () => {
    const fake = client({
      ok: true,
      data: [{ studentId: 'student-1', fullName: 'Ana Ruiz', code: 'ABCD2345' }],
    });
    await expect(openAssessment(fake, 'assessment-1', 'group-1')).resolves.toEqual([
      { studentId: 'student-1', fullName: 'Ana Ruiz', code: 'ABCD2345' },
    ]);
    expect(fake.functions.invoke).toHaveBeenCalledWith('manage-assessment-access', {
      body: { action: 'open', assessmentId: 'assessment-1', groupId: 'group-1' },
    });
  });

  it('regenera y desbloquea mediante la misma función', async () => {
    const regenerateClient = client({ ok: true, data: { code: 'WXYZ6789' } });
    const unblockClient = client({ ok: true });
    await expect(regenerateAccess(regenerateClient, 'access-1')).resolves.toBe('WXYZ6789');
    await expect(unblockAccess(unblockClient, 'access-1')).resolves.toBeUndefined();
  });
});
