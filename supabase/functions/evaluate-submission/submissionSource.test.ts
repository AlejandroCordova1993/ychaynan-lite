import { describe, expect, it } from 'vitest';
import { EvaluationError } from '../_shared/aiEvaluation.ts';
import { buildSubmissionEvaluationSource } from './submissionSource.ts';

const input = {
  submission: {
    id: '11111111-1111-4111-8111-111111111111',
    assessment_id: '22222222-2222-4222-8222-222222222222',
    status: 'submitted',
  },
  assessment: {
    id: '22222222-2222-4222-8222-222222222222',
    purpose: 'Observar comprensión.',
    reading_text: 'La lectura original.',
    general_instructions: 'Responde con tus palabras.',
    rubric_snapshot: { version: '1.1' },
    rubric_schema_version: '1.0',
    rubric_hash: 'rubric-hash',
  },
  questions: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      assessment_id: '22222222-2222-4222-8222-222222222222',
      position: 1,
      prompt: '¿Qué sostiene el texto?',
      instructions: '',
      suggested_min_words: 30,
      suggested_max_words: 80,
      active_criteria: ['core.pertinencia'],
      active_modules: [],
    },
  ],
  responses: [
    {
      question_id: '33333333-3333-4333-8333-333333333333',
      original_text: 'El texto sostiene una idea central.',
      word_count: 6,
    },
  ],
};

function detailOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error instanceof EvaluationError ? error.detail : `unexpected:${String(error)}`;
  }
  return 'no-error';
}

describe('buildSubmissionEvaluationSource', () => {
  it('une preguntas y respuestas sin incorporar identidad estudiantil', () => {
    const source = buildSubmissionEvaluationSource(input);
    expect(source.questions[0]).toMatchObject({
      position: 1,
      responseText: 'El texto sostiene una idea central.',
      activeCriteria: ['core.pertinencia'],
    });
    expect(source).not.toHaveProperty('studentId');
    expect(source).not.toHaveProperty('studentName');
    expect(JSON.stringify(source)).not.toContain('full_name');
  });

  it('rechaza preguntas sin respuesta, de otra evaluación o con texto excesivo', () => {
    expect(detailOf(() => buildSubmissionEvaluationSource({ ...input, responses: [] }))).toBe(
      'missing_response',
    );
    expect(
      detailOf(() =>
        buildSubmissionEvaluationSource({
          ...input,
          questions: [{ ...input.questions[0], assessment_id: 'otro' }],
        }),
      ),
    ).toBe('question_assessment');
    expect(
      detailOf(() =>
        buildSubmissionEvaluationSource({
          ...input,
          responses: [{ ...input.responses[0], original_text: 'a'.repeat(20_001) }],
        }),
      ),
    ).toBe('response_too_long');
  });

  it('rechaza criterios o módulos desconocidos y posiciones no consecutivas', () => {
    expect(
      detailOf(() =>
        buildSubmissionEvaluationSource({
          ...input,
          questions: [{ ...input.questions[0], active_criteria: ['core.inventado'] }],
        }),
      ),
    ).toBe('active_criteria');
    expect(
      detailOf(() =>
        buildSubmissionEvaluationSource({
          ...input,
          questions: [{ ...input.questions[0], position: 2 }],
        }),
      ),
    ).toBe('question_position');
  });
});
