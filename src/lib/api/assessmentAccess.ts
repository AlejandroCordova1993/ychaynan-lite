import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const accessCodeSchema = z.string().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
const receiptSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  code: accessCodeSchema,
});
const accessStateSchema = z.enum(['unused', 'active', 'submitted', 'blocked', 'revoked']);
const accessRowSchema = z.object({
  id: z.string().min(1),
  student_id: z.string().min(1),
  state: accessStateSchema,
  failed_attempts: z.number().int().nonnegative(),
  cooldown_until: z.string().nullable(),
  students: z.object({ full_name_original: z.string().min(1) }),
});

async function invoke(client: SupabaseClient, body: Record<string, string>) {
  const { data, error } = await client.functions.invoke('manage-assessment-access', { body });
  if (error) throw new Error(`No se pudo gestionar el acceso: ${error.message}`);
  return data;
}

export type AccessCodeReceipt = z.infer<typeof receiptSchema>;
export type AccessState = z.infer<typeof accessStateSchema>;
export interface AccessOverviewItem {
  id: string;
  studentId: string;
  fullName: string;
  state: AccessState;
  failedAttempts: number;
  cooldownUntil: string | null;
}
export interface AccessOverview {
  assessmentId: string;
  title: string;
  accesses: AccessOverviewItem[];
}

export async function getAccessOverview(client: SupabaseClient): Promise<AccessOverview | null> {
  const { data: assessment, error: assessmentError } = await client
    .from('assessments')
    .select('id, title')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assessmentError) {
    throw new Error(`No se pudo cargar la evaluación abierta: ${assessmentError.message}`);
  }
  if (!assessment) return null;

  const { data, error } = await client
    .from('assessment_access')
    .select(
      'id, student_id, state, failed_attempts, cooldown_until, students!inner(full_name_original)',
    )
    .eq('assessment_id', assessment.id)
    .order('generated_at', { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los accesos: ${error.message}`);

  const accesses = accessRowSchema
    .array()
    .parse(data ?? [])
    .map((row) => ({
      id: row.id,
      studentId: row.student_id,
      fullName: row.students.full_name_original,
      state: row.state,
      failedAttempts: row.failed_attempts,
      cooldownUntil: row.cooldown_until,
    }));
  accesses.sort((left, right) => left.fullName.localeCompare(right.fullName, 'es'));

  return { assessmentId: assessment.id, title: assessment.title, accesses };
}

export async function openAssessment(
  client: SupabaseClient,
  assessmentId: string,
  groupId: string,
): Promise<AccessCodeReceipt[]> {
  const result = await invoke(client, { action: 'open', assessmentId, groupId });
  return z.object({ ok: z.literal(true), data: z.array(receiptSchema) }).parse(result).data;
}

export async function regenerateAccess(client: SupabaseClient, accessId: string): Promise<string> {
  const result = await invoke(client, { action: 'regenerate', accessId });
  return z.object({ ok: z.literal(true), data: z.object({ code: accessCodeSchema }) }).parse(result)
    .data.code;
}

export async function unblockAccess(client: SupabaseClient, accessId: string): Promise<void> {
  const result = await invoke(client, { action: 'unblock', accessId });
  z.object({ ok: z.literal(true) }).parse(result);
}
