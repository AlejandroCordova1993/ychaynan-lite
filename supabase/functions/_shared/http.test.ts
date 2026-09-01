import { describe, expect, it } from 'vitest';
import { corsHeaders, handlePreflight, jsonResponse } from './http';

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
