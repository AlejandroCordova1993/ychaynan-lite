import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createGroupInputSchema,
  groupSchema,
  type CreateGroupInput,
  type Group,
} from '../validation/schemas';

export async function createGroup(
  client: SupabaseClient,
  rawInput: CreateGroupInput,
): Promise<Group> {
  const input = createGroupInputSchema.parse(rawInput);

  const { data, error } = await client
    .from('groups')
    .insert({ name: input.name, school_year: input.schoolYear })
    .select('id, name, school_year, status')
    .single();

  if (error) {
    throw new Error(`No se pudo crear el paralelo: ${error.message}`);
  }

  return groupSchema.parse({
    id: data.id,
    name: data.name,
    schoolYear: data.school_year,
    status: data.status,
  });
}

export async function listGroups(client: SupabaseClient): Promise<Group[]> {
  const { data, error } = await client
    .from('groups')
    .select('id, name, school_year, status')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los paralelos: ${error.message}`);
  }

  return (data ?? []).map(
    (row: { id: string; name: string; school_year: string; status: string }) =>
      groupSchema.parse({
        id: row.id,
        name: row.name,
        schoolYear: row.school_year,
        status: row.status,
      }),
  );
}
