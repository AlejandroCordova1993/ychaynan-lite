import { handlePreflight, jsonResponse } from '../_shared/http.ts';
import {
  EVALUATION_ERROR_CATALOG,
  EVALUATION_PROMPT_VERSION,
  EvaluationError,
  evaluationErrorBody,
  markMissingEvidenceForReview,
  parseEvaluationRequest,
  parseEvaluationResult,
  type EvaluationErrorCode,
  type EvaluationQuestion,
  type EvaluationResult,
} from '../_shared/aiEvaluation.ts';

interface VerifiedUser {
  id: string;
  appMetadata: Record<string, unknown>;
}

export interface SubmissionEvaluationSource {
  submissionId: string;
  status: string;
  readingText: string;
  purpose: string;
  generalInstructions: string;
  rubricSnapshot: unknown;
  rubricSchemaVersion: string;
  rubricHash: string;
  questions: EvaluationQuestion[];
}

export interface StoredEvaluation {
  id: string;
  status: string;
  result?: EvaluationResult | null;
  confidence?: number | null;
  [key: string]: unknown;
}

export interface EvaluateSubmissionDependencies {
  allowedOrigins: readonly string[];
  verifyUser(token: string): Promise<VerifiedUser | null>;
  loadSubmission(submissionId: string): Promise<SubmissionEvaluationSource | null>;
  loadExistingEvaluation(input: {
    submissionId: string;
    rubricHash: string;
    promptVersion: string;
  }): Promise<StoredEvaluation | null>;
  claimEvaluation(input: {
    submissionId: string;
    rubricSchemaVersion: string;
    rubricHash: string;
    promptVersion: string;
    existingEvaluationId: string | null;
  }): Promise<{ id: string } | null>;
  generate(source: SubmissionEvaluationSource): Promise<EvaluationResult>;
  completeEvaluation(evaluationId: string, result: EvaluationResult): Promise<StoredEvaluation>;
  failEvaluation(evaluationId: string, code: EvaluationErrorCode): Promise<void>;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new EvaluationError('invalid_request', 'unparsable_body');
  }
}

export function createEvaluateSubmissionHandler(dependencies: EvaluateSubmissionDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const preflight = handlePreflight(request, dependencies.allowedOrigins);
    if (preflight) return preflight;
    const fail = (code: EvaluationErrorCode) =>
      jsonResponse(
        evaluationErrorBody(code),
        EVALUATION_ERROR_CATALOG[code].status,
        origin,
        dependencies.allowedOrigins,
      );
    if (request.method !== 'POST') return fail('method_not_allowed');

    let claimedId: string | null = null;
    let stage: 'auth' | 'data' | 'ai' | 'persist' = 'auth';
    try {
      const token = bearerToken(request);
      const user = token ? await dependencies.verifyUser(token) : null;
      if (!user) throw new EvaluationError('invalid_session', 'missing_or_invalid_token');
      if (user.appMetadata.role !== 'teacher') {
        throw new EvaluationError('forbidden', 'role_not_teacher');
      }

      const input = parseEvaluationRequest(await readBody(request));
      stage = 'data';
      const source = await dependencies.loadSubmission(input.submissionId);
      if (!source) throw new EvaluationError('submission_not_found', 'not_found');
      if (source.status !== 'submitted') {
        throw new EvaluationError('submission_not_submitted', 'status');
      }

      const existing = await dependencies.loadExistingEvaluation({
        submissionId: source.submissionId,
        rubricHash: source.rubricHash,
        promptVersion: EVALUATION_PROMPT_VERSION,
      });
      if (existing?.status === 'completed' || existing?.status === 'reviewed') {
        return jsonResponse(
          { ok: true, data: { evaluation: existing, reused: true } },
          200,
          origin,
          dependencies.allowedOrigins,
        );
      }
      if (existing?.status === 'running' || existing?.status === 'pending') {
        throw new EvaluationError('evaluation_in_progress', 'already_running');
      }
      if (existing?.status === 'failed' && !input.forceRetry) {
        throw new EvaluationError('invalid_request', 'force_retry_required');
      }

      const claim = await dependencies.claimEvaluation({
        submissionId: source.submissionId,
        rubricSchemaVersion: source.rubricSchemaVersion,
        rubricHash: source.rubricHash,
        promptVersion: EVALUATION_PROMPT_VERSION,
        existingEvaluationId: existing?.status === 'failed' ? existing.id : null,
      });
      if (!claim) throw new EvaluationError('evaluation_in_progress', 'claim_conflict');
      claimedId = claim.id;

      stage = 'ai';
      const generated = parseEvaluationResult(
        await dependencies.generate(source),
        source.questions,
      );
      const checked = markMissingEvidenceForReview(generated, source.questions, source.readingText);

      stage = 'persist';
      const stored = await dependencies.completeEvaluation(claimedId, checked);
      return jsonResponse(
        { ok: true, data: { evaluation: stored, reused: false } },
        200,
        origin,
        dependencies.allowedOrigins,
      );
    } catch (error) {
      let code: EvaluationErrorCode;
      if (error instanceof EvaluationError) code = error.code;
      else if (stage === 'persist' || stage === 'data') code = 'persist_failed';
      else code = 'provider_unavailable';

      if (claimedId && (stage === 'ai' || stage === 'persist')) {
        try {
          await dependencies.failEvaluation(claimedId, code);
        } catch {
          code = 'persist_failed';
        }
      }
      console.error('evaluate-submission failed', {
        code,
        detail: error instanceof EvaluationError ? error.detail : 'unexpected',
      });
      return fail(code);
    }
  };
}
