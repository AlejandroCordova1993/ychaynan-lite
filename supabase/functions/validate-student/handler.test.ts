import { describe, expect, it, vi } from 'vitest';
import { createValidateStudentHandler } from './handler.ts';

const allowedOrigins = ['https://example.test'];
const validBody = {
  assessmentSlug: 'diagnostico',
  fullName: 'María Peña',
  groupName: '3RO B.G.U. A',
  personalCode: 'ABCD2345',
  fingerprint: 'device-1',
};

describe('validate-student handler', () => {
  it('normaliza identidad, crea secretos y nunca devuelve hashes', async () => {
    const validate = vi.fn().mockResolvedValue({
      submissionId: 'submission-1',
      expiresAt: '2026-09-01T12:00:00.000Z',
      draftVersion: 0,
    });
    const handler = createValidateStudentHandler(
      {
        allowedOrigins,
        pepper: 'pepper',
        sessionMinutes: 180,
        validate,
      },
      (length) => new Uint8Array(length).fill(3),
    );
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { Origin: allowedOrigins[0], 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(validate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullNameNormalized: 'maria peña',
        groupNameNormalized: '3ro b g u a',
        codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(payload.data.token).toBeTruthy();
    expect(JSON.stringify(payload)).not.toContain('Hash');
  });

  it.each(['nombre', 'paralelo', 'código', 'cerrada', 'entregada'])(
    'usa el mismo error genérico para %s',
    async () => {
      const handler = createValidateStudentHandler({
        allowedOrigins,
        pepper: 'pepper',
        sessionMinutes: 180,
        validate: vi.fn().mockRejectedValue(new Error('detalle privado')),
      });
      const response = await handler(
        new Request('https://fn.test', {
          method: 'POST',
          headers: { Origin: allowedOrigins[0], 'Content-Type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        ok: false,
        error: 'No pudimos validar tus datos. Revisa la información e intenta nuevamente.',
      });
    },
  );

  it.each([
    { caso: 'slug demasiado largo', body: { ...validBody, assessmentSlug: 'a'.repeat(201) } },
    { caso: 'nombre demasiado largo', body: { ...validBody, fullName: 'a'.repeat(161) } },
    { caso: 'paralelo demasiado largo', body: { ...validBody, groupName: 'a'.repeat(81) } },
    { caso: 'código demasiado largo', body: { ...validBody, personalCode: 'A'.repeat(13) } },
    { caso: 'fingerprint demasiado largo', body: { ...validBody, fingerprint: 'a'.repeat(129) } },
    { caso: 'nombre en blanco', body: { ...validBody, fullName: '   ' } },
    { caso: 'código ausente', body: { ...validBody, personalCode: undefined } },
    { caso: 'paralelo no textual', body: { ...validBody, groupName: 42 } },
    { caso: 'campo inesperado', body: { ...validBody, extra: true } },
    { caso: 'cuerpo que no es objeto', body: ['diagnostico'] },
  ])('responde 400 sin consultar la base para $caso', async ({ body }) => {
    const validate = vi.fn();
    const handler = createValidateStudentHandler({
      allowedOrigins,
      pepper: 'pepper',
      sessionMinutes: 180,
      validate,
    });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { Origin: allowedOrigins[0], 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'No pudimos validar tus datos. Revisa la información e intenta nuevamente.',
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('responde 413 cuando Content-Length supera los 4 KB', async () => {
    const validate = vi.fn();
    const handler = createValidateStudentHandler({
      allowedOrigins,
      pepper: 'pepper',
      sessionMinutes: 180,
      validate,
    });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: {
          Origin: allowedOrigins[0],
          'Content-Type': 'application/json',
          'Content-Length': '5000',
        },
        body: JSON.stringify(validBody),
      }),
    );
    expect(response.status).toBe(413);
    expect(validate).not.toHaveBeenCalled();
  });

  it('responde 413 midiendo bytes UTF-8 cuando no llega Content-Length', async () => {
    const validate = vi.fn();
    const handler = createValidateStudentHandler({
      allowedOrigins,
      pepper: 'pepper',
      sessionMinutes: 180,
      validate,
    });
    const request = new Request('https://fn.test', {
      method: 'POST',
      headers: { Origin: allowedOrigins[0], 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, fingerprint: 'ñ'.repeat(3_000) }),
    });
    expect(request.headers.get('Content-Length')).toBeNull();
    const response = await handler(request);
    expect(response.status).toBe(413);
    expect(validate).not.toHaveBeenCalled();
  });
});
