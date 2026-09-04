import { describe, expect, it, vi } from 'vitest';
import { EvaluationError, type EvaluationQuestion } from '../_shared/aiEvaluation.ts';
import { evaluateSubmissionWithProvider } from './provider.ts';

const questions: EvaluationQuestion[] = [
  {
    position: 1,
    prompt: '¿Cuál es la idea central?',
    instructions: '',
    responseText: 'La lectura explica que conversar ayuda a aprender.',
    wordCount: 8,
    activeCriteria: ['core.comprension_explicita'],
    activeModules: [],
  },
];

const input = {
  readingText: 'Conversar ayuda a las comunidades a aprender.',
  purpose: 'Observar comprensión.',
  generalInstructions: '',
  rubricSnapshot: { version: '1.1' },
  questions,
};

const validResult = {
  questionResults: [
    {
      position: 1,
      criteria: [
        {
          criterionId: 'core.comprension_explicita',
          level: 3,
          reason: 'Identifica la idea.',
          evidences: ['conversar ayuda a aprender'],
          confidence: 0.8,
          review: 'none',
        },
      ],
      modules: [],
      observations: [],
      strengths: ['Reconoce la idea central.'],
      priorities: [],
    },
  ],
  dimensionSummaries: [
    {
      dimension: 'comprension_lectora',
      applicableCriteria: 1,
      scoredCriteria: 1,
      averageLevel: 3,
      confidence: 0.8,
      strengths: ['Comprensión explícita.'],
      priorities: [],
    },
    {
      dimension: 'respuesta_razonamiento',
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    },
    {
      dimension: 'organizacion_discursiva',
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    },
    {
      dimension: 'convenciones_escritura',
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    },
  ],
  globalConfidence: 0.8,
  limitations: [],
};

function codeOf(error: unknown) {
  return error instanceof EvaluationError ? error.code : `unexpected:${String(error)}`;
}

describe('evaluateSubmissionWithProvider', () => {
  it('rechaza una configuración sin clave', async () => {
    await expect(
      evaluateSubmissionWithProvider(input, { apiKey: '', model: 'deepseek-chat', timeoutMs: 100 }),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'ai_not_configured');
  });

  it('devuelve y valida una evaluación completa', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validResult) } }],
        }),
        { status: 200 },
      ),
    );

    const result = await evaluateSubmissionWithProvider(
      input,
      { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 500 },
      fetchImpl,
    );

    expect(result.globalConfidence).toBe(0.8);
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(String((request.headers as Record<string, string>).Authorization)).toBe('Bearer secret');
    expect(String(request.body)).not.toContain('studentId');
  });

  it('clasifica HTTP, salida truncada y JSON interno inválido sin leer el cuerpo de error', async () => {
    const text = vi.fn().mockRejectedValue(new Error('no debe leerse'));
    const httpError = vi.fn().mockResolvedValue({ ok: false, status: 500, text });
    await expect(
      evaluateSubmissionWithProvider(
        input,
        { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 500 },
        httpError as unknown as typeof fetch,
      ),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'provider_unavailable');
    expect(text).not.toHaveBeenCalled();

    const truncated = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }),
          { status: 200 },
        ),
      );
    await expect(
      evaluateSubmissionWithProvider(
        input,
        { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 500 },
        truncated,
      ),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'invalid_ai_response');

    const malformed = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{roto' } }] }),
          { status: 200 },
        ),
      );
    await expect(
      evaluateSubmissionWithProvider(
        input,
        { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 500 },
        malformed,
      ),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'invalid_ai_response');
  });

  it('clasifica el timeout y el fallo de red', async () => {
    const timeoutFetch = vi.fn(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    await expect(
      evaluateSubmissionWithProvider(
        input,
        { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 5 },
        timeoutFetch as unknown as typeof fetch,
      ),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'ai_timeout');

    await expect(
      evaluateSubmissionWithProvider(
        input,
        { apiKey: 'secret', model: 'deepseek-chat', timeoutMs: 500 },
        vi.fn().mockRejectedValue(new Error('network secret')),
      ),
    ).rejects.toSatisfy((error: unknown) => codeOf(error) === 'provider_unavailable');
  });
});
