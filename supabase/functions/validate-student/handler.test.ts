import { describe, expect, it, vi } from 'vitest';
import { createValidateStudentHandler } from './handler';

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
});
