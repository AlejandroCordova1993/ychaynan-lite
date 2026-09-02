import { describe, expect, it, vi } from 'vitest';
import type { GenerationErrorCode } from '../../../supabase/functions/_shared/aiGeneration.ts';
import { AssessmentGenerationError, generateAssessmentDraft } from './assessmentGeneration';

const validProposal = {
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
};

const validInput = {
  readingText: 'Texto de lectura.',
  purpose: 'Diagnóstico.',
  questionCount: 1,
  focus: 'balanced' as const,
};

function clientWith(invoke: ReturnType<typeof vi.fn>) {
  return { functions: { invoke } } as never;
}

function okClient(data: unknown = validProposal) {
  const invoke = vi.fn().mockResolvedValue({ data: { ok: true, data }, error: null });
  return { client: clientWith(invoke), invoke };
}

/** Reproduce un `FunctionsHttpError` de supabase-js: el cuerpo viaja dentro de `context`. */
function httpErrorClient(status: number, body: unknown) {
  const invoke = vi.fn().mockResolvedValue({
    data: null,
    error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      name: 'FunctionsHttpError',
      context: new Response(JSON.stringify(body), { status }),
    }),
  });
  return { client: clientWith(invoke), invoke };
}

async function failureOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof AssessmentGenerationError) {
      return { code: error.code, message: error.message };
    }
    return { code: `inesperado:${String(error)}`, message: '' };
  }
  return { code: 'sin-error', message: '' };
}

describe('generateAssessmentDraft', () => {
  it('invoca la Edge Function con el contrato del asistente', async () => {
    const { client, invoke } = okClient();

    await expect(generateAssessmentDraft(client, validInput)).resolves.toMatchObject({
      title: 'Lectura propuesta',
    });

    expect(invoke).toHaveBeenCalledWith('generate-assessment-draft', {
      body: {
        readingText: 'Texto de lectura.',
        purpose: 'Diagnóstico.',
        questionCount: 1,
        focus: 'balanced',
      },
    });
  });

  it('detecta una lectura vacía en el navegador sin llamar a Supabase', async () => {
    const { client, invoke } = okClient();

    const fallo = await failureOf(() =>
      generateAssessmentDraft(client, { ...validInput, readingText: '   ' }),
    );

    expect(fallo.code).toBe('reading_empty');
    expect(fallo.message).toContain('lectura');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('acepta 30000 caracteres y rechaza 30001 antes de llamar a Supabase', async () => {
    const { client, invoke } = okClient();

    await expect(
      generateAssessmentDraft(client, { ...validInput, readingText: 'a'.repeat(30_000) }),
    ).resolves.toMatchObject({ title: 'Lectura propuesta' });
    expect(invoke).toHaveBeenCalledTimes(1);

    const fallo = await failureOf(() =>
      generateAssessmentDraft(client, { ...validInput, readingText: 'a'.repeat(30_001) }),
    );

    expect(fallo.code).toBe('reading_too_long');
    expect(fallo.message).toContain('30 000');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('interpreta el contrato estructurado de errores sin mostrar detalles privados', async () => {
    const casos: Array<[GenerationErrorCode, number]> = [
      ['invalid_session', 401],
      ['forbidden', 403],
      ['ai_not_configured', 503],
      ['ai_timeout', 504],
      ['invalid_ai_response', 502],
      ['provider_unavailable', 502],
    ];

    for (const [code, status] of casos) {
      const { client } = httpErrorClient(status, {
        ok: false,
        error: { code, message: 'mensaje del servidor' },
      });

      const fallo = await failureOf(() => generateAssessmentDraft(client, validInput));

      expect(fallo.code, code).toBe(code);
      expect(fallo.message, code).not.toBe('');
      expect(fallo.message.toLowerCase(), code).not.toContain('deepseek');
    }
  });

  it('no confía en cuerpos de error desconocidos y usa un mensaje genérico', async () => {
    const { client } = httpErrorClient(500, {
      error: 'DeepSeek internal detail sk-privada',
      stack: 'at provider.ts:1',
    });

    const fallo = await failureOf(() => generateAssessmentDraft(client, validInput));

    expect(fallo.code).toBe('provider_unavailable');
    expect(fallo.message).not.toContain('sk-privada');
    expect(fallo.message).not.toContain('DeepSeek');
  });

  it('convierte un fallo de red sin contrato en un error seguro', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error('network') });

    const fallo = await failureOf(() => generateAssessmentDraft(clientWith(invoke), validInput));

    expect(fallo.code).toBe('provider_unavailable');
    expect(fallo.message).not.toContain('network');
  });

  it('aplica la misma validación estricta que el servidor sobre la propuesta recibida', async () => {
    const conAlineacion = {
      ...validProposal,
      questions: [{ ...validProposal.questions[0], curriculumLinks: { 'LL.5.3.1': 'x' } }],
    };
    expect(
      (await failureOf(() => generateAssessmentDraft(okClient(conAlineacion).client, validInput)))
        .code,
    ).toBe('invalid_ai_response');

    const conCampoExtra = { ...validProposal, answerKey: 'respuesta filtrada' };
    expect(
      (await failureOf(() => generateAssessmentDraft(okClient(conCampoExtra).client, validInput)))
        .code,
    ).toBe('invalid_ai_response');

    const cantidadDistinta = {
      ...validProposal,
      questions: [validProposal.questions[0], { ...validProposal.questions[0], position: 2 }],
    };
    expect(
      (
        await failureOf(() =>
          generateAssessmentDraft(okClient(cantidadDistinta).client, validInput),
        )
      ).code,
    ).toBe('invalid_ai_response');
  });

  it('rechaza una respuesta sin el sobre esperado', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });

    expect(
      (await failureOf(() => generateAssessmentDraft(clientWith(invoke), validInput))).code,
    ).toBe('invalid_ai_response');
  });
});
