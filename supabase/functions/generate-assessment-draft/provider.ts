import { normalizeGeneratedDraft } from './handler.ts';
import { buildAssessmentDraftMessages, type GenerateAssessmentInput } from './prompt.ts';

interface ProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>;
}

export async function generateAssessmentDraftWithProvider(
  input: GenerateAssessmentInput,
  config: ProviderConfig,
  fetchImpl: typeof fetch = fetch,
) {
  if (!config.apiKey) throw new Error('provider unavailable');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildAssessmentDraftMessages(input),
        temperature: 0.25,
        max_tokens: Math.min(4500, 900 * input.questionCount + 700),
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error('provider request failed');
    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('malformed response');
    return normalizeGeneratedDraft(JSON.parse(content) as unknown, input.questionCount);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('malformed response');
    if (error instanceof Error && error.name === 'AbortError') throw new Error('provider timeout');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
