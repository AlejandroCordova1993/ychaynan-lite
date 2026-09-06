import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { SubmissionEvaluationStatus } from './evaluations';

export type SubmissionOverviewStatus =
  'esperado' | 'iniciado' | 'entregado' | 'bloqueado' | 'revocado';
export function mapAccessState(input: {
  access: string;
  submission: string | null;
}): SubmissionOverviewStatus {
  if (input.submission === 'submitted' || input.access === 'submitted') return 'entregado';
  if (input.submission === 'in_progress' || input.access === 'active') return 'iniciado';
  if (input.access === 'blocked') return 'bloqueado';
  if (input.access === 'revoked') return 'revocado';
  return 'esperado';
}

const accessRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  state: z.string(),
  students: z.object({
    full_name_original: z.string(),
    group_id: z.string(),
    groups: z.object({ name: z.string(), school_year: z.string() }),
  }),
});
const submissionRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  status: z.string(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
});
export interface SubmissionOverviewRow {
  accessId: string;
  studentId: string;
  studentName: string;
  status: SubmissionOverviewStatus;
  submissionId: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  groupId: string;
  groupName: string;
  schoolYear: string;
  evaluationStatus: SubmissionEvaluationStatus | null;
}

export async function listAppliedAssessments(client: SupabaseClient) {
  const { data, error } = await client
    .from('assessments')
    .select('id,title,status,opened_at')
    .in('status', ['open', 'closed', 'archived'])
    .order('opened_at', { ascending: false });
  if (error) throw new Error('No pudimos cargar las evaluaciones.');
  return z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        status: z.string(),
        opened_at: z.string().nullable(),
      }),
    )
    .parse(data ?? []);
}

export async function listSubmissionOverview(
  client: SupabaseClient,
  selectedAssessmentId?: string,
) {
  let query = client
    .from('assessments')
    .select('id,title')
    .in('status', ['open', 'closed', 'archived']);
  if (selectedAssessmentId) query = query.eq('id', selectedAssessmentId);
  const { data: assessment, error: assessmentError } = await query
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assessmentError)
    throw new Error(`No se pudo cargar la evaluación: ${assessmentError.message}`);
  if (!assessment) return null;
  const [accessResult, submissionResult] = await Promise.all([
    client
      .from('assessment_access')
      .select(
        'id,student_id,state,students!inner(full_name_original,group_id,groups!inner(name,school_year))',
      )
      .eq('assessment_id', assessment.id),
    client
      .from('submissions')
      .select('id,student_id,status,started_at,submitted_at')
      .eq('assessment_id', assessment.id),
  ]);
  if (accessResult.error)
    throw new Error(`No se pudieron cargar los accesos: ${accessResult.error.message}`);
  if (submissionResult.error)
    throw new Error(`No se pudieron cargar las entregas: ${submissionResult.error.message}`);
  const submissions = new Map(
    submissionRowSchema
      .array()
      .parse(submissionResult.data ?? [])
      .map((row) => [row.student_id, row]),
  );
  const evaluationStatuses = new Map<string, SubmissionEvaluationStatus>();
  const submissionIds = [...submissions.values()].map((row) => row.id);
  const evaluationRowsSchema = z.array(
    z.object({
      submission_id: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'reviewed', 'discarded']),
    }),
  );
  for (let offset = 0; offset < submissionIds.length; offset += 100) {
    const { data: evaluations, error } = await client
      .from('ai_evaluations')
      .select('submission_id,status')
      .in('submission_id', submissionIds.slice(offset, offset + 100))
      .order('requested_at', { ascending: false });
    if (error) throw new Error('No pudimos comprobar el estado de las evaluaciones IA.');
    for (const row of evaluationRowsSchema.parse(evaluations ?? [])) {
      if (!evaluationStatuses.has(row.submission_id))
        evaluationStatuses.set(row.submission_id, row.status);
    }
  }
  const rows: SubmissionOverviewRow[] = accessRowSchema
    .array()
    .parse(accessResult.data ?? [])
    .map((access) => {
      const submission = submissions.get(access.student_id);
      return {
        accessId: access.id,
        studentId: access.student_id,
        studentName: access.students.full_name_original,
        groupId: access.students.group_id,
        groupName: access.students.groups.name,
        schoolYear: access.students.groups.school_year,
        evaluationStatus: submission ? (evaluationStatuses.get(submission.id) ?? null) : null,
        status: mapAccessState({ access: access.state, submission: submission?.status ?? null }),
        submissionId: submission?.id ?? null,
        startedAt: submission?.started_at ?? null,
        submittedAt: submission?.submitted_at ?? null,
      };
    });
  rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'es'));
  return { assessmentId: assessment.id, title: assessment.title, rows };
}

const detailHeaderSchema = z.object({
  id: z.string(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
  students: z.object({ full_name_original: z.string() }),
  assessments: z.object({ title: z.string(), reading_text: z.string() }),
});
const detailResponseSchema = z.object({
  question_id: z.string(),
  original_text: z.string(),
  word_count: z.number(),
  submitted_at: z.string().nullable(),
  questions: z.object({
    position: z.number(),
    prompt: z.string(),
    instructions: z.string(),
    suggested_min_words: z.number().nullable(),
    suggested_max_words: z.number().nullable(),
    active_criteria: z.array(z.string()),
    active_modules: z.array(z.string()),
  }),
});
export async function getSubmissionDetail(client: SupabaseClient, submissionId: string) {
  const [headerResult, responseResult] = await Promise.all([
    client
      .from('submissions')
      .select(
        'id,started_at,submitted_at,students!inner(full_name_original),assessments!inner(title,reading_text)',
      )
      .eq('id', submissionId)
      .single(),
    client
      .from('responses')
      .select(
        'question_id,original_text,word_count,submitted_at,questions!inner(position,prompt,instructions,suggested_min_words,suggested_max_words,active_criteria,active_modules)',
      )
      .eq('submission_id', submissionId),
  ]);
  if (headerResult.error)
    throw new Error(`No se pudo cargar la entrega: ${headerResult.error.message}`);
  if (responseResult.error)
    throw new Error(`No se pudieron cargar las respuestas: ${responseResult.error.message}`);
  const header = detailHeaderSchema.parse(headerResult.data);
  const responses = detailResponseSchema
    .array()
    .parse(responseResult.data ?? [])
    .map((row) => ({
      questionId: row.question_id,
      position: row.questions.position,
      prompt: row.questions.prompt,
      instructions: row.questions.instructions,
      originalText: row.original_text,
      wordCount: row.word_count,
      submittedAt: row.submitted_at,
      suggestedMinWords: row.questions.suggested_min_words,
      suggestedMaxWords: row.questions.suggested_max_words,
      activeCriteria: row.questions.active_criteria,
      activeModules: row.questions.active_modules,
    }))
    .sort((a, b) => a.position - b.position);
  return {
    id: header.id,
    studentName: header.students.full_name_original,
    assessmentTitle: header.assessments.title,
    readingText: header.assessments.reading_text,
    startedAt: header.started_at,
    submittedAt: header.submitted_at,
    responses,
  };
}
