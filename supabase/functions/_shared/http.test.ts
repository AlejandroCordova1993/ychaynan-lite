import { describe, expect, it } from 'vitest';
import { corsHeaders, handlePreflight, jsonResponse, readJsonObject } from './http.ts';

const allowed = ['http://localhost:5173', 'https://alejandrocordova1993.github.io'];

describe('HTTP compartido de Edge Functions', () => {
  it('autoriza únicamente un origen incluido de forma exacta', () => {
    expect(corsHeaders('http://localhost:5173', allowed)['Access-Control-Allow-Origin']).toBe(
      'http://localhost:5173',
    );
    expect(
      corsHeaders('https://sitio-malicioso.example', allowed)['Access-Control-Allow-Origin'],
    ).toBeUndefined();
  });

  it('responde el preflight sin ejecutar la operación', () => {
    const response = handlePreflight(
      new Request('https://edge.example', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      }),
      allowed,
    );
    expect(response?.status).toBe(204);
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('serializa respuestas JSON con las mismas reglas CORS', async () => {
    const response = jsonResponse({ ok: true }, 201, 'http://localhost:5173', allowed);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

describe('Lector seguro de JSON para Edge Functions', () => {
  it.each([
    { body: '', status: 400 },
    { body: '{', status: 400 },
    { body: '[]', status: 400 },
    { body: '{"allowed":true,"extra":1}', status: 400 },
  ])('rechaza forma inválida', async ({ body, status }) => {
    await expect(
      readJsonObject(new Request('https://local.test', { method: 'POST', body }), {
        maxBytes: 100,
        allowedFields: ['allowed'],
      }),
    ).rejects.toMatchObject({ status });
  });

  it('rechaza Content-Length excesivo', async () => {
    const request = new Request('https://local.test', {
      method: 'POST',
      headers: { 'Content-Length': '101' },
      body: '{}',
    });
    await expect(
      readJsonObject(request, { maxBytes: 100, allowedFields: [] }),
    ).rejects.toMatchObject({ status: 413, code: 'body_too_large' });
  });

  it('mide bytes UTF-8 sin cabecera', async () => {
    const request = new Request('https://local.test', {
      method: 'POST',
      body: JSON.stringify({ allowed: '😀😀' }),
    });
    await expect(
      readJsonObject(request, { maxBytes: 20, allowedFields: ['allowed'] }),
    ).rejects.toMatchObject({ status: 413 });
  });
});
