import { describe, expect, it } from 'vitest';
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
});
