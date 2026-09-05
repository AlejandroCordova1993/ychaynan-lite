import type { SupabaseClient } from '@supabase/supabase-js';

export type GroupAction = 'archive' | 'restore' | 'delete';

export async function manageGroup(client: SupabaseClient, groupId: string, action: GroupAction) {
  const { error } = await client.rpc('manage_group', { p_group_id: groupId, p_action: action });
  if (!error) return;
  if (error.code === 'PGL01' || error.code === '23503') {
    throw new Error(
      'Este curso tiene accesos o entregas asociados. Archívalo para conservar su historial.',
    );
  }
  throw new Error('No pudimos actualizar el curso. Recarga la lista e intenta nuevamente.');
}
