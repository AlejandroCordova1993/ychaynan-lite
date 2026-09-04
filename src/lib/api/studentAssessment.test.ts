import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { validateStudent } from './studentAssessment';

it('envía los cuatro datos y valida la sesión devuelta', async () => {
  const invoke = vi.fn().mockResolvedValue({
    data: {
      ok: true,
      data: {
        token: 'token-seguro-de-prueba-con-longitud-suficiente',
        expiresAt: '2099-09-01T12:00:00.000+00:00',
        clientSubmissionKey: 'key',
        submissionId: 'submission-1',
        draftVersion: 0,
      },
    },
    error: null,
  });
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, {
      assessmentSlug: 'diagnostico',
      fullName: 'María Peña',
      groupName: '3ro A',
      personalCode: 'ABCD2345',
      fingerprint: 'device-1',
    }),
  ).resolves.toMatchObject({
    submissionId: 'submission-1',
    draftVersion: 0,
    expiresAt: '2099-09-01T12:00:00.000+00:00',
  });
  expect(invoke).toHaveBeenCalledWith('validate-student', {
    body: expect.objectContaining({ personalCode: 'ABCD2345' }),
  });
});
