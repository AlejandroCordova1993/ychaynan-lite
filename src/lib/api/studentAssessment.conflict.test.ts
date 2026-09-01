import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { saveStudentDraft } from './studentAssessment';

it('recupera el cuerpo 409 devuelto por Supabase para mostrar el conflicto', async () => {
  const context = new Response(
    JSON.stringify({
      ok: false,
      data: {
        ok: false,
        conflict: true,
        draftVersion: 2,
        responses: [{ questionId: 'q1', text: 'remoto' }],
      },
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  );
  const client = {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: { context } }) },
  } as unknown as SupabaseClient;
  await expect(
    saveStudentDraft(client, {
      token: 'token',
      clientSubmissionKey: 'key',
      expectedVersion: 1,
      responses: [],
    }),
  ).resolves.toEqual({
    ok: false,
    conflict: true,
    draftVersion: 2,
    responses: [{ questionId: 'q1', text: 'remoto' }],
  });
});
