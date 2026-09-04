import { describe, expect, it } from 'vitest';
import {
  EVALUATION_ERROR_CATALOG,
  EvaluationError,
  markMissingEvidenceForReview,
  parseEvaluationRequest,
  parseEvaluationResult,
  type EvaluationQuestion,
} from './aiEvaluation.ts';

const questions: EvaluationQuestion[] = [
  {
    position: 1,
    prompt: '¿Qué sostiene el texto?',
    instructions: 'Explica con tus palabras.',
    responseText: 'El texto sostiene que leer transforma la mirada.',
    wordCount: 9,
    activeCriteria: ['core.pertinencia', 'core.comprension_explicita'],
    activeModules: [],
  },
];

const validCriterion = {
  criterionId: 'core.pertinencia',
  level: 3,
  reason: 'Responde directamente a la consigna.',
  evidences: ['leer transforma la mirada'],
  confidence: 0.82,
  review: 'none',
};

const validResult = {
  questionResults: [
    {
      position: 1,
      criteria: [
        validCriterion,
        {
          ...validCriterion,
          criterionId: 'core.comprension_explicita',
          reason: 'Recupera la idea principal.',
        },
      ],
      modules: [],
      observations: [
        {
          code: 'PERT',
          fragment: 'leer transforma la mirada',
          explanation: 'La idea se vincula con la consigna.',
          severity: 'low',
        },
      ],
      strengths: ['Mantiene el foco.'],
      priorities: ['Añadir una evidencia más concreta.'],
    },
  ],
  dimensionSummaries: [
    {
      dimension: 'comprension_lectora',
      applicableCriteria: 1,
      scoredCriteria: 1,
      averageLevel: 3,
      confidence: 0.8,
      strengths: ['Comprende la idea explícita.'],
      priorities: ['Profundizar la explicación.'],
    },
    {
      dimension: 'respuesta_razonamiento',
      applicableCriteria: 1,
      scoredCriteria: 1,
      averageLevel: 3,
      confidence: 0.82,
      strengths: ['Responde a la tarea.'],
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
  globalConfidence: 0.81,
  limitations: ['La respuesta es breve.'],
};

function detailOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof EvaluationError ? error.detail : `unexpected:${String(error)}`;
  }
  return 'no-error';
}

describe('parseEvaluationRequest', () => {
  it('acepta solo el identificador de la entrega y forceRetry opcional', () => {
    expect(
      parseEvaluationRequest({ submissionId: '11111111-1111-4111-8111-111111111111' }),
    ).toEqual({
      submissionId: '11111111-1111-4111-8111-111111111111',
      forceRetry: false,
    });
    expect(
      parseEvaluationRequest({
        submissionId: '11111111-1111-4111-8111-111111111111',
        forceRetry: true,
      }).forceRetry,
    ).toBe(true);
  });

  it('rechaza cuerpos inválidos o identificadores no UUID', () => {
    expect(detailOf(() => parseEvaluationRequest(null))).toBe('body');
    expect(detailOf(() => parseEvaluationRequest({ submissionId: 'no-uuid' }))).toBe(
      'submission_id',
    );
    expect(
      detailOf(() =>
        parseEvaluationRequest({
          submissionId: '11111111-1111-4111-8111-111111111111',
          forceRetry: 'yes',
        }),
      ),
    ).toBe('force_retry');
  });
});

describe('parseEvaluationResult', () => {
  it('acepta una salida completa y conserva la estructura', () => {
    const result = parseEvaluationResult(validResult, questions);
    expect(result.questionResults[0].criteria).toHaveLength(2);
    expect(result.dimensionSummaries).toHaveLength(4);
  });

  it('rechaza criterios fuera de la pregunta y duplicados', () => {
    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            questionResults: [
              {
                ...validResult.questionResults[0],
                criteria: [
                  ...validResult.questionResults[0].criteria,
                  { ...validCriterion, criterionId: 'core.lectura_critica' },
                ],
              },
            ],
          },
          questions,
        ),
      ),
    ).toBe('criterion_not_allowed');

    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            questionResults: [
              {
                ...validResult.questionResults[0],
                criteria: [validCriterion, validCriterion],
              },
            ],
          },
          questions,
        ),
      ),
    ).toBe('criterion_duplicated');
  });

  it('rechaza niveles, observaciones y campos adicionales inválidos', () => {
    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            questionResults: [
              {
                ...validResult.questionResults[0],
                criteria: [{ ...validCriterion, level: 5 }],
              },
            ],
          },
          questions,
        ),
      ),
    ).toBe('level');
    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            questionResults: [
              {
                ...validResult.questionResults[0],
                observations: [
                  { ...validResult.questionResults[0].observations[0], code: 'INVENTADO' },
                ],
              },
            ],
          },
          questions,
        ),
      ),
    ).toBe('observation_code');
    expect(detailOf(() => parseEvaluationResult({ ...validResult, extra: true }, questions))).toBe(
      'unexpected_field',
    );
  });

  it('verifica las cuatro dimensiones y los límites de evidencia', () => {
    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            dimensionSummaries: validResult.dimensionSummaries.slice(1),
          },
          questions,
        ),
      ),
    ).toBe('dimensions');
    expect(
      detailOf(() =>
        parseEvaluationResult(
          {
            ...validResult,
            questionResults: [
              {
                ...validResult.questionResults[0],
                criteria: [
                  { ...validCriterion, evidences: ['a'.repeat(601)] },
                  {
                    ...validCriterion,
                    criterionId: 'core.comprension_explicita',
                  },
                ],
              },
            ],
          },
          questions,
        ),
      ),
    ).toBe('evidence_too_long');
  });
});

describe('markMissingEvidenceForReview', () => {
  it('marca solo el criterio cuya evidencia no existe en lectura ni respuesta', () => {
    const parsed = parseEvaluationResult(
      {
        ...validResult,
        questionResults: [
          {
            ...validResult.questionResults[0],
            criteria: [
              validCriterion,
              {
                ...validCriterion,
                criterionId: 'core.comprension_explicita',
                evidences: ['fragmento que nunca fue escrito'],
              },
            ],
          },
        ],
      },
      questions,
    );

    const checked = markMissingEvidenceForReview(parsed, questions, 'La lectura original.');

    expect(checked.questionResults[0].criteria[0].review).toBe('none');
    expect(checked.questionResults[0].criteria[1].review).toBe('needs_evidence_review');
    expect(checked.questionResults[0].criteria[1].evidences).toEqual([
      'fragmento que nunca fue escrito',
    ]);
  });

  it('acepta equivalencias de Unicode, espacios y comillas tipográficas', () => {
    const responseText = 'La autora escribió: “sí, aprender transforma”.';
    const localQuestions = [{ ...questions[0], responseText }];
    const parsed = parseEvaluationResult(
      {
        ...validResult,
        questionResults: [
          {
            ...validResult.questionResults[0],
            criteria: [
              { ...validCriterion, evidences: ['  "sí,   aprender transforma" '] },
              {
                ...validCriterion,
                criterionId: 'core.comprension_explicita',
                evidences: ['aprender transforma'],
              },
            ],
          },
        ],
      },
      localQuestions,
    );

    expect(
      markMissingEvidenceForReview(parsed, localQuestions, '').questionResults[0].criteria[0]
        .review,
    ).toBe('none');
  });
});

describe('EVALUATION_ERROR_CATALOG', () => {
  it('define mensajes seguros para cada código', () => {
    expect(EVALUATION_ERROR_CATALOG.invalid_session.status).toBe(401);
    expect(EVALUATION_ERROR_CATALOG.forbidden.status).toBe(403);
    for (const entry of Object.values(EVALUATION_ERROR_CATALOG)) {
      expect(entry.message).not.toContain('DeepSeek');
      expect(entry.message).not.toContain('Supabase');
    }
  });
});
