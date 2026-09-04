import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  EVALUATION_ERROR_CATALOG,
  parseEvaluationResult,
  type EvaluationErrorCode,
  type EvaluationQuestion,
  type EvaluationResult,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';

export type SubmissionEvaluationStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'reviewed' | 'discarded';

export interface SubmissionEvaluationView {
  id: string;
  status: SubmissionEvaluationStatus;
  result: EvaluationResult | null;
  confidence: number | null;
  requestedAt: string;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  teacherAdjustments?: unknown;
  teacherNote?: string | null;
}

export class SubmissionEvaluationApiError extends Error {
  readonly code: EvaluationErrorCode;

  constructor(code: EvaluationErrorCode) {
    super(EVALUATION_ERROR_CATALOG[code].message);
    this.name = 'SubmissionEvaluationApiError';
    this.code = code;
  }
}

const rowSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'reviewed', 'discarded']),
  result_json: z.unknown().nullable(),
  confidence: z.number().nullable(),
  requested_at: z.string(),
  completed_at: z.string().nullable(),
  error_code: z.string().nullable(),
  error_message_safe: z.string().nullable(),
  teacher_adjustments: z.unknown().nullable().optional(),
  teacher_note: z.string().nullable().optional(),
});

function isEvaluationErrorCode(value: unknown): value is EvaluationErrorCode {
  return typeof value === 'string' && value in EVALUATION_ERROR_CATALOG;
}

async function contractCodeFrom(error: unknown): Promise<EvaluationErrorCode | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (typeof context?.json !== 'function') return null;
  try {
    const body = (await context.json()) as { ok?: unknown; error?: { code?: unknown } } | null;
    return body?.ok === false && isEvaluationErrorCode(body.error?.code) ? body.error.code : null;
  } catch {
    return null;
  }
}

export async function getSubmissionEvaluation(
  client: SupabaseClient,
  submissionId: string,
  questions: EvaluationQuestion[],
): Promise<SubmissionEvaluationView | null> {
  const { data, error } = await client
    .from('ai_evaluations')
    .select(
      'id,status,result_json,confidence,requested_at,completed_at,error_code,error_message_safe,teacher_adjustments,teacher_note',
    )
    .eq('submission_id', submissionId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la evaluación: ${error.message}`);
  if (!data) return null;
  const row = rowSchema.parse(data);
  const result =
    row.result_json !== null && (row.status === 'completed' || row.status === 'reviewed')
      ? parseEvaluationResult(row.result_json, questions)
      : null;
  return {
    id: row.id,
    status: row.status,
    result,
    confidence: row.confidence,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message_safe,
    teacherAdjustments: row.teacher_adjustments,
    teacherNote: row.teacher_note,
  };
}

export async function requestSubmissionEvaluation(
  client: SupabaseClient,
  submissionId: string,
  forceRetry = false,
): Promise<{ reused: boolean }> {
  const { data, error } = await client.functions.invoke('evaluate-submission', {
    body: { submissionId, forceRetry },
  });
  if (error) {
    throw new SubmissionEvaluationApiError(
      (await contractCodeFrom(error)) ?? 'provider_unavailable',
    );
  }
  const envelope = data as {
    ok?: unknown;
    data?: { reused?: unknown };
    error?: { code?: unknown };
  };
  if (envelope?.ok !== true) {
    throw new SubmissionEvaluationApiError(
      isEvaluationErrorCode(envelope?.error?.code) ? envelope.error.code : 'provider_unavailable',
    );
  }
  return { reused: envelope.data?.reused === true };
}
