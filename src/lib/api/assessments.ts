import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import rubric from '../../../rubric-v1.json';
import {
  assessmentDraftSchema,
  type AssessmentDraftInput,
} from '../../features/assessment/assessmentSchemas';
import { createRubricSnapshot } from '../rubric/createRubricSnapshot';

interface AssessmentRow {
  id: string;
  title: string;
  purpose: string;
  reading_text: string;
  general_instructions: string;
  opens_at: string | null;
  closes_at: string | null;
  paste_policy: 'allow' | 'discourage';
  curriculum_version: string | null;
}

interface QuestionRow {
  id: string;
  position: number;
  prompt: string;
  instructions: string;
  suggested_min_words: number | null;
  suggested_max_words: number | null;
  active_criteria: string[];
  active_modules: string[];
  curriculum_links: Record<string, unknown>;
}

export async function saveAssessmentDraft(
  client: SupabaseClient,
  rawInput: AssessmentDraftInput,
): Promise<string> {
  const input = assessmentDraftSchema.parse(rawInput);
  const rubricSnapshot = await createRubricSnapshot(rubric);

  const { data, error } = await client.rpc('save_assessment_draft', {
    p_assessment: {
      id: input.id,
      title: input.title,
      purpose: input.purpose,
      reading_text: input.readingText,
      general_instructions: input.generalInstructions,
      opens_at: input.opensAt,
      closes_at: input.closesAt,
      paste_policy: input.pastePolicy,
      curriculum_version: input.curriculumVersion,
      rubric_snapshot: rubricSnapshot.snapshot,
      rubric_schema_version: rubricSnapshot.schemaVersion,
      rubric_hash: rubricSnapshot.hash,
    },
    p_questions: input.questions.map((question) => ({
      id: question.id,
      position: question.position,
      prompt: question.prompt,
      instructions: question.instructions,
      suggested_min_words: question.suggestedMinWords,
      suggested_max_words: question.suggestedMaxWords,
      active_criteria: question.activeCriteria,
      active_modules: question.activeModules,
      curriculum_links: question.curriculumLinks,
    })),
  });

  if (error) {
    throw new Error(`No se pudo guardar la evaluación: ${error.message}`);
  }

  return z.string().uuid().parse(data);
}

export async function getDraftAssessment(
  client: SupabaseClient,
): Promise<AssessmentDraftInput | null> {
  const { data: assessmentData, error: assessmentError } = await client
    .from('assessments')
    .select(
      'id, title, purpose, reading_text, general_instructions, opens_at, closes_at, paste_policy, curriculum_version',
    )
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assessmentError) {
    throw new Error(`No se pudo cargar la evaluación: ${assessmentError.message}`);
  }

  if (!assessmentData) {
    return null;
  }

  const assessment = assessmentData as AssessmentRow;
  const { data: questionData, error: questionError } = await client
    .from('questions')
    .select(
      'id, position, prompt, instructions, suggested_min_words, suggested_max_words, active_criteria, active_modules, curriculum_links',
    )
    .eq('assessment_id', assessment.id)
    .order('position', { ascending: true });

  if (questionError) {
    throw new Error(`No se pudieron cargar las preguntas: ${questionError.message}`);
  }

  return assessmentDraftSchema.parse({
    id: assessment.id,
    title: assessment.title,
    purpose: assessment.purpose,
    readingText: assessment.reading_text,
    generalInstructions: assessment.general_instructions,
    opensAt: assessment.opens_at,
    closesAt: assessment.closes_at,
    pastePolicy: assessment.paste_policy,
    curriculumVersion: assessment.curriculum_version,
    questions: ((questionData ?? []) as QuestionRow[]).map((question) => ({
      id: question.id,
      position: question.position,
      prompt: question.prompt,
      instructions: question.instructions,
      suggestedMinWords: question.suggested_min_words,
      suggestedMaxWords: question.suggested_max_words,
      activeCriteria: question.active_criteria,
      activeModules: question.active_modules,
      curriculumLinks: question.curriculum_links,
    })),
  });
}
