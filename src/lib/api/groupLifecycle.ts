import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const impactSchema = z.object({
  students: z.number(),
  accesses: z.number(),
  submissions: z.number(),
  responses: z.number(),
  evaluations: z.number(),
});
export type GroupDeletionImpact = z.infer<typeof impactSchema>;
export async function previewGroupDeletion(client: SupabaseClient, groupId: string) {
  const { data, error } = await client.rpc('delete_group_permanently', {
    p_group_id: groupId,
    p_preview: true,
  });
  if (error) throw new Error('No pudimos consultar los datos afectados. Intenta nuevamente.');
  return impactSchema.parse(data);
}

export type GroupAction = 'archive' | 'restore' | 'delete';

export async function manageGroup(
  client: SupabaseClient,
  groupId: string,
  action: GroupAction,
  confirmation?: string,
) {
  const { error } =
    action === 'delete' && confirmation !== undefined
      ? await client.rpc('delete_group_permanently', {
          p_group_id: groupId,
          p_confirmation: confirmation,
        })
      : await client.rpc('manage_group', { p_group_id: groupId, p_action: action });
  if (!error) return;
  if (error.code === 'PGL01' || error.code === '23503') {
    throw new Error(
      'Este curso tiene accesos o entregas asociados. Archívalo para conservar su historial.',
    );
  }
  throw new Error('No pudimos actualizar el curso. Recarga la lista e intenta nuevamente.');
}
