import { describe, expect, it, vi } from 'vitest';
import { generateAssessmentDraft } from './assessmentGeneration';

describe('generateAssessmentDraft', () => {
  it('invoca la Edge Function con el contrato del asistente', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        data: {
          title: 'Lectura propuesta',
          purpose: 'Observar comprensión.',
          generalInstructions: 'Responde con evidencia.',
          questions: [
            {
              position: 1,
              prompt: '¿Qué idea desarrolla el texto?',
              instructions: '',
              suggestedMinWords: 30,
              suggestedMaxWords: 80,
              activeCriteria: ['core.comprension_explicita'],
              activeModules: [],
              curriculumLinks: {},
            },
          ],
        },
      },
      error: null,
    });
    const client = { functions: { invoke } } as never;

    await expect(
      generateAssessmentDraft(client, {
        readingText: 'Texto de lectura.',
        purpose: 'Diagnóstico.',
        questionCount: 1,
        focus: 'balanced',
      }),
    ).resolves.toMatchObject({ title: 'Lectura propuesta' });

    expect(invoke).toHaveBeenCalledWith('generate-assessment-draft', {
      body: {
        readingText: 'Texto de lectura.',
        purpose: 'Diagnóstico.',
        questionCount: 1,
        focus: 'balanced',
      },
    });
  });

  it('convierte un error de la función en un mensaje seguro', async () => {
    const client = {
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error('network') }) },
    } as never;

    await expect(
      generateAssessmentDraft(client, {
        readingText: 'Texto de lectura.',
        questionCount: 1,
        focus: 'balanced',
      }),
    ).rejects.toThrow('No pudimos generar una propuesta.');
  });
});
