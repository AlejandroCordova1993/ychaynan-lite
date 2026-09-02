import { describe, expect, it, vi } from 'vitest';
import { generateAssessmentDraftWithProvider } from './provider.ts';

const input = {
  readingText: 'Una lectura breve sobre el cuidado del agua.',
  purpose: 'Diagnóstico inicial.',
  questionCount: 1,
  focus: 'balanced' as const,
};

function response(content: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

describe('generateAssessmentDraftWithProvider', () => {
  it('envía una solicitud JSON al proveedor y normaliza su propuesta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response(
        JSON.stringify({
          title: 'Cuidar el agua',
          purpose: 'Observar comprensión.',
          generalInstructions: 'Responde con evidencia.',
          questions: [
            {
              position: 9,
              prompt: '¿Cuál es la idea principal?',
              instructions: '',
              suggestedMinWords: 25,
              suggestedMaxWords: 70,
              activeCriteria: ['core.comprension_explicita'],
              activeModules: [],
              curriculumLinks: {},
            },
          ],
        }),
      ),
    );

    await expect(
      generateAssessmentDraftWithProvider(
        input,
        {
          apiKey: 'secret-test',
          model: 'deepseek-chat',
          timeoutMs: 1_000,
        },
        fetchImpl,
      ),
    ).resolves.toMatchObject({
      title: 'Cuidar el agua',
      questions: [{ position: 1 }],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-test' }),
        body: expect.stringContaining('"response_format":{"type":"json_object"}'),
      }),
    );
  });

  it('rechaza una respuesta mal formada sin exponerla como propuesta válida', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response('{"questions":[]}'));

    await expect(
      generateAssessmentDraftWithProvider(
        input,
        {
          apiKey: 'secret-test',
          model: 'deepseek-chat',
          timeoutMs: 1_000,
        },
        fetchImpl,
      ),
    ).rejects.toThrow('malformed response');
  });
});
