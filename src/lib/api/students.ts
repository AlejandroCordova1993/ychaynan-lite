import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { INPUT_LIMITS } from '../../../supabase/functions/_shared/inputLimits';

// PostgreSQL es el dueño de la normalización y del tope de 50 por paralelo: el
// navegador solo entrega nombres originales a una única RPC atómica y ya no
// tiene privilegio de INSERT sobre public.students.
export interface BulkImportStudentInput {
  groupId: string;
  fullNameOriginal: string;
  authorizedVariant?: string | null;
}

export async function addStudent(
  client: SupabaseClient,
  groupId: string,
  fullName: string,
): Promise<void> {
  const name = z.string().trim().min(1).max(160).parse(fullName);
  const { error } = await client.rpc('add_student_to_group', {
    p_group_id: groupId,
    p_full_name: name,
  });
  if (error)
    throw new Error(
      error.code === '23505'
        ? 'Ya existe un estudiante con ese nombre en el paralelo. Revisa la nómina antes de añadirlo otra vez.'
        : 'No se pudo añadir. Revisa el nombre, el paralelo activo y el máximo de 50 estudiantes.',
    );
}

// La RPC devuelve únicamente el conteo insertado, nunca la nómina.
const insertedCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(INPUT_LIMITS.roster.studentsPerGroup);

export async function bulkImportStudents(
  client: SupabaseClient,
  students: BulkImportStudentInput[],
): Promise<{ inserted: number }> {
  if (students.length === 0) {
    return { inserted: 0 };
  }

  const groupIds = new Set(students.map(({ groupId }) => groupId));
  if (groupIds.size !== 1) throw new Error('La nómina debe pertenecer a un solo paralelo.');

  const { data, error } = await client.rpc('import_students_to_group', {
    p_group_id: students[0].groupId,
    p_students: students.map((student) => ({
      full_name_original: student.fullNameOriginal,
      authorized_variant: student.authorizedVariant ?? null,
    })),
  });

  if (error)
    throw new Error(
      'No se pudo importar la nómina. Revisa que el paralelo no supere 50 estudiantes.',
    );

  return { inserted: insertedCountSchema.parse(data) };
}
