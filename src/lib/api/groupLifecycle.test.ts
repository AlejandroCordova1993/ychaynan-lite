import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { manageGroup, previewGroupDeletion } from './groupLifecycle';

it('consulta impacto sin borrar y envía nombre confirmado a la RPC de borrado', async () => {
  const impact = { students: 2, accesses: 2, submissions: 1, responses: 4, evaluations: 1 };
  const rpc = vi.fn().mockResolvedValue({ data: impact, error: null });
  const client = { rpc } as unknown as SupabaseClient;
  expect(await previewGroupDeletion(client, 'g1')).toEqual(impact);
  expect(rpc).toHaveBeenCalledWith('delete_group_permanently', {
    p_group_id: 'g1',
    p_preview: true,
  });
  await manageGroup(client, 'g1', 'delete', '1A');
  expect(rpc).toHaveBeenLastCalledWith('delete_group_permanently', {
    p_group_id: 'g1',
    p_confirmation: '1A',
  });
});
it('solicita una operación sin enviar identidad docente', async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  await manageGroup({ rpc } as unknown as SupabaseClient, 'g1', 'archive');
  expect(rpc).toHaveBeenCalledWith('manage_group', { p_group_id: 'g1', p_action: 'archive' });
});
it('explica el bloqueo por actividad sin filtrar detalles internos', async () => {
  const rpc = vi.fn().mockResolvedValue({ error: { code: 'PGL01', message: 'private detail' } });
  await expect(manageGroup({ rpc } as unknown as SupabaseClient, 'g1', 'delete')).rejects.toThrow(
    'Archívalo',
  );
});
