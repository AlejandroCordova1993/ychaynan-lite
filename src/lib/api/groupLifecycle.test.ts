import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { manageGroup } from './groupLifecycle';
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
