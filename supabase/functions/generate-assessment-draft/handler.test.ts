import { describe, expect, it, vi } from 'vitest';
import {
  GENERATION_ERROR_CATALOG,
  GenerationError,
  type GenerationErrorCode,
} from '../_shared/aiGeneration.ts';
import { createGenerateAssessmentDraftHandler } from './handler.ts';

const validProposal = {
  title: 'El agua y la comunidad',
  purpose: 'Observar comprensión y razonamiento escrito.',
  generalInstructions: 'Responde con tus propias palabras y apóyate en la lectura.',
  questions: [
    {
      position: 1,
      prompt: '¿Cuál es la idea central de la lectura?',
      instructions: 'Explica tu respuesta con información del texto.',
      suggestedMinWords: 35,
      suggestedMaxWords: 80,
      activeCriteria: ['core.comprension_explicita'],
      activeModules: [],
      curriculumLinks: {},
    },
  ],
};

function request(body: unknown, token: string | null = 'jwt-docente', method = 'POST') {
  const headers: Record<string, string> = {
    Origin: 'http://localhost:5173',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Request('https://edge.example/generate-assessment-draft', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

function dependencies(role: string | null = 'teacher') {
  return {
    allowedOrigins: ['http://localhost:5173'],
    verifyUser: vi.fn().mockResolvedValue(role ? { id: 'teacher-1', appMetadata: { role } } : null),
    generate: vi.fn().mockResolvedValue(validProposal),
  };
}

async function errorPayload(response: Response) {
  return (await response.json()) as { ok: false; error: { code: string; message: string } };
}

function expectContract(
  payload: { ok: false; error: { code: string; message: string } },
  code: GenerationErrorCode,
) {
  expect(payload).toEqual({
    ok: false,
    error: { code, message: GENERATION_ERROR_CATALOG[code].message },
  });
}

describe('generate-assessment-draft', () => {
  it('responde el preflight sin exigir sesión', async () => {
    const handler = createGenerateAssessmentDraftHandler(dependencies());

    const response = await handler(request(null, null, 'OPTIONS'));

    expect(response.status).toBe(204);
  });

  it('rechaza un método distinto de POST con el contrato estructurado', async () => {
    const handler = createGenerateAssessmentDraftHandler(dependencies());

    const response = await handler(request(null, 'jwt-docente', 'GET'));

    expect(response.status).toBe(405);
    expectContract(await errorPayload(response), 'method_not_allowed');
  });

  it('rechaza una petición sin JWT docente válido', async () => {
    const deps = dependencies(null);
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }, 'inválido'));

    expect(response.status).toBe(401);
    expectContract(await errorPayload(response), 'invalid_session');
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta autenticada sin rol teacher', async () => {
    const deps = dependencies('student');
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }));

    expect(response.status).toBe(403);
    expectContract(await errorPayload(response), 'forbidden');
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('valida la solicitud antes de llamar al proveedor', async () => {
    const deps = dependencies();
    const handler = createGenerateAssessmentDraftHandler(deps);

    for (const body of [
      { readingText: '   ' },
      { readingText: 'ok', questionCount: 8 },
      { readingText: 'ok', focus: 'inexistente' },
      { readingText: 'ok', purpose: 'a'.repeat(1_001) },
    ]) {
      const response = await handler(request(body));
      expect(response.status, JSON.stringify(body)).toBe(400);
      expectContract(await errorPayload(response), 'invalid_request');
    }

    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('admite exactamente 30000 caracteres de lectura y rechaza 30001', async () => {
    const deps = dependencies();
    const handler = createGenerateAssessmentDraftHandler(deps);

    const limite = await handler(request({ readingText: 'a'.repeat(30_000), questionCount: 1 }));
    expect(limite.status).toBe(200);
    expect(deps.generate).toHaveBeenCalledTimes(1);

    const excedido = await handler(request({ readingText: 'a'.repeat(30_001), questionCount: 1 }));
    expect(excedido.status).toBe(400);
    expectContract(await errorPayload(excedido), 'invalid_request');
    expect(deps.generate).toHaveBeenCalledTimes(1);
  });

  it('rechaza un cuerpo que no es JSON', async () => {
    const handler = createGenerateAssessmentDraftHandler(dependencies());
    const roto = new Request('https://edge.example/generate-assessment-draft', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer jwt-docente',
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
      },
      body: '{no es json',
    });

    const response = await handler(roto);

    expect(response.status).toBe(400);
    expectContract(await errorPayload(response), 'invalid_request');
  });

  it('devuelve una propuesta y nunca incluye la lectura original en la salida', async () => {
    const deps = dependencies();
    const handler = createGenerateAssessmentDraftHandler(deps);
    const readingText = 'La lectura completa debe permanecer en el formulario.';

    const response = await handler(
      request({ readingText, purpose: 'Diagnóstico inicial', questionCount: 1 }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(deps.generate).toHaveBeenCalledWith({
      readingText,
      purpose: 'Diagnóstico inicial',
      questionCount: 1,
      focus: 'balanced',
    });
    expect(payload).toEqual({ ok: true, data: validProposal });
    expect(JSON.stringify(payload)).not.toContain(readingText);
  });

  it('vuelve a validar de forma estricta la propuesta antes de entregarla al navegador', async () => {
    const deps = dependencies();
    deps.generate.mockResolvedValue({
      ...validProposal,
      questions: [{ ...validProposal.questions[0], curriculumLinks: { 'LL.5.3.1': 'x' } }],
    });
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(
      request({ readingText: 'Una lectura breve.', questionCount: 1 }),
    );

    expect(response.status).toBe(502);
    expectContract(await errorPayload(response), 'invalid_ai_response');
  });

  it('traduce cada código estable del asistente a su estado HTTP', async () => {
    const casos: Array<[GenerationErrorCode, number]> = [
      ['ai_not_configured', 503],
      ['ai_timeout', 504],
      ['invalid_ai_response', 502],
      ['provider_unavailable', 502],
    ];

    for (const [code, status] of casos) {
      const deps = dependencies();
      deps.generate.mockRejectedValue(new GenerationError(code, 'detalle interno'));
      const handler = createGenerateAssessmentDraftHandler(deps);

      const response = await handler(request({ readingText: 'Una lectura breve.' }));

      expect(response.status, code).toBe(status);
      const payload = await errorPayload(response);
      expectContract(payload, code);
      expect(JSON.stringify(payload)).not.toContain('detalle interno');
    }
  });

  it('no decide el estado HTTP comparando el texto del mensaje', async () => {
    const deps = dependencies();
    // Un fallo del proveedor cuyo mensaje imita al de una solicitud inválida.
    deps.generate.mockRejectedValue(new Error('Solicitud inválida.'));
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }));

    expect(response.status).toBe(502);
    expectContract(await errorPayload(response), 'provider_unavailable');
  });

  it('oculta los detalles del proveedor cuando la generación falla', async () => {
    const deps = dependencies();
    deps.generate.mockRejectedValue(new Error('DeepSeek secret/provider detail sk-privada'));
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }));
    const payload = await errorPayload(response);

    expect(response.status).toBe(502);
    expectContract(payload, 'provider_unavailable');
    expect(JSON.stringify(payload)).not.toContain('DeepSeek');
    expect(JSON.stringify(payload)).not.toContain('sk-privada');
  });
});
