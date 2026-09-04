import { describe, expect, it, vi } from 'vitest';
import {
  EVALUATION_ERROR_CATALOG,
  EvaluationError,
  type EvaluationResult,
} from '../_shared/aiEvaluation.ts';
import { createEvaluateSubmissionHandler } from './handler.ts';

const submissionId = '11111111-1111-4111-8111-111111111111';
const source = {
  submissionId,
  status: 'submitted' as const,
  readingText: 'La lectura original.',
  purpose: 'Observar comprensión.',
  generalInstructions: '',
  rubricSnapshot: { version: '1.1' },
  rubricSchemaVersion: '1.0',
  rubricHash: 'rubric-hash',
  questions: [
    {
      position: 1,
      prompt: '¿Qué sostiene el texto?',
      instructions: '',
      responseText: 'La lectura original presenta una idea.',
      wordCount: 7,
      activeCriteria: ['core.pertinencia'],
      activeModules: [],
    },
  ],
};
const result: EvaluationResult = {
  questionResults: [
    {
      position: 1,
      criteria: [
        {
          criterionId: 'core.pertinencia',
          level: 3,
          reason: 'Responde a la consigna.',
          evidences: ['La lectura original'],
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

function request(body: unknown, token: string | null = 'jwt', method = 'POST') {
  const headers: Record<string, string> = {
    Origin: 'http://localhost:5173',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('https://edge.example/evaluate-submission', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

function dependencies(role: string | null = 'teacher') {
  return {
    allowedOrigins: ['http://localhost:5173'],
    verifyUser: vi
      .fn()
      .mockResolvedValue(role ? { id: 'teacher-id', appMetadata: { role } } : null),
    loadSubmission: vi.fn().mockResolvedValue(source),
    loadExistingEvaluation: vi.fn().mockResolvedValue(null),
    claimEvaluation: vi.fn().mockResolvedValue({ id: 'evaluation-id' }),
    generate: vi.fn().mockResolvedValue(result),
    completeEvaluation: vi.fn().mockImplementation(async (_id, checked) => ({
      id: 'evaluation-id',
      status: 'completed',
      result: checked,
      confidence: checked.globalConfidence,
    })),
    failEvaluation: vi.fn().mockResolvedValue(undefined),
  };
}

async function payload(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe('evaluate-submission handler', () => {
  it('responde preflight y rechaza métodos no permitidos', async () => {
    const handler = createEvaluateSubmissionHandler(dependencies());
    expect((await handler(request(null, null, 'OPTIONS'))).status).toBe(204);
    const response = await handler(request(null, 'jwt', 'GET'));
    expect(response.status).toBe(405);
  });

  it('exige JWT y rol teacher antes de cargar la entrega', async () => {
    const noSession = dependencies(null);
    const noSessionResponse = await createEvaluateSubmissionHandler(noSession)(
      request({ submissionId }, 'invalid'),
    );
    expect(noSessionResponse.status).toBe(401);
    expect(noSession.loadSubmission).not.toHaveBeenCalled();

    const forbidden = dependencies('student');
    const forbiddenResponse = await createEvaluateSubmissionHandler(forbidden)(
      request({ submissionId }),
    );
    expect(forbiddenResponse.status).toBe(403);
    expect(forbidden.loadSubmission).not.toHaveBeenCalled();
  });

  it('rechaza un cuerpo inválido y una entrega todavía editable', async () => {
    const invalid = await createEvaluateSubmissionHandler(dependencies())(
      request({ submissionId: 'bad' }),
    );
    expect(invalid.status).toBe(400);

    const deps = dependencies();
    deps.loadSubmission.mockResolvedValue({ ...source, status: 'in_progress' });
    const editable = await createEvaluateSubmissionHandler(deps)(request({ submissionId }));
    expect(editable.status).toBe(409);
    expect((await payload(editable)).error).toEqual(
      EVALUATION_ERROR_CATALOG.submission_not_submitted.message
        ? {
            code: 'submission_not_submitted',
            message: EVALUATION_ERROR_CATALOG.submission_not_submitted.message,
          }
        : null,
    );
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('reutiliza una evaluación completa y no vuelve a llamar a la IA', async () => {
    const deps = dependencies();
    deps.loadExistingEvaluation.mockResolvedValue({
      id: 'evaluation-id',
      status: 'completed',
      result,
      confidence: 0.8,
    });
    const response = await createEvaluateSubmissionHandler(deps)(request({ submissionId }));
    expect(response.status).toBe(200);
    expect(await payload(response)).toMatchObject({ ok: true, data: { reused: true } });
    expect(deps.claimEvaluation).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('evita ejecuciones concurrentes y exige forceRetry para un fallo previo', async () => {
    const running = dependencies();
    running.loadExistingEvaluation.mockResolvedValue({ id: 'eval', status: 'running' });
    expect(
      await createEvaluateSubmissionHandler(running)(request({ submissionId })),
    ).toHaveProperty('status', 409);

    const failed = dependencies();
    failed.loadExistingEvaluation.mockResolvedValue({ id: 'eval', status: 'failed' });
    expect(await createEvaluateSubmissionHandler(failed)(request({ submissionId }))).toHaveProperty(
      'status',
      400,
    );
    expect(failed.claimEvaluation).not.toHaveBeenCalled();

    const retried = await createEvaluateSubmissionHandler(failed)(
      request({ submissionId, forceRetry: true }),
    );
    expect(retried.status).toBe(200);
    expect(failed.claimEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ existingEvaluationId: 'eval' }),
    );
  });

  it('reclama, evalúa, valida evidencia y persiste el resultado', async () => {
    const deps = dependencies();
    deps.generate.mockResolvedValue({
      ...result,
      questionResults: [
        {
          ...result.questionResults[0],
          criteria: [
            {
              ...result.questionResults[0].criteria[0],
              evidences: ['fragmento inexistente'],
            },
          ],
        },
      ],
    });
    const response = await createEvaluateSubmissionHandler(deps)(request({ submissionId }));
    expect(response.status).toBe(200);
    expect(deps.completeEvaluation).toHaveBeenCalledWith(
      'evaluation-id',
      expect.objectContaining({
        questionResults: [
          expect.objectContaining({
            criteria: [expect.objectContaining({ review: 'needs_evidence_review' })],
          }),
        ],
      }),
    );
  });

  it('registra un fallo seguro del proveedor sin filtrar detalles', async () => {
    const deps = dependencies();
    deps.generate.mockRejectedValue(new EvaluationError('provider_unavailable', 'secret-detail'));
    const response = await createEvaluateSubmissionHandler(deps)(request({ submissionId }));
    const body = JSON.stringify(await payload(response));
    expect(response.status).toBe(502);
    expect(deps.failEvaluation).toHaveBeenCalledWith('evaluation-id', 'provider_unavailable');
    expect(body).not.toContain('secret-detail');
  });
});
