import { describe, expect, it, vi } from 'vitest';
import { createSaveDraftHandler } from './handler.ts';

const validUuid = '11111111-1111-4111-8111-111111111111';
const otherUuid = '22222222-2222-4222-8222-222222222222';
const validResponse = { questionId: validUuid, text: 'texto' };
const validSave = {
  action: 'save',
  token: 'token',
  clientSubmissionKey: 'key',
  expectedVersion: 1,
  responses: [validResponse],
};

describe('save-draft handler', () => {
  it('carga y guarda usando solo el hash del token', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, draftVersion: 1 });
    const handler = createSaveDraftHandler({
      allowedOrigins: ['https://example.test'],
      save,
      load: vi.fn(),
    });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { Origin: 'https://example.test', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          token: 'secret-token',
          clientSubmissionKey: 'key',
          expectedVersion: 0,
          responses: [{ questionId: validUuid, text: ' texto ' }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
    expect(JSON.stringify(save.mock.calls)).not.toContain('secret-token');
  });

  it('conserva el texto sin recortar ni normalizar', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, draftVersion: 1 });
    const handler = createSaveDraftHandler({ allowedOrigins: [], save, load: vi.fn() });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validSave,
          responses: [{ questionId: validUuid, text: '  hola   mundo  ' }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        responses: [{ questionId: validUuid, text: '  hola   mundo  ' }],
      }),
    );
  });

  it('responde 409 sin ocultar el borrador remoto cuando hay conflicto', async () => {
    const handler = createSaveDraftHandler({
      allowedOrigins: [],
      load: vi.fn(),
      save: vi.fn().mockResolvedValue({
        ok: false,
        conflict: true,
        draftVersion: 2,
        responses: [{ questionId: 'q1', text: 'remoto' }],
      }),
    });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          token: 'token',
          clientSubmissionKey: 'key',
          expectedVersion: 1,
          responses: [],
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).data.responses[0].text).toBe('remoto');
  });

  it('responde 401 cuando la sesión ya no es válida', async () => {
    const handler = createSaveDraftHandler({
      allowedOrigins: [],
      load: vi.fn().mockResolvedValue({ ok: false }),
      save: vi.fn(),
    });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', token: 'token', clientSubmissionKey: 'key' }),
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'No pudimos sincronizar el borrador.',
    });
  });

  it.each([
    {
      caso: 'más de cuatro respuestas',
      body: { ...validSave, responses: Array(5).fill(validResponse) },
    },
    {
      caso: 'respuesta que excede 5.000 caracteres',
      body: {
        ...validSave,
        responses: [{ questionId: validUuid, text: 'a'.repeat(5_001) }],
      },
    },
    {
      caso: 'pregunta repetida',
      body: { ...validSave, responses: [validResponse, validResponse] },
    },
    {
      caso: 'identificador que no es UUID',
      body: { ...validSave, responses: [{ questionId: 'bad', text: '' }] },
    },
    {
      caso: 'campo extra dentro de la respuesta',
      body: { ...validSave, responses: [{ ...validResponse, extra: true }] },
    },
    { caso: 'versión negativa', body: { ...validSave, expectedVersion: -1 } },
    { caso: 'versión no entera', body: { ...validSave, expectedVersion: 1.5 } },
    { caso: 'versión ausente', body: { ...validSave, expectedVersion: undefined } },
    { caso: 'respuestas ausentes', body: { ...validSave, responses: undefined } },
    { caso: 'respuestas que no son arreglo', body: { ...validSave, responses: {} } },
    {
      caso: 'texto que no es cadena',
      body: { ...validSave, responses: [{ questionId: validUuid, text: 7 }] },
    },
    { caso: 'acción desconocida', body: { ...validSave, action: 'delete' } },
    { caso: 'acción ausente', body: { ...validSave, action: undefined } },
    { caso: 'token en blanco', body: { ...validSave, token: '   ' } },
    { caso: 'token demasiado largo', body: { ...validSave, token: 'a'.repeat(257) } },
    {
      caso: 'clave idempotente demasiado larga',
      body: { ...validSave, clientSubmissionKey: 'a'.repeat(257) },
    },
    { caso: 'campo inesperado', body: { ...validSave, extra: true } },
    {
      caso: 'carga que incluye respuestas',
      body: { action: 'load', token: 'token', clientSubmissionKey: 'key', responses: [] },
    },
    {
      caso: 'carga que incluye versión esperada',
      body: { action: 'load', token: 'token', clientSubmissionKey: 'key', expectedVersion: 0 },
    },
    { caso: 'cuerpo que no es objeto', body: [validSave] },
  ])('responde 400 sin tocar las dependencias para $caso', async ({ body }) => {
    const load = vi.fn();
    const save = vi.fn();
    const handler = createSaveDraftHandler({ allowedOrigins: [], load, save });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'No pudimos sincronizar el borrador.',
    });
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('acepta un borrador vacío y otro con cuatro respuestas distintas', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, draftVersion: 3 });
    const handler = createSaveDraftHandler({ allowedOrigins: [], load: vi.fn(), save });
    const responses = [
      validUuid,
      otherUuid,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ].map((questionId) => ({ questionId, text: 'ok' }));
    for (const payload of [[], responses]) {
      const response = await handler(
        new Request('https://fn.test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...validSave, responses: payload }),
        }),
      );
      expect(response.status).toBe(200);
    }
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('acepta una respuesta de exactamente 5.000 caracteres', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, draftVersion: 1 });
    const handler = createSaveDraftHandler({ allowedOrigins: [], load: vi.fn(), save });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validSave,
          responses: [{ questionId: validUuid, text: 'a'.repeat(5_000) }],
        }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it('responde 413 cuando Content-Length supera los 96 KB', async () => {
    const load = vi.fn();
    const save = vi.fn();
    const handler = createSaveDraftHandler({ allowedOrigins: [], load, save });
    const response = await handler(
      new Request('https://fn.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '98305' },
        body: JSON.stringify(validSave),
      }),
    );
    expect(response.status).toBe(413);
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('responde 413 midiendo bytes UTF-8 cuando no llega Content-Length', async () => {
    const load = vi.fn();
    const save = vi.fn();
    const handler = createSaveDraftHandler({ allowedOrigins: [], load, save });
    const request = new Request('https://fn.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validSave,
        responses: [{ questionId: validUuid, text: 'ñ'.repeat(50_000) }],
      }),
    });
    expect(request.headers.get('Content-Length')).toBeNull();
    const response = await handler(request);
    expect(response.status).toBe(413);
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
