import { expect, it, vi } from 'vitest';
import { createSubmitAssessmentHandler } from './handler.ts';

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
