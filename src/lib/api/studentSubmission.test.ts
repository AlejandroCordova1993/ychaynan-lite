import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { submitAssessment } from './studentSubmission';

it('acepta el recibo con la zona horaria y precisión devueltas por PostgreSQL', async () => {
  const invoke = vi.fn().mockResolvedValue({
    data: {
      ok: true,
      data: {
        ok: true,
        receiptId: 'submission-1',
        submittedAt: '2026-09-04T07:54:55.402851-05:00',
        finalDraftVersion: 7,
      },
    },
    error: null,
  });
  const client = { functions: { invoke } } as unknown as SupabaseClient;

  await expect(
    submitAssessment(client, {
      token: 'token-seguro',
      clientSubmissionKey: 'key',
      expectedVersion: 7,
      confirmed: true,
    }),
  ).resolves.toEqual({
    ok: true,
    receiptId: 'submission-1',
    submittedAt: '2026-09-04T07:54:55.402851-05:00',
    finalDraftVersion: 7,
  });
});
