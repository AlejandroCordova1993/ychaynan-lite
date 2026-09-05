import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const accessCodeSchema = z.string().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
const accessStateSchema = z.enum(['unused', 'active', 'submitted', 'blocked', 'revoked']);
const submissionStatusSchema = z.enum(['none', 'in_progress', 'submitted', 'reopened']);
const codeStatusSchema = z.enum(['available', 'legacy', 'hidden', 'unavailable']);

const accessItemSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  groupName: z.string().min(1),
  state: accessStateSchema,
  submissionStatus: submissionStatusSchema,
  failedAttempts: z.number().int().nonnegative(),
  cooldownUntil: z.string().nullable(),
  code: accessCodeSchema.nullable(),
  codeStatus: codeStatusSchema,
});
const overviewSchema = z.object({
  assessmentId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  legacyCount: z.number().int().nonnegative(),
  accesses: z.array(accessItemSchema),
});

async function invoke(client: SupabaseClient, body: Record<string, string>) {
  const { data, error } = await client.functions.invoke('manage-assessment-access', { body });
  if (error) throw new Error(`No se pudo gestionar el acceso: ${error.message}`);
  return data;
}

export type AccessState = z.infer<typeof accessStateSchema>;
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type AccessCodeStatus = z.infer<typeof codeStatusSchema>;
export type AccessOverviewItem = z.infer<typeof accessItemSchema>;
export type AccessOverview = z.infer<typeof overviewSchema>;

/**
 * Los códigos vigentes solo existen dentro de la Edge Function: aquí se piden
 * con el JWT docente y nunca se leen desde una tabla del cliente.
 */
export async function getAccessOverview(client: SupabaseClient): Promise<AccessOverview | null> {
  const result = await invoke(client, { action: 'list' });
  return z.object({ ok: z.literal(true), data: overviewSchema.nullable() }).parse(result).data;
}

export async function openAssessment(
  client: SupabaseClient,
  assessmentId: string,
  groupId: string,
): Promise<AccessOverview> {
  const result = await invoke(client, { action: 'open', assessmentId, groupId });
  return z.object({ ok: z.literal(true), data: overviewSchema }).parse(result).data;
}

export async function regenerateAccess(client: SupabaseClient, accessId: string): Promise<string> {
  const result = await invoke(client, { action: 'regenerate', accessId });
  return z
    .object({
      ok: z.literal(true),
      data: z.object({ accessId: z.string().min(1), code: accessCodeSchema }),
    })
    .parse(result).data.code;
}

export interface LegacyRotationResult {
  rotated: number;
  revokedSessions: number;
  list: AccessOverview | null;
}

export async function rotateLegacyAccessCodes(
  client: SupabaseClient,
  assessmentId: string,
): Promise<LegacyRotationResult> {
  const result = await invoke(client, { action: 'rotateLegacy', assessmentId });
  return z
    .object({
      ok: z.literal(true),
      data: z.object({
        rotated: z.number().int().nonnegative(),
        revokedSessions: z.number().int().nonnegative(),
        list: overviewSchema.nullable(),
      }),
    })
    .parse(result).data;
}

export async function unblockAccess(client: SupabaseClient, accessId: string): Promise<void> {
  const result = await invoke(client, { action: 'unblock', accessId });
  z.object({ ok: z.literal(true) }).parse(result);
}
