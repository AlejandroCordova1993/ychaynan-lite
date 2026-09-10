import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isEvaluationRetryable, type SubmissionEvaluationStatus } from './evaluations';

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
  evaluationRetryable: boolean;
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
  const latestEvaluations = new Map<
    string,
    { status: SubmissionEvaluationStatus; requestedAt: string }
  >();
  const submissionIds = [...submissions.values()].map((row) => row.id);
  const evaluationRowsSchema = z.array(
    z.object({
      submission_id: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'reviewed', 'discarded']),
      requested_at: z.string(),
    }),
  );
  const evaluationChunks: string[][] = [];
  for (let offset = 0; offset < submissionIds.length; offset += 100) {
    evaluationChunks.push(submissionIds.slice(offset, offset + 100));
  }
  const evaluationResults = await Promise.all(
    evaluationChunks.map((ids) =>
      client
        .from('ai_evaluations')
        .select('submission_id,status,requested_at')
        .in('submission_id', ids)
        .order('requested_at', { ascending: false })
        .order('id', { ascending: false }),
    ),
  );
  for (const { data: evaluations, error } of evaluationResults) {
    if (error) throw new Error('No pudimos comprobar el estado de las evaluaciones IA.');
    for (const row of evaluationRowsSchema.parse(evaluations ?? [])) {
      if (!latestEvaluations.has(row.submission_id)) {
        latestEvaluations.set(row.submission_id, {
          status: row.status,
          requestedAt: row.requested_at,
        });
      }
    }
  }
  const rows: SubmissionOverviewRow[] = accessRowSchema
    .array()
    .parse(accessResult.data ?? [])
    .map((access) => {
      const submission = submissions.get(access.student_id);
      const evaluation = submission ? latestEvaluations.get(submission.id) : undefined;
      return {
        accessId: access.id,
        studentId: access.student_id,
        studentName: access.students.full_name_original,
        groupId: access.students.group_id,
        groupName: access.students.groups.name,
        schoolYear: access.students.groups.school_year,
        evaluationStatus: evaluation?.status ?? null,
        evaluationRetryable: evaluation ? isEvaluationRetryable(evaluation) : false,
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
  assessments: z.object({
    id: z.string(),
    title: z.string(),
    reading_text: z.string(),
    questions: z.array(
      z.object({
        id: z.string(),
        position: z.number(),
        prompt: z.string(),
        instructions: z.string(),
        suggested_min_words: z.number().nullable(),
        suggested_max_words: z.number().nullable(),
        active_criteria: z.array(z.string()),
        active_modules: z.array(z.string()),
      }),
    ),
  }),
});
const detailResponseSchema = z.object({
  question_id: z.string(),
  original_text: z.string(),
  word_count: z.number(),
  submitted_at: z.string().nullable(),
});
export async function getSubmissionDetail(client: SupabaseClient, submissionId: string) {
  const [headerResult, responseResult] = await Promise.all([
    client
      .from('submissions')
      .select(
        'id,started_at,submitted_at,students!inner(full_name_original),assessments!inner(id,title,reading_text,questions(id,position,prompt,instructions,suggested_min_words,suggested_max_words,active_criteria,active_modules))',
      )
      .eq('id', submissionId)
      .single(),
    client
      .from('responses')
      .select('question_id,original_text,word_count,submitted_at')
      .eq('submission_id', submissionId),
  ]);
  if (headerResult.error)
    throw new Error(`No se pudo cargar la entrega: ${headerResult.error.message}`);
  if (responseResult.error)
    throw new Error(`No se pudieron cargar las respuestas: ${responseResult.error.message}`);
  const header = detailHeaderSchema.parse(headerResult.data);
  const responseByQuestion = new Map(
    detailResponseSchema
      .array()
      .parse(responseResult.data ?? [])
      .map((response) => [response.question_id, response]),
  );
  const responses = header.assessments.questions
    .map((question) => {
      const response = responseByQuestion.get(question.id);
      return {
        questionId: question.id,
        position: question.position,
        prompt: question.prompt,
        instructions: question.instructions,
        originalText: response?.original_text ?? null,
        wordCount: response?.word_count ?? 0,
        omitted: !response || response.original_text.trim().length === 0,
        submittedAt: response?.submitted_at ?? header.submitted_at,
        suggestedMinWords: question.suggested_min_words,
        suggestedMaxWords: question.suggested_max_words,
        activeCriteria: question.active_criteria,
        activeModules: question.active_modules,
      };
    })
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
