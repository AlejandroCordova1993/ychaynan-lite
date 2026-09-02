import { describe, expect, it } from 'vitest';
import { mergeGeneratedDraft } from './assessmentGeneration';

describe('mergeGeneratedDraft', () => {
  it('aplica únicamente la propuesta y conserva lectura y condiciones actuales', () => {
    const merged = mergeGeneratedDraft(
      {
        readingText: 'Lectura original que nunca debe cambiar.',
        opensAt: null,
        closesAt: null,
        pastePolicy: 'discourage',
        curriculumVersion: 'BGU',
      },
      {
        title: 'Título generado',
        purpose: 'Propósito generado.',
        generalInstructions: 'Instrucciones generadas.',
        questions: [
          {
            position: 1,
            prompt: 'Pregunta generada',
            instructions: '',
            suggestedMinWords: 20,
            suggestedMaxWords: 60,
            activeCriteria: ['core.pertinencia'],
            activeModules: [],
            curriculumLinks: {},
          },
        ],
      },
    );

    expect(merged).toMatchObject({
      readingText: 'Lectura original que nunca debe cambiar.',
      opensAt: null,
      closesAt: null,
      pastePolicy: 'discourage',
      curriculumVersion: 'BGU',
      title: 'Título generado',
      questions: [{ prompt: 'Pregunta generada' }],
    });
  });
});
