import { describe, expect, it, vi } from 'vitest';
import { createGenerateAssessmentDraftHandler } from './handler.ts';

function request(body: unknown, token = 'jwt-docente') {
  return new Request('https://edge.example/generate-assessment-draft', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function dependencies(role: string | null = 'teacher') {
  return {
    allowedOrigins: ['http://localhost:5173'],
    verifyUser: vi.fn().mockResolvedValue(role ? { id: 'teacher-1', appMetadata: { role } } : null),
    generate: vi.fn().mockResolvedValue({
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
    }),
  };
}

describe('generate-assessment-draft', () => {
  it('rechaza una petición sin JWT docente válido', async () => {
    const deps = dependencies(null);
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }, 'inválido'));

    expect(response.status).toBe(401);
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta autenticada sin rol teacher', async () => {
    const deps = dependencies('student');
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }));

    expect(response.status).toBe(403);
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it('valida la lectura y limita la cantidad de preguntas', async () => {
    const deps = dependencies();
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(
      request({ readingText: 'Una lectura breve.', questionCount: 8, focus: 'balanced' }),
    );

    expect(response.status).toBe(400);
    expect(deps.generate).not.toHaveBeenCalled();
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
    expect(payload).toEqual({
      ok: true,
      data: expect.objectContaining({ title: expect.any(String) }),
    });
    expect(JSON.stringify(payload)).not.toContain(readingText);
  });

  it('oculta los detalles del proveedor cuando la generación falla', async () => {
    const deps = dependencies();
    deps.generate.mockRejectedValue(new Error('DeepSeek secret/provider detail'));
    const handler = createGenerateAssessmentDraftHandler(deps);

    const response = await handler(request({ readingText: 'Una lectura breve.' }));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      ok: false,
      error: 'No pudimos generar una propuesta. Inténtalo nuevamente.',
    });
    expect(JSON.stringify(payload)).not.toContain('DeepSeek');
  });
});
