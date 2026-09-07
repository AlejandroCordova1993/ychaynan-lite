import { expect, it, vi } from 'vitest';
import { createSubmitAssessmentHandler } from './handler.ts';

const validBody = {
  token: 'secret-token',
  clientSubmissionKey: 'key',
  expectedVersion: 2,
  confirmed: true,
};

it('exige confirmación y entrega usando únicamente el hash del token', async () => {
  const submit = vi.fn().mockResolvedValue({
    ok: true,
    receiptId: 'sub-1',
    submittedAt: '2026-09-01T12:00:00.000Z',
    finalDraftVersion: 2,
  });
  const handler = createSubmitAssessmentHandler({ allowedOrigins: [], submit });
  const response = await handler(
    new Request('https://fn.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'secret-token',
        clientSubmissionKey: 'key',
        expectedVersion: 2,
        confirmed: true,
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      confirmed: true,
    }),
  );
  expect(JSON.stringify(submit.mock.calls)).not.toContain('secret-token');
});

it.each([
  { caso: 'token demasiado largo', body: { ...validBody, token: 'a'.repeat(257) } },
  {
    caso: 'clave idempotente demasiado larga',
    body: { ...validBody, clientSubmissionKey: 'a'.repeat(257) },
  },
  { caso: 'versión negativa', body: { ...validBody, expectedVersion: -1 } },
  { caso: 'confirmación falsa', body: { ...validBody, confirmed: false } },
  { caso: 'confirmación textual', body: { ...validBody, confirmed: 'true' } },
  { caso: 'versión no entera', body: { ...validBody, expectedVersion: 2.5 } },
  { caso: 'token en blanco', body: { ...validBody, token: '  ' } },
  { caso: 'campo inesperado', body: { ...validBody, extra: 1 } },
  { caso: 'cuerpo que no es objeto', body: [validBody] },
])('responde 400 sin llamar a submit para $caso', async ({ body }) => {
  const submit = vi.fn();
  const handler = createSubmitAssessmentHandler({ allowedOrigins: [], submit });
  const response = await handler(
    new Request('https://fn.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ ok: false, error: 'No pudimos registrar la entrega.' });
  expect(submit).not.toHaveBeenCalled();
});

it('responde 413 cuando Content-Length supera los 4 KB', async () => {
  const submit = vi.fn();
  const handler = createSubmitAssessmentHandler({ allowedOrigins: [], submit });
  const response = await handler(
    new Request('https://fn.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '5000' },
      body: JSON.stringify(validBody),
    }),
  );
  expect(response.status).toBe(413);
  expect(submit).not.toHaveBeenCalled();
});

it('responde 413 midiendo bytes UTF-8 cuando no llega Content-Length', async () => {
  const submit = vi.fn();
  const handler = createSubmitAssessmentHandler({ allowedOrigins: [], submit });
  const request = new Request('https://fn.test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validBody, token: 'ñ'.repeat(3_000) }),
  });
  expect(request.headers.get('Content-Length')).toBeNull();
  const response = await handler(request);
  expect(response.status).toBe(413);
  expect(submit).not.toHaveBeenCalled();
});
