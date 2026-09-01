import { describe, expect, it, vi } from 'vitest';
import { createSaveDraftHandler } from './handler';

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
          responses: [{ questionId: 'q1', text: ' texto ' }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
    expect(JSON.stringify(save.mock.calls)).not.toContain('secret-token');
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
});
