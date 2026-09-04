import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { EvaluationQuestion } from '../../../supabase/functions/_shared/aiEvaluation';
import {
  getSubmissionEvaluation,
  requestSubmissionEvaluation,
  SubmissionEvaluationApiError,
} from './evaluations';

const questions: EvaluationQuestion[] = [
  {
    position: 1,
    prompt: 'Pregunta',
    instructions: '',
    responseText: 'Respuesta con evidencia.',
    wordCount: 3,
    activeCriteria: ['core.pertinencia'],
    activeModules: [],
  },
];

const result = {
  questionResults: [
    {
      position: 1,
      criteria: [
        {
          criterionId: 'core.pertinencia',
          level: 3,
          reason: 'Es pertinente.',
          evidences: ['Respuesta con evidencia'],
          confidence: 0.8,
          review: 'none',
        },
      ],
      modules: [],
      observations: [],
      strengths: ['Mantiene el foco.'],
      priorities: [],
    },
  ],
  dimensionSummaries: [
    {
      dimension: 'comprension_lectora',
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    },
    {
      dimension: 'respuesta_razonamiento',
      applicableCriteria: 1,
      scoredCriteria: 1,
      averageLevel: 3,
      confidence: 0.8,
      strengths: ['Pertinencia.'],
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

function clientWithRow(row: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  const invoke = vi.fn().mockResolvedValue({
    data: { ok: true, data: { reused: false } },
    error: null,
  });
  return {
    client: {
      from: vi.fn().mockReturnValue(query),
      functions: { invoke },
    } as unknown as SupabaseClient,
    query,
    invoke,
  };
}

describe('getSubmissionEvaluation', () => {
  it('lee y valida el resultado provisional almacenado', async () => {
    const { client, query } = clientWithRow({
      id: 'evaluation-id',
      status: 'completed',
      result_json: result,
      confidence: 0.8,
      requested_at: '2026-09-03T10:00:00Z',
      completed_at: '2026-09-03T10:01:00Z',
      error_code: null,
      error_message_safe: null,
      teacher_adjustments: null,
      teacher_note: null,
    });

    const evaluation = await getSubmissionEvaluation(client, 'submission-id', questions);

    expect(evaluation?.status).toBe('completed');
    expect(evaluation?.result?.globalConfidence).toBe(0.8);
    expect(query.eq).toHaveBeenCalledWith('submission_id', 'submission-id');
  });

  it('devuelve null cuando todavía no existe evaluación', async () => {
    const { client } = clientWithRow(null);
    await expect(getSubmissionEvaluation(client, 'submission-id', questions)).resolves.toBeNull();
  });
});

describe('requestSubmissionEvaluation', () => {
  it('invoca la función con forceRetry explícito', async () => {
    const { client, invoke } = clientWithRow(null);
    await requestSubmissionEvaluation(client, 'submission-id', true);
    expect(invoke).toHaveBeenCalledWith('evaluate-submission', {
      body: { submissionId: 'submission-id', forceRetry: true },
    });
  });

  it('traduce el contrato de error sin mostrar detalles técnicos', async () => {
    const { client, invoke } = clientWithRow(null);
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: async () => ({
            ok: false,
            error: { code: 'ai_timeout', message: 'texto no confiable' },
          }),
        },
      },
    });

    await expect(requestSubmissionEvaluation(client, 'submission-id')).rejects.toEqual(
      expect.objectContaining<Partial<SubmissionEvaluationApiError>>({ code: 'ai_timeout' }),
    );
    await requestSubmissionEvaluation(client, 'submission-id').catch((error: unknown) => {
      expect(String(error)).not.toContain('texto no confiable');
    });
  });
});
