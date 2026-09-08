import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { closeAssessment, updateAssessmentSchedule } from './assessments';
function clientFor(error: unknown = null) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: error ? null : { id: 'a' }, error }),
  };
  const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
  return { client, chain };
}
it('rechaza horarios invertidos antes de escribir y no modifica contenido al guardar', async () => {
  const { client, chain } = clientFor();
  await expect(
    updateAssessmentSchedule(client, 'a', '2026-09-10T05:00:00Z', '2026-09-09T05:00:00Z'),
  ).rejects.toThrow(/posterior/);
  expect(client.from).not.toHaveBeenCalled();
  await updateAssessmentSchedule(client, 'a', null, '2026-10-09T05:00:00Z');
  expect(chain.update).toHaveBeenCalledWith({ opens_at: null, closes_at: '2026-10-09T05:00:00Z' });
  expect(chain.eq).toHaveBeenCalledWith('id', 'a');
  expect(chain.eq).toHaveBeenCalledWith('status', 'open');
});
it('cierra solo la evaluación solicitada que continúa abierta', async () => {
  const { client, chain } = clientFor();
  await closeAssessment(client, 'a');
  expect(chain.update).toHaveBeenCalledWith({ status: 'closed' });
  expect(chain.eq).toHaveBeenCalledWith('id', 'a');
  expect(chain.eq).toHaveBeenCalledWith('status', 'open');
});
it('no comunica éxito si RLS o un cambio concurrente impiden la operación', async () => {
  const { client } = clientFor({ code: 'PGRST116' });
  await expect(closeAssessment(client, 'a')).rejects.toThrow(/No se pudo cerrar/);
  await expect(updateAssessmentSchedule(client, 'a', null, null)).rejects.toThrow(
    /No se pudo guardar/,
  );
});
