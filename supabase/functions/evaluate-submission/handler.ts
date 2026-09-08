import {
  handlePreflight,
  jsonResponse,
  readJsonObject,
  RequestBodyError,
} from '../_shared/http.ts';
import { INPUT_LIMITS } from '../_shared/inputLimits.ts';
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
  requestedAt?: unknown;
  [key: string]: unknown;
}

export interface EvaluationClaim {
  id: string;
  leaseToken: string;
}

export const EVALUATION_LEASE_MS = 10 * 60 * 1_000;

export function isEvaluationLeaseExpired(evaluation: StoredEvaluation, now: number): boolean {
  if (typeof evaluation.requestedAt !== 'string') return false;
  const requestedAt = Date.parse(evaluation.requestedAt);
  return Number.isFinite(requestedAt) && now - requestedAt >= EVALUATION_LEASE_MS;
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
    existingEvaluationStatus: string | null;
  }): Promise<EvaluationClaim | null>;
  generate(source: SubmissionEvaluationSource): Promise<EvaluationResult>;
  completeEvaluation(claim: EvaluationClaim, result: EvaluationResult): Promise<StoredEvaluation>;
  failEvaluation(claim: EvaluationClaim, code: EvaluationErrorCode): Promise<void>;
  now(): number;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
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

    let claim: EvaluationClaim | null = null;
    let stage: 'auth' | 'data' | 'ai' | 'persist' = 'auth';
    try {
      const token = bearerToken(request);
      const user = token ? await dependencies.verifyUser(token) : null;
      if (!user) throw new EvaluationError('invalid_session', 'missing_or_invalid_token');
      if (user.appMetadata.role !== 'teacher') {
        throw new EvaluationError('forbidden', 'role_not_teacher');
      }

      const input = parseEvaluationRequest(
        await readJsonObject(request, {
          maxBytes: INPUT_LIMITS.edgeBodyBytes.evaluateSubmission,
          allowedFields: ['submissionId', 'forceRetry'],
        }),
      );
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
      const staleInProgress =
        (existing?.status === 'running' || existing?.status === 'pending') &&
        isEvaluationLeaseExpired(existing, dependencies.now());
      if (
        (existing?.status === 'running' || existing?.status === 'pending') &&
        (!input.forceRetry || !staleInProgress)
      ) {
        throw new EvaluationError('evaluation_in_progress', 'already_running');
      }
      if (existing?.status === 'failed' && !input.forceRetry) {
        throw new EvaluationError('invalid_request', 'force_retry_required');
      }

      claim = await dependencies.claimEvaluation({
        submissionId: source.submissionId,
        rubricSchemaVersion: source.rubricSchemaVersion,
        rubricHash: source.rubricHash,
        promptVersion: EVALUATION_PROMPT_VERSION,
        existingEvaluationId: existing?.status === 'failed' || staleInProgress ? existing.id : null,
        existingEvaluationStatus: existing?.status ?? null,
      });
      if (!claim) throw new EvaluationError('evaluation_in_progress', 'claim_conflict');

      stage = 'ai';
      const generated = parseEvaluationResult(
        await dependencies.generate(source),
        source.questions,
      );
      const checked = markMissingEvidenceForReview(generated, source.questions, source.readingText);

      stage = 'persist';
      const stored = await dependencies.completeEvaluation(claim, checked);
      return jsonResponse(
        { ok: true, data: { evaluation: stored, reused: false } },
        200,
        origin,
        dependencies.allowedOrigins,
      );
    } catch (error) {
      let code: EvaluationErrorCode;
      if (error instanceof EvaluationError) code = error.code;
      else if (error instanceof RequestBodyError)
        code = error.status === 413 ? 'request_too_large' : 'invalid_request';
      else if (stage === 'persist' || stage === 'data') code = 'persist_failed';
      else code = 'provider_unavailable';

      if (claim && (stage === 'ai' || stage === 'persist')) {
        try {
          await dependencies.failEvaluation(claim, code);
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
