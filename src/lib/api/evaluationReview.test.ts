import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reviewEvaluation } from './evaluationReview';
it('envía únicamente decisión, ajustes y nota; el servidor determina autor y fecha', async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  await reviewEvaluation({ rpc } as unknown as SupabaseClient, 'id', 'reviewed', [], ' Nota ');
  expect(rpc).toHaveBeenCalledWith('review_submission_evaluation', {
    p_evaluation_id: 'id',
    p_decision: 'reviewed',
    p_adjustments: [],
    p_note: 'Nota',
  });
});
it('rechaza descarte sin motivo antes de llamar al servidor', async () => {
  const rpc = vi.fn();
  await expect(
    reviewEvaluation({ rpc } as unknown as SupabaseClient, 'id', 'discarded', [], '  '),
  ).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
it('no muestra detalles privados de errores de la base', async () => {
  const rpc = vi.fn().mockResolvedValue({ error: { message: 'private database detail' } });
  await expect(
    reviewEvaluation({ rpc } as unknown as SupabaseClient, 'id', 'reviewed', [], ''),
  ).rejects.toThrow(/Actualiza/);
});
