import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listSubmissionOverview } from './submissions';

function clientFixture(
  error: unknown = null,
  evaluationRows: unknown[] = [
    { submission_id: 'sub1', status: 'reviewed', requested_at: '2026-09-08T11:00:00Z' },
    { submission_id: 'sub1', status: 'failed', requested_at: '2026-09-08T10:00:00Z' },
  ],
) {
  const tables: Record<string, unknown> = {
    assessments: { id: 'a1', title: 'Diagnóstico' },
    assessment_access: [
      {
        id: 'x1',
        student_id: 's1',
        state: 'submitted',
        students: {
          full_name_original: 'Ana',
          group_id: 'g1',
          groups: { name: '1A', school_year: '2026' },
        },
      },
    ],
    submissions: [
      {
        id: 'sub1',
        student_id: 's1',
        status: 'submitted',
        started_at: '2026-09-01',
        submitted_at: '2026-09-01',
      },
    ],
    ai_evaluations: evaluationRows,
  };
  const chains: Record<string, ReturnType<typeof chain>> = {};
  function chain(table: string) {
    const result = () => ({
      data: tables[table],
      error: table === 'ai_evaluations' ? error : null,
    });
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => result()),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
        Promise.resolve(result()).then(resolve),
    };
  }
  const client = {
    from: vi.fn((table: string) => (chains[table] ??= chain(table))),
  } as unknown as SupabaseClient;
  return { client, chains };
}
it('consulta la evaluación seleccionada e incorpora el paralelo y último estado IA', async () => {
  const { client, chains } = clientFixture();
  const result = await listSubmissionOverview(client, 'a1');
  expect(chains.assessments.eq).toHaveBeenCalledWith('id', 'a1');
  expect(chains.assessment_access.eq).toHaveBeenCalledWith('assessment_id', 'a1');
  expect(chains.ai_evaluations.in).toHaveBeenCalledWith('submission_id', ['sub1']);
  expect(chains.ai_evaluations.order).toHaveBeenCalledWith('requested_at', { ascending: false });
  expect(result?.rows[0]).toMatchObject({
    groupId: 'g1',
    groupName: '1A',
    schoolYear: '2026',
    evaluationStatus: 'reviewed',
    evaluationRetryable: false,
  });
});

it('marca como recuperable el último proceso IA que quedó interrumpido', async () => {
  const { client } = clientFixture(null, [
    { submission_id: 'sub1', status: 'running', requested_at: '2020-01-01T00:00:00Z' },
  ]);
  const result = await listSubmissionOverview(client, 'a1');
  expect(result?.rows[0].evaluationRetryable).toBe(true);
});
it('no trata como pendientes los resultados cuyo estado no pudo cargar', async () => {
  const { client } = clientFixture({ message: 'fallo' });
  await expect(listSubmissionOverview(client, 'a1')).rejects.toThrow('estado');
});
