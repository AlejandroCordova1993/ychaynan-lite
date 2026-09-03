import { describe, expect, it, vi } from 'vitest';
import { GenerationError } from '../_shared/aiGeneration.ts';
import { DEFAULT_DEEPSEEK_MODEL } from './config.ts';
import { generateAssessmentDraftWithProvider } from './provider.ts';

const input = {
  readingText: 'Una lectura breve sobre el cuidado del agua.',
  purpose: 'Diagnóstico inicial.',
  questionCount: 1,
  focus: 'balanced' as const,
};

const config = {
  apiKey: 'secret-test',
  model: DEFAULT_DEEPSEEK_MODEL,
  timeoutMs: 1_000,
};

const validProposal = {
  title: 'Cuidar el agua',
  purpose: 'Observar comprensión.',
  generalInstructions: 'Responde con evidencia.',
  questions: [
    {
      position: 1,
      prompt: '¿Cuál es la idea principal?',
      instructions: '',
      suggestedMinWords: 25,
      suggestedMaxWords: 70,
      activeCriteria: ['core.comprension_explicita'],
      activeModules: [],
      curriculumLinks: {},
    },
  ],
};

const PROVIDER_SECRET_BODY = 'DeepSeek internal detail: invalid api key sk-secreta';

/** `finishReason: null` reproduce una respuesta en la que el proveedor omite el campo. */
function chatResponse({
  content = JSON.stringify(validProposal),
  finishReason = 'stop' as string | null,
  ok = true,
  status = 200,
}: {
  content?: unknown;
  finishReason?: string | null;
  ok?: boolean;
  status?: number;
} = {}) {
  const choice: Record<string, unknown> = { message: { content } };
  if (finishReason !== null) choice.finish_reason = finishReason;

  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue({ choices: [choice] }),
    text: vi.fn().mockResolvedValue(PROVIDER_SECRET_BODY),
  } as unknown as Response;
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return error instanceof GenerationError ? error.code : `inesperado:${String(error)}`;
  }
  return 'sin-error';
}

function requestBody(fetchImpl: ReturnType<typeof vi.fn>) {
  return JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string) as Record<
    string,
    unknown
  >;
}

describe('generateAssessmentDraftWithProvider', () => {
  it('llama al modelo vigente con thinking desactivado y JSON estricto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse());

    await expect(
      generateAssessmentDraftWithProvider(input, config, fetchImpl),
    ).resolves.toMatchObject({ title: 'Cuidar el agua', questions: [{ position: 1 }] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-test' }),
      }),
    );

    const body = requestBody(fetchImpl);
    expect(body.model).toBe('deepseek-v4-flash');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.response_format).toEqual({ type: 'json_object' });
    // La temperatura solo tiene efecto con thinking desactivado.
    expect(body.temperature).toBeLessThanOrEqual(0.3);
    expect(body.max_tokens).toBeGreaterThan(0);
  });

  it('conserva DEEPSEEK_MODEL como anulación opcional', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse());

    await generateAssessmentDraftWithProvider(
      input,
      { ...config, model: 'deepseek-v4-pro' },
      fetchImpl,
    );

    expect(requestBody(fetchImpl).model).toBe('deepseek-v4-pro');
  });

  it('acepta únicamente una terminación completa', async () => {
    const truncada = vi.fn().mockResolvedValue(chatResponse({ finishReason: 'length' }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, truncada))).toBe(
      'invalid_ai_response',
    );

    const ausente = vi.fn().mockResolvedValue(chatResponse({ finishReason: null }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, ausente))).toBe(
      'invalid_ai_response',
    );

    const filtrada = vi.fn().mockResolvedValue(chatResponse({ finishReason: 'content_filter' }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, filtrada))).toBe(
      'invalid_ai_response',
    );
  });

  it('trata la falta de recursos del proveedor como un fallo temporal', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(chatResponse({ finishReason: 'insufficient_system_resource' }));

    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, fetchImpl))).toBe(
      'provider_unavailable',
    );
  });

  it('rechaza contenido vacío, inválido o incompleto', async () => {
    const vacio = vi.fn().mockResolvedValue(chatResponse({ content: '   ' }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, vacio))).toBe(
      'invalid_ai_response',
    );

    const noTexto = vi.fn().mockResolvedValue(chatResponse({ content: null }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, noTexto))).toBe(
      'invalid_ai_response',
    );

    const jsonRoto = vi.fn().mockResolvedValue(chatResponse({ content: '{"title": "sin cerrar"' }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, jsonRoto))).toBe(
      'invalid_ai_response',
    );

    const incompleta = vi.fn().mockResolvedValue(chatResponse({ content: '{"questions":[]}' }));
    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, incompleta))).toBe(
      'invalid_ai_response',
    );
  });

  it('no lee ni expone el cuerpo de error del proveedor', async () => {
    const respuesta = chatResponse({ ok: false, status: 401 });
    const fetchImpl = vi.fn().mockResolvedValue(respuesta);

    let mensaje = '';
    try {
      await generateAssessmentDraftWithProvider(input, config, fetchImpl);
    } catch (error) {
      mensaje = error instanceof Error ? error.message : String(error);
      expect(error).toBeInstanceOf(GenerationError);
      expect((error as GenerationError).code).toBe('provider_unavailable');
    }

    expect(mensaje).not.toContain('sk-secreta');
    expect(respuesta.text).not.toHaveBeenCalled();
    expect(respuesta.json).not.toHaveBeenCalled();
  });

  it('convierte una cancelación por tiempo en el código de timeout', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const abort = new Error('The signal has been aborted');
      abort.name = 'AbortError';
      return Promise.reject(abort);
    });

    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, fetchImpl))).toBe(
      'ai_timeout',
    );
  });

  it('convierte un fallo de red en un fallo temporal del proveedor', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('network unreachable'));

    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, fetchImpl))).toBe(
      'provider_unavailable',
    );
  });

  it('rechaza una configuración sin clave sin intentar una solicitud externa', async () => {
    const fetchImpl = vi.fn();

    expect(
      await codeOf(() =>
        generateAssessmentDraftWithProvider(input, { ...config, apiKey: '' }, fetchImpl),
      ),
    ).toBe('ai_not_configured');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('clasifica un 200 con envelope ilegible como propuesta inválida, no como caída', async () => {
    const cuerpoVacio = chatResponse();
    (cuerpoVacio.json as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SyntaxError('Unexpected end of JSON input'),
    );
    expect(
      await codeOf(() =>
        generateAssessmentDraftWithProvider(input, config, vi.fn().mockResolvedValue(cuerpoVacio)),
      ),
    ).toBe('invalid_ai_response');

    const envelopeRoto = chatResponse();
    (envelopeRoto.json as ReturnType<typeof vi.fn>).mockRejectedValue(
      new SyntaxError('Unexpected token < in JSON at position 0'),
    );
    expect(
      await codeOf(() =>
        generateAssessmentDraftWithProvider(input, config, vi.fn().mockResolvedValue(envelopeRoto)),
      ),
    ).toBe('invalid_ai_response');
  });

  it('clasifica un envelope válido con contenido interno inválido como propuesta inválida', async () => {
    const envelopeValido = chatResponse({
      content: JSON.stringify({ ...validProposal, curriculumLinks: { 'LL.5.3.1': 'x' } }),
    });

    expect(
      await codeOf(() =>
        generateAssessmentDraftWithProvider(
          input,
          config,
          vi.fn().mockResolvedValue(envelopeValido),
        ),
      ),
    ).toBe('invalid_ai_response');
  });

  it('conserva provider_unavailable para una caída real de red', async () => {
    const caida = vi.fn().mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));

    expect(await codeOf(() => generateAssessmentDraftWithProvider(input, config, caida))).toBe(
      'provider_unavailable',
    );
  });
});
