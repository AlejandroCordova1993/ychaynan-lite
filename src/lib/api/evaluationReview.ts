import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const adjustmentsSchema = z
  .array(
    z
      .object({
        position: z.number().int().min(1).max(4),
        id: z.string().min(1),
        level: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal('no_aplica'),
        ]),
        reason: z.string().trim().min(1).max(1200),
      })
      .strict(),
  )
  .max(56);
export type TeacherAdjustment = z.infer<typeof adjustmentsSchema>[number];

export async function reviewEvaluation(
  client: SupabaseClient,
  evaluationId: string,
  decision: 'reviewed' | 'discarded',
  adjustments: TeacherAdjustment[],
  note: string,
) {
  const parsed = adjustmentsSchema.parse(adjustments);
  if (note.length > 1200 || (decision === 'discarded' && !note.trim())) {
    throw new Error('Escribe un motivo de hasta 1200 caracteres para descartar.');
  }
  const { error } = await client.rpc('review_submission_evaluation', {
    p_evaluation_id: evaluationId,
    p_decision: decision,
    p_adjustments: parsed,
    p_note: note.trim(),
  });
  if (error)
    throw new Error(
      'No se pudo guardar la revisión. Actualiza la evaluación para comprobar su estado antes de reintentar.',
    );
}
