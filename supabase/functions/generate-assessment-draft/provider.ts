import {
  GenerationError,
  parseGeneratedDraft,
  type GenerateAssessmentInput,
} from '../_shared/aiGeneration.ts';
import { buildAssessmentDraftMessages } from './prompt.ts';

interface ProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
}

const ENDPOINT = 'https://api.deepseek.com/chat/completions';

/** Una generación estructurada solo es utilizable si el modelo terminó por sí mismo. */
const COMPLETE_FINISH_REASON = 'stop';
/** El proveedor no pudo atender la solicitud; es un fallo temporal, no una propuesta inválida. */
const TEMPORARY_FINISH_REASON = 'insufficient_system_resource';

export async function generateAssessmentDraftWithProvider(
  input: GenerateAssessmentInput,
  config: ProviderConfig,
  fetchImpl: typeof fetch = fetch,
) {
  if (!config.apiKey) throw new GenerationError('ai_not_configured', 'missing_api_key');

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
        messages: buildAssessmentDraftMessages(input),
        // Thinking viene habilitado por defecto: se desactiva de forma explícita porque
        // esta generación es estructurada y con thinking activo temperature no tiene efecto.
        thinking: { type: 'disabled' },
        temperature: 0.25,
        max_tokens: Math.min(4500, 900 * input.questionCount + 700),
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    // El cuerpo de error del proveedor nunca se lee ni se registra: puede contener detalles privados.
    if (!response.ok) throw new GenerationError('provider_unavailable', 'http_status');

    // Un 200 con cuerpo vacío o con JSON externo malformado es una respuesta inválida de la
    // IA, no una indisponibilidad del proveedor: se clasifica como tal en lugar de caer en
    // el catch genérico, que lo trataría como fallo temporal y sugeriría reintentar.
    let payload: ChatResponse;
    try {
      payload = (await response.json()) as ChatResponse;
    } catch {
      throw new GenerationError('invalid_ai_response', 'unparsable_envelope');
    }

    const choice = payload.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (finishReason === TEMPORARY_FINISH_REASON) {
      throw new GenerationError('provider_unavailable', 'insufficient_system_resource');
    }
    if (finishReason !== COMPLETE_FINISH_REASON) {
      throw new GenerationError('invalid_ai_response', 'incomplete_generation');
    }

    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new GenerationError('invalid_ai_response', 'empty_content');
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(content);
    } catch {
      throw new GenerationError('invalid_ai_response', 'unparsable_content');
    }

    return parseGeneratedDraft(decoded, input.questionCount);
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new GenerationError('ai_timeout', 'aborted');
    }
    throw new GenerationError('provider_unavailable', 'request_failed');
  } finally {
    clearTimeout(timeout);
  }
}
