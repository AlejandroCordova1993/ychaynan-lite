import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const submissionReceiptSchema = z.object({
  receiptId: z.string().min(1),
  submittedAt: z.string().datetime(),
  finalDraftVersion: z.number().int().nonnegative(),
});
export type SubmissionReceipt = z.infer<typeof submissionReceiptSchema>;

export async function submitAssessment(
  client: SupabaseClient,
  input: { token: string; clientSubmissionKey: string; expectedVersion: number; confirmed: true },
): Promise<SubmissionReceipt> {
  const { data, error } = await client.functions.invoke('submit-assessment', { body: input });
  if (error) throw new Error('No pudimos registrar la entrega.');
  return z
    .object({
      ok: z.literal(true),
      data: z.object({ ok: z.literal(true) }).and(submissionReceiptSchema),
    })
    .parse(data).data;
}
