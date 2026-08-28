import type { SupabaseClient } from '@supabase/supabase-js';

export interface BulkImportStudentInput {
  groupId: string;
  fullNameOriginal: string;
  fullNameNormalized: string;
  authorizedVariant?: string | null;
}

export async function bulkImportStudents(
  client: SupabaseClient,
  students: BulkImportStudentInput[],
): Promise<{ inserted: number }> {
  if (students.length === 0) {
    return { inserted: 0 };
  }

  const rows = students.map((student) => ({
    group_id: student.groupId,
    full_name_original: student.fullNameOriginal,
    full_name_normalized: student.fullNameNormalized,
    authorized_variants: student.authorizedVariant ? [student.authorizedVariant] : [],
  }));

  const { data, error } = await client.from('students').insert(rows).select('id');

  if (error) {
    throw new Error(`No se pudo importar la nómina: ${error.message}`);
  }

  return { inserted: data?.length ?? 0 };
}
