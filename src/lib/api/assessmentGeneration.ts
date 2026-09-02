import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { AssessmentDraftInput } from '../../features/assessment/assessmentSchemas';

export const assessmentGenerationInputSchema = z.object({
  readingText: z.string().trim().min(1).max(24_000),
  purpose: z.string().trim().max(1_000).optional(),
  questionCount: z.number().int().min(1).max(4),
  focus: z.enum(['balanced', 'reading_comprehension', 'critical_reasoning', 'writing_conventions']),
});

export type AssessmentGenerationInput = z.infer<typeof assessmentGenerationInputSchema>;

export const generatedAssessmentDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().min(1).max(1_000),
  generalInstructions: z.string().max(6_000),
  questions: z
    .array(
      z.object({
        position: z.number().int().positive(),
        prompt: z.string().trim().min(1).max(2_000),
        instructions: z.string().max(4_000),
        suggestedMinWords: z.number().int().nonnegative().nullable(),
        suggestedMaxWords: z.number().int().positive().nullable(),
        activeCriteria: z.array(z.string()).min(1),
        activeModules: z.array(z.string()),
        curriculumLinks: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(4),
});

export type GeneratedAssessmentDraft = z.infer<typeof generatedAssessmentDraftSchema>;

export async function generateAssessmentDraft(
  client: SupabaseClient,
  rawInput: AssessmentGenerationInput,
): Promise<GeneratedAssessmentDraft> {
  const input = assessmentGenerationInputSchema.parse(rawInput);
  const { data, error } = await client.functions.invoke('generate-assessment-draft', {
    body: input,
  });

  if (error || !data?.ok) {
    throw new Error('No pudimos generar una propuesta. Inténtalo nuevamente.');
  }

  const parsed = generatedAssessmentDraftSchema.safeParse(data.data);
  if (!parsed.success || parsed.data.questions.length !== input.questionCount) {
    throw new Error('La IA devolvió una propuesta incompleta.');
  }
  return parsed.data;
}

export function mergeGeneratedDraft(
  current: Pick<
    AssessmentDraftInput,
    'readingText' | 'opensAt' | 'closesAt' | 'pastePolicy' | 'curriculumVersion'
  >,
  generated: GeneratedAssessmentDraft,
): AssessmentDraftInput {
  return {
    ...current,
    title: generated.title,
    purpose: generated.purpose,
    generalInstructions: generated.generalInstructions,
    questions: generated.questions.map((question) => ({
      ...question,
      curriculumLinks: question.curriculumLinks,
    })),
  };
}
