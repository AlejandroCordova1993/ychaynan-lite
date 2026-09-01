import { describe, expect, it } from 'vitest';
import { createStudentSessionSecrets, hashSessionToken } from './studentSession.ts';

describe('student session secrets', () => {
  it('genera token opaco y hashes de dominio reproducibles', async () => {
    const fixed = (length: number) => new Uint8Array(length).fill(7);
    const secrets = await createStudentSessionSecrets(fixed);
    expect(secrets.token).not.toContain('=');
    expect(secrets.tokenHash).toBe(await hashSessionToken(secrets.token));
    expect(secrets.clientSubmissionKey).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
