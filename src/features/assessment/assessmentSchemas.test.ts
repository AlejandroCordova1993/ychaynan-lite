import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS } from '../../../supabase/functions/_shared/inputLimits';
import { assessmentDraftSchema, type AssessmentDraftInput } from './assessmentSchemas';

function question(position = 1) {
  return {
    position,
    prompt: '¿Qué sostiene el autor y con qué evidencia?',
    instructions: '',
    suggestedMinWords: 80,
    suggestedMaxWords: 180,
    activeCriteria: ['core.comprension_explicita'],
    activeModules: [],
    curriculumLinks: {},
  };
}

function draft(overrides: Partial<AssessmentDraftInput> = {}): AssessmentDraftInput {
  return {
    title: 'Diagnóstico inicial',
    purpose: 'Reconocer fortalezas y necesidades de lectura y escritura.',
    readingText: 'Una lectura suficientemente extensa para plantear la actividad.',
    generalInstructions: 'Responde con tus propias palabras.',
    opensAt: null,
    closesAt: null,
    pastePolicy: 'discourage',
    curriculumVersion: 'Bachillerato priorizado',
    questions: [question()],
    ...overrides,
  };
}

describe('assessmentDraftSchema', () => {
  it('acepta de una a cuatro preguntas y rechaza una quinta', () => {
    expect(assessmentDraftSchema.safeParse(draft()).success).toBe(true);
    expect(
      assessmentDraftSchema.safeParse(
        draft({ questions: Array.from({ length: 4 }, (_, index) => question(index + 1)) }),
      ).success,
    ).toBe(true);
    expect(
      assessmentDraftSchema.safeParse(
        draft({ questions: Array.from({ length: 5 }, (_, index) => question(index + 1)) }),
      ).success,
    ).toBe(false);
  });

  it('rechaza posiciones no consecutivas', () => {
    const result = assessmentDraftSchema.safeParse(
      draft({ questions: [question(1), question(3)] }),
    );

    expect(result.success).toBe(false);
  });

  it('rechaza criterios y módulos que no existen en la rúbrica operativa', () => {
    const unknownCriterion = assessmentDraftSchema.safeParse(
      draft({ questions: [{ ...question(), activeCriteria: ['core.inventado'] }] }),
    );
    const unknownModule = assessmentDraftSchema.safeParse(
      draft({ questions: [{ ...question(), activeModules: ['optional.inventado'] }] }),
    );

    expect(unknownCriterion.success).toBe(false);
    expect(unknownModule.success).toBe(false);
  });

  it('rechaza un rango de palabras invertido', () => {
    const result = assessmentDraftSchema.safeParse(
      draft({
        questions: [{ ...question(), suggestedMinWords: 200, suggestedMaxWords: 100 }],
      }),
    );

    expect(result.success).toBe(false);
  });

  it('rechaza una ventana cuyo cierre no sea posterior a la apertura', () => {
    const result = assessmentDraftSchema.safeParse(
      draft({ opensAt: '2026-09-01T15:00:00.000Z', closesAt: '2026-09-01T14:00:00.000Z' }),
    );

    expect(result.success).toBe(false);
  });

  it('acepta 1 y 4 preguntas, y rechaza 0 preguntas', () => {
    expect(assessmentDraftSchema.safeParse(draft({ questions: [question(1)] })).success).toBe(true);
    expect(
      assessmentDraftSchema.safeParse(
        draft({ questions: Array.from({ length: 4 }, (_, index) => question(index + 1)) }),
      ).success,
    ).toBe(true);
    expect(assessmentDraftSchema.safeParse(draft({ questions: [] })).success).toBe(false);
  });

  const CAMPOS_EVALUACION: Array<{
    nombre: string;
    maximo: number;
    construir: (valor: string) => AssessmentDraftInput;
  }> = [
    {
      nombre: 'título',
      maximo: INPUT_LIMITS.assessment.titleChars,
      construir: (valor) => draft({ title: valor }),
    },
    {
      nombre: 'propósito',
      maximo: INPUT_LIMITS.assessment.purposeChars,
      construir: (valor) => draft({ purpose: valor }),
    },
    {
      nombre: 'lectura',
      maximo: INPUT_LIMITS.assessment.readingChars,
      construir: (valor) => draft({ readingText: valor }),
    },
    {
      nombre: 'instrucciones generales',
      maximo: INPUT_LIMITS.assessment.generalInstructionsChars,
      construir: (valor) => draft({ generalInstructions: valor }),
    },
    {
      nombre: 'versión curricular',
      maximo: INPUT_LIMITS.assessment.curriculumVersionChars,
      construir: (valor) => draft({ curriculumVersion: valor }),
    },
    {
      nombre: 'consigna de la pregunta',
      maximo: INPUT_LIMITS.assessment.promptChars,
      construir: (valor) => draft({ questions: [{ ...question(), prompt: valor }] }),
    },
    {
      nombre: 'instrucciones de la pregunta',
      maximo: INPUT_LIMITS.assessment.questionInstructionsChars,
      construir: (valor) => draft({ questions: [{ ...question(), instructions: valor }] }),
    },
  ];

  describe.each(CAMPOS_EVALUACION)('límite de longitud: $nombre', ({ maximo, construir }) => {
    it(`acepta exactamente ${maximo} caracteres`, () => {
      const result = assessmentDraftSchema.safeParse(construir('a'.repeat(maximo)));
      expect(result.success).toBe(true);
    });

    it(`rechaza ${maximo + 1} caracteres`, () => {
      const result = assessmentDraftSchema.safeParse(construir('a'.repeat(maximo + 1)));
      expect(result.success).toBe(false);
    });
  });

  it('cuenta el título en puntos de código Unicode y no en unidades UTF-16 (un emoji cuenta como uno)', () => {
    // '😀' ocupa dos unidades UTF-16 (par sustituto) pero es un solo punto de código,
    // igual que pg_catalog.char_length en Postgres. String.prototype.length lo contaría
    // como 320 y rechazaría de más un título de exactamente 160 caracteres reales.
    const tituloConEmojis = '😀'.repeat(INPUT_LIMITS.assessment.titleChars);
    const result = assessmentDraftSchema.safeParse(draft({ title: tituloConEmojis }));
    expect(result.success).toBe(true);
  });
});
