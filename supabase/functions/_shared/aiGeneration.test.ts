import { describe, expect, it } from 'vitest';
import {
  GENERATION_ERROR_CATALOG,
  GENERATION_LIMITS,
  GenerationError,
  parseGeneratedDraft,
  parseGenerationRequest,
} from './aiGeneration.ts';

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof GenerationError ? error.code : `inesperado:${String(error)}`;
  }
  return 'sin-error';
}

function detailOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof GenerationError ? error.detail : `inesperado:${String(error)}`;
  }
  return 'sin-error';
}

function validQuestion(position = 1) {
  return {
    position,
    prompt: `¿Qué sostiene el autor en el párrafo ${position}?`,
    instructions: 'Apóyate en el texto.',
    suggestedMinWords: 30,
    suggestedMaxWords: 90,
    activeCriteria: ['core.comprension_explicita'],
    activeModules: [],
    curriculumLinks: {},
  };
}

function validDraft(count = 1) {
  return {
    title: 'El agua y la comunidad',
    purpose: 'Observar comprensión y razonamiento escrito.',
    generalInstructions: 'Responde con tus propias palabras.',
    questions: Array.from({ length: count }, (_, index) => validQuestion(index + 1)),
  };
}

describe('parseGenerationRequest', () => {
  it('acepta una solicitud válida y aplica los valores por defecto', () => {
    expect(parseGenerationRequest({ readingText: '  Una lectura breve.  ' })).toEqual({
      readingText: 'Una lectura breve.',
      purpose: undefined,
      questionCount: 3,
      focus: 'balanced',
    });
  });

  it('rechaza una lectura vacía con un detalle estable', () => {
    expect(codeOf(() => parseGenerationRequest({ readingText: '   ' }))).toBe('invalid_request');
    expect(detailOf(() => parseGenerationRequest({ readingText: '   ' }))).toBe('reading_empty');
    expect(detailOf(() => parseGenerationRequest({}))).toBe('reading_empty');
  });

  it('acepta exactamente 30000 caracteres de lectura y rechaza 30001', () => {
    expect(GENERATION_LIMITS.readingMaxChars).toBe(30_000);

    const limite = 'a'.repeat(30_000);
    expect(parseGenerationRequest({ readingText: limite }).readingText).toHaveLength(30_000);

    expect(detailOf(() => parseGenerationRequest({ readingText: 'a'.repeat(30_001) }))).toBe(
      'reading_too_long',
    );
  });

  it('mide la lectura después de recortar los espacios de los extremos', () => {
    const conEspacios = `  ${'a'.repeat(30_000)}  `;
    expect(parseGenerationRequest({ readingText: conEspacios }).readingText).toHaveLength(30_000);
  });

  it('valida la cantidad de preguntas y el foco diagnóstico', () => {
    expect(detailOf(() => parseGenerationRequest({ readingText: 'ok', questionCount: 0 }))).toBe(
      'question_count',
    );
    expect(detailOf(() => parseGenerationRequest({ readingText: 'ok', questionCount: 5 }))).toBe(
      'question_count',
    );
    expect(detailOf(() => parseGenerationRequest({ readingText: 'ok', questionCount: 2.5 }))).toBe(
      'question_count',
    );
    expect(detailOf(() => parseGenerationRequest({ readingText: 'ok', questionCount: '3' }))).toBe(
      'question_count',
    );
    expect(detailOf(() => parseGenerationRequest({ readingText: 'ok', focus: 'otro' }))).toBe(
      'focus',
    );
    expect(parseGenerationRequest({ readingText: 'ok', questionCount: 4 }).questionCount).toBe(4);
  });

  it('valida el propósito docente', () => {
    expect(
      detailOf(() => parseGenerationRequest({ readingText: 'ok', purpose: 'a'.repeat(1_001) })),
    ).toBe('purpose_too_long');
    expect(parseGenerationRequest({ readingText: 'ok', purpose: '   ' }).purpose).toBeUndefined();
  });

  it('rechaza un cuerpo que no es un objeto', () => {
    expect(codeOf(() => parseGenerationRequest('texto'))).toBe('invalid_request');
    expect(codeOf(() => parseGenerationRequest(null))).toBe('invalid_request');
    expect(codeOf(() => parseGenerationRequest([{ readingText: 'ok' }]))).toBe('invalid_request');
  });
});

describe('parseGeneratedDraft', () => {
  it('acepta una propuesta válida y devuelve los textos recortados', () => {
    const parsed = parseGeneratedDraft(
      { ...validDraft(2), title: '  El agua y la comunidad  ' },
      2,
    );

    expect(parsed.title).toBe('El agua y la comunidad');
    expect(parsed.questions.map(({ position }) => position)).toEqual([1, 2]);
  });

  it('rechaza campos adicionales inesperados en la propuesta', () => {
    expect(codeOf(() => parseGeneratedDraft({ ...validDraft(), extra: 'x' }, 1))).toBe(
      'invalid_ai_response',
    );
    expect(detailOf(() => parseGeneratedDraft({ ...validDraft(), extra: 'x' }, 1))).toBe(
      'unexpected_field',
    );
  });

  it('rechaza campos adicionales inesperados dentro de una pregunta', () => {
    const draft = validDraft();
    const questions = [{ ...draft.questions[0], answerKey: 'respuesta filtrada' }];

    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions }, 1))).toBe(
      'unexpected_field',
    );
  });

  it('rechaza una propuesta con campos obligatorios ausentes', () => {
    const draft = validDraft();

    const sinInstrucciones: Record<string, unknown> = { ...draft.questions[0] };
    delete sinInstrucciones.instructions;
    expect(
      detailOf(() => parseGeneratedDraft({ ...draft, questions: [sinInstrucciones] }, 1)),
    ).toBe('missing_field');

    const sinGenerales: Record<string, unknown> = { ...draft };
    delete sinGenerales.generalInstructions;
    expect(detailOf(() => parseGeneratedDraft(sinGenerales, 1))).toBe('missing_field');
  });

  it('exige exactamente la cantidad de preguntas solicitada', () => {
    expect(detailOf(() => parseGeneratedDraft(validDraft(1), 2))).toBe('question_count');
    expect(detailOf(() => parseGeneratedDraft(validDraft(3), 2))).toBe('question_count');
    expect(detailOf(() => parseGeneratedDraft({ ...validDraft(1), questions: {} }, 1))).toBe(
      'question_count',
    );
  });

  it('exige posiciones consecutivas desde 1 y no las corrige en silencio', () => {
    const draft = validDraft(2);
    const desordenadas = [
      { ...draft.questions[0], position: 2 },
      { ...draft.questions[1], position: 1 },
    ];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: desordenadas }, 2))).toBe(
      'position',
    );

    const desplazadas = [
      { ...draft.questions[0], position: 9 },
      { ...draft.questions[1], position: 10 },
    ];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: desplazadas }, 2))).toBe(
      'position',
    );
  });

  it('rechaza criterios y módulos desconocidos en lugar de filtrarlos', () => {
    const draft = validDraft();
    const conCriterioInvalido = [
      { ...draft.questions[0], activeCriteria: ['core.comprension_explicita', 'core.inventado'] },
    ];
    expect(
      detailOf(() => parseGeneratedDraft({ ...draft, questions: conCriterioInvalido }, 1)),
    ).toBe('unknown_criterion');

    const conModuloInvalido = [{ ...draft.questions[0], activeModules: ['optional.inventado'] }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: conModuloInvalido }, 1))).toBe(
      'unknown_module',
    );
  });

  it('exige al menos un criterio por pregunta', () => {
    const draft = validDraft();
    const sinCriterios = [{ ...draft.questions[0], activeCriteria: [] }];

    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: sinCriterios }, 1))).toBe(
      'criteria_empty',
    );
  });

  it('rechaza criterios o módulos duplicados en lugar de normalizarlos', () => {
    const draft = validDraft();
    const criteriosRepetidos = [
      {
        ...draft.questions[0],
        activeCriteria: ['core.comprension_explicita', 'core.comprension_explicita'],
      },
    ];
    expect(
      detailOf(() => parseGeneratedDraft({ ...draft, questions: criteriosRepetidos }, 1)),
    ).toBe('duplicated_criterion');

    const modulosRepetidos = [
      {
        ...draft.questions[0],
        activeModules: ['optional.estructura_argumentativa', 'optional.estructura_argumentativa'],
      },
    ];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: modulosRepetidos }, 1))).toBe(
      'duplicated_module',
    );
  });

  it('exige que curriculumLinks sea un objeto vacío decidido por el docente', () => {
    const draft = validDraft();
    const conAlineacion = [
      { ...draft.questions[0], curriculumLinks: { 'LL.5.3.1': 'comprensión' } },
    ];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: conAlineacion }, 1))).toBe(
      'curriculum_links_not_empty',
    );

    const noObjeto = [{ ...draft.questions[0], curriculumLinks: [] }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: noObjeto }, 1))).toBe(
      'curriculum_links_not_empty',
    );
  });

  it('verifica mínimos, máximos y su relación', () => {
    const draft = validDraft();
    const invertidos = [{ ...draft.questions[0], suggestedMinWords: 120, suggestedMaxWords: 60 }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: invertidos }, 1))).toBe(
      'word_range',
    );

    const minimoNegativo = [{ ...draft.questions[0], suggestedMinWords: -1 }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: minimoNegativo }, 1))).toBe(
      'word_range',
    );

    const maximoCero = [{ ...draft.questions[0], suggestedMaxWords: 0 }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: maximoCero }, 1))).toBe(
      'word_range',
    );

    const noEntero = [{ ...draft.questions[0], suggestedMinWords: 12.5 }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: noEntero }, 1))).toBe(
      'word_range',
    );

    const nulos = [{ ...draft.questions[0], suggestedMinWords: null, suggestedMaxWords: null }];
    expect(parseGeneratedDraft({ ...draft, questions: nulos }, 1).questions[0]).toMatchObject({
      suggestedMinWords: null,
      suggestedMaxWords: null,
    });
  });

  it('rechaza textos vacíos, demasiado largos o de otro tipo', () => {
    const draft = validDraft();

    expect(detailOf(() => parseGeneratedDraft({ ...draft, title: '   ' }, 1))).toBe('text');
    expect(detailOf(() => parseGeneratedDraft({ ...draft, purpose: '' }, 1))).toBe('text');
    expect(detailOf(() => parseGeneratedDraft({ ...draft, title: 'a'.repeat(161) }, 1))).toBe(
      'text',
    );
    expect(
      detailOf(() => parseGeneratedDraft({ ...draft, generalInstructions: 'a'.repeat(6_001) }, 1)),
    ).toBe('text');

    const promptVacio = [{ ...draft.questions[0], prompt: ' ' }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: promptVacio }, 1))).toBe(
      'text',
    );

    const promptNoTexto = [{ ...draft.questions[0], prompt: 42 }];
    expect(detailOf(() => parseGeneratedDraft({ ...draft, questions: promptNoTexto }, 1))).toBe(
      'text',
    );
  });

  it('rechaza una propuesta que no es un objeto', () => {
    expect(codeOf(() => parseGeneratedDraft(null, 1))).toBe('invalid_ai_response');
    expect(codeOf(() => parseGeneratedDraft('{}', 1))).toBe('invalid_ai_response');
    expect(codeOf(() => parseGeneratedDraft([], 1))).toBe('invalid_ai_response');
  });
});

describe('GENERATION_ERROR_CATALOG', () => {
  it('define un estado HTTP y un mensaje seguro para cada código estable', () => {
    expect(Object.keys(GENERATION_ERROR_CATALOG).sort()).toEqual([
      'ai_not_configured',
      'ai_timeout',
      'forbidden',
      'invalid_ai_response',
      'invalid_request',
      'invalid_session',
      'method_not_allowed',
      'provider_unavailable',
    ]);

    for (const [code, entry] of Object.entries(GENERATION_ERROR_CATALOG)) {
      expect(entry.status, code).toBeGreaterThanOrEqual(400);
      expect(entry.message, code).not.toBe('');
      expect(entry.message.toLowerCase(), code).not.toContain('deepseek');
    }
  });
});
