import {
  EvaluationError,
  parseEvaluationResult,
  type EvaluationResult,
} from '../_shared/aiEvaluation.ts';
import { buildEvaluationMessages, type EvaluationPromptInput } from './prompt.ts';

export interface EvaluationProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
}

const ENDPOINT = 'https://api.deepseek.com/chat/completions';

export async function evaluateSubmissionWithProvider(
  input: EvaluationPromptInput,
  config: EvaluationProviderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<EvaluationResult> {
  if (!config.apiKey) throw new EvaluationError('ai_not_configured', 'missing_api_key');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildEvaluationMessages(input),
        thinking: { type: 'disabled' },
        temperature: 0.15,
        max_tokens: Math.min(12_000, 3_000 + input.questions.length * 2_000),
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new EvaluationError('provider_unavailable', 'http_status');

    let envelope: unknown;
    try {
      envelope = await response.json();
    } catch {
      throw new EvaluationError('invalid_ai_response', 'unparsable_envelope');
    }
    if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
      throw new EvaluationError('invalid_ai_response', 'invalid_envelope');
    }
    const choice = (envelope as ChatResponse).choices?.[0];
    if (choice?.finish_reason === 'insufficient_system_resource') {
      throw new EvaluationError('provider_unavailable', 'insufficient_system_resource');
    }
    if (choice?.finish_reason !== 'stop') {
      throw new EvaluationError('invalid_ai_response', 'incomplete_evaluation');
    }
    const content = choice.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new EvaluationError('invalid_ai_response', 'empty_content');
    }
    let decoded: unknown;
    try {
      decoded = JSON.parse(content);
    } catch {
      throw new EvaluationError('invalid_ai_response', 'unparsable_content');
    }
    return parseEvaluationResult(decoded, input.questions);
  } catch (error) {
    if (error instanceof EvaluationError) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new EvaluationError('ai_timeout', 'aborted');
    }
    throw new EvaluationError('provider_unavailable', 'request_failed');
  } finally {
    clearTimeout(timeout);
  }
}
