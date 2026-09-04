import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  EVALUATION_ERROR_CATALOG,
  EVALUATION_PROMPT_VERSION,
  type EvaluationErrorCode,
  type EvaluationResult,
} from '../_shared/aiEvaluation.ts';
import { resolveModel, resolveTimeoutMs } from '../generate-assessment-draft/config.ts';
import { createEvaluateSubmissionHandler, type StoredEvaluation } from './handler.ts';
import { evaluateSubmissionWithProvider } from './provider.ts';
import { buildSubmissionEvaluationSource } from './submissionSource.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const apiKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const model = resolveModel(Deno.env.get('DEEPSEEK_MODEL'));
const timeoutMs = resolveTimeoutMs(Deno.env.get('AI_GENERATION_TIMEOUT_MS'));
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!supabaseUrl || !anonKey || !serviceRoleKey || allowedOrigins.length === 0) {
  throw new Error('Faltan variables obligatorias para evaluate-submission.');
}

const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function storedEvaluation(row: Record<string, unknown>): StoredEvaluation {
  return {
    id: String(row.id),
    status: String(row.status),
    result: (row.result_json as EvaluationResult | null | undefined) ?? null,
    confidence: typeof row.confidence === 'number' ? row.confidence : null,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message_safe,
  };
}

const handler = createEvaluateSubmissionHandler({
  allowedOrigins,
  async verifyUser(token) {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, appMetadata: data.user.app_metadata };
  },
  async loadSubmission(submissionId) {
    const { data: submission, error: submissionError } = await serviceClient
      .from('submissions')
      .select('id,assessment_id,status')
      .eq('id', submissionId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return null;

    const [assessmentResult, questionsResult, responsesResult] = await Promise.all([
      serviceClient
        .from('assessments')
        .select(
          'id,purpose,reading_text,general_instructions,rubric_snapshot,rubric_schema_version,rubric_hash',
        )
        .eq('id', submission.assessment_id)
        .single(),
      serviceClient
        .from('questions')
        .select(
          'id,assessment_id,position,prompt,instructions,suggested_min_words,suggested_max_words,active_criteria,active_modules',
        )
        .eq('assessment_id', submission.assessment_id)
        .order('position', { ascending: true }),
      serviceClient
        .from('responses')
        .select('question_id,original_text,word_count')
        .eq('submission_id', submissionId),
    ]);
    if (assessmentResult.error) throw assessmentResult.error;
    if (questionsResult.error) throw questionsResult.error;
    if (responsesResult.error) throw responsesResult.error;

    return buildSubmissionEvaluationSource({
      submission,
      assessment: assessmentResult.data,
      questions: questionsResult.data ?? [],
      responses: responsesResult.data ?? [],
    });
  },
  async loadExistingEvaluation(input) {
    const { data, error } = await serviceClient
      .from('ai_evaluations')
      .select(
        'id,status,result_json,confidence,requested_at,completed_at,error_code,error_message_safe',
      )
      .eq('submission_id', input.submissionId)
      .eq('rubric_hash', input.rubricHash)
      .eq('prompt_version', input.promptVersion)
      .maybeSingle();
    if (error) throw error;
    return data ? storedEvaluation(data) : null;
  },
  async claimEvaluation(input) {
    const now = new Date().toISOString();
    if (input.existingEvaluationId) {
      const { data, error } = await serviceClient
        .from('ai_evaluations')
        .update({
          status: 'running',
          provider: 'deepseek',
          model,
          result_json: null,
          dimension_summary_json: null,
          confidence: null,
          error_code: null,
          error_message_safe: null,
          requested_at: now,
          completed_at: null,
          updated_at: now,
        })
        .eq('id', input.existingEvaluationId)
        .eq('status', 'failed')
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id } : null;
    }

    const { data, error } = await serviceClient
      .from('ai_evaluations')
      .insert({
        submission_id: input.submissionId,
        rubric_schema_version: input.rubricSchemaVersion,
        rubric_hash: input.rubricHash,
        prompt_version: EVALUATION_PROMPT_VERSION,
        provider: 'deepseek',
        model,
        status: 'running',
        requested_at: now,
      })
      .select('id')
      .single();
    if (error?.code === '23505') return null;
    if (error) throw error;
    return { id: data.id };
  },
  async generate(source) {
    return evaluateSubmissionWithProvider(
      {
        readingText: source.readingText,
        purpose: source.purpose,
        generalInstructions: source.generalInstructions,
        rubricSnapshot: source.rubricSnapshot,
        questions: source.questions,
      },
      { apiKey, model, timeoutMs },
    );
  },
  async completeEvaluation(evaluationId, result) {
    const now = new Date().toISOString();
    const { data, error } = await serviceClient
      .from('ai_evaluations')
      .update({
        status: 'completed',
        result_json: result,
        dimension_summary_json: result.dimensionSummaries,
        confidence: result.globalConfidence,
        error_code: null,
        error_message_safe: null,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', evaluationId)
      .eq('status', 'running')
      .select(
        'id,status,result_json,confidence,requested_at,completed_at,error_code,error_message_safe',
      )
      .single();
    if (error) throw error;
    return storedEvaluation(data);
  },
  async failEvaluation(evaluationId, code: EvaluationErrorCode) {
    const now = new Date().toISOString();
    const { error } = await serviceClient
      .from('ai_evaluations')
      .update({
        status: 'failed',
        error_code: code,
        error_message_safe: EVALUATION_ERROR_CATALOG[code].message,
        updated_at: now,
      })
      .eq('id', evaluationId)
      .eq('status', 'running');
    if (error) throw error;
  },
});

Deno.serve(handler);
