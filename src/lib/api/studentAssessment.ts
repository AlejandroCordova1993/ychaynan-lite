import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const sessionSchema = z.object({
  token: z.string().min(20),
  expiresAt: z.string().datetime(),
  clientSubmissionKey: z.string().min(1),
  submissionId: z.string().min(1),
  draftVersion: z.number().int().nonnegative(),
});
export type StudentSession = z.infer<typeof sessionSchema>;
export interface ValidateStudentInput {
  assessmentSlug: string;
  fullName: string;
  groupName: string;
  personalCode: string;
  fingerprint: string;
}

export async function validateStudent(
  client: SupabaseClient,
  input: ValidateStudentInput,
): Promise<StudentSession> {
  const { data, error } = await client.functions.invoke('validate-student', { body: input });
  if (error) throw new Error('No pudimos validar tus datos.');
  return z.object({ ok: z.literal(true), data: sessionSchema }).parse(data).data;
}
