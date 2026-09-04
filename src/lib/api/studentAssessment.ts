import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const sessionSchema = z.object({
  token: z.string().min(20),
  expiresAt: z.string().datetime({ offset: true }),
  clientSubmissionKey: z.string().min(1),
  submissionId: z.string().min(1),
  draftVersion: z.number().int().nonnegative(),
});
const responseSchema = z.object({ questionId: z.string().min(1), text: z.string() });
const questionSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().positive(),
  prompt: z.string(),
  instructions: z.string(),
  suggestedMinWords: z.number().nullable(),
  suggestedMaxWords: z.number().nullable(),
});
const assessmentSchema = z.object({
  slug: z.string(),
  title: z.string(),
  readingText: z.string(),
  generalInstructions: z.string(),
  pastePolicy: z.enum(['allow', 'discourage']),
  closesAt: z.string().nullable(),
  questions: z.array(questionSchema),
});
export type StudentSession = z.infer<typeof sessionSchema>;
export type StudentAssessment = z.infer<typeof assessmentSchema>;
export type StudentDraftResponse = z.infer<typeof responseSchema>;
export interface ValidateStudentInput {
  assessmentSlug: string;
  fullName: string;
  groupName: string;
  personalCode: string;
  fingerprint: string;
}

async function invoke(client: SupabaseClient, functionName: string, body: Record<string, unknown>) {
  const { data, error } = await client.functions.invoke(functionName, { body });
  if (error) throw new Error('No pudimos completar la operación.');
  return data;
}
export async function validateStudent(
  client: SupabaseClient,
  input: ValidateStudentInput,
): Promise<StudentSession> {
  const data = await invoke(
    client,
    'validate-student',
    input as unknown as Record<string, unknown>,
  );
  return z.object({ ok: z.literal(true), data: sessionSchema }).parse(data).data;
}
export async function loadStudentAssessment(client: SupabaseClient, session: StudentSession) {
  const data = await invoke(client, 'save-draft', {
    action: 'load',
    token: session.token,
    clientSubmissionKey: session.clientSubmissionKey,
  });
  return z
    .object({
      ok: z.literal(true),
      data: z.object({
        assessment: assessmentSchema,
        responses: z.array(responseSchema),
        draftVersion: z.number().int().nonnegative(),
      }),
    })
    .parse(data).data;
}
export type SaveDraftResult =
  | { ok: true; draftVersion: number }
  | { ok: false; conflict: true; draftVersion: number; responses: StudentDraftResponse[] };
export async function saveStudentDraft(
  client: SupabaseClient,
  input: {
    token: string;
    clientSubmissionKey: string;
    expectedVersion: number;
    responses: StudentDraftResponse[];
  },
): Promise<SaveDraftResult> {
  const { data, error } = await client.functions.invoke('save-draft', {
    body: { action: 'save', ...input },
  });
  let payload = data;
  if (error && !payload) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response && context.status === 409) payload = await context.json();
    else throw new Error('No pudimos sincronizar el borrador.');
  }
  if (payload?.ok === false && payload?.data?.conflict)
    return z
      .object({
        ok: z.literal(false),
        data: z.object({
          ok: z.literal(false),
          conflict: z.literal(true),
          draftVersion: z.number(),
          responses: z.array(responseSchema),
        }),
      })
      .parse(payload).data;
  return z
    .object({
      ok: z.literal(true),
      data: z.object({ ok: z.literal(true), draftVersion: z.number() }),
    })
    .parse(payload).data;
}
