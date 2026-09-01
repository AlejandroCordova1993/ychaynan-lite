import { describe, expect, it } from 'vitest';
import { generateAccessCode, hashAccessCode } from './crypto.ts';

describe('códigos personales de acceso', () => {
  it('genera ocho caracteres legibles sin símbolos ambiguos', () => {
    const code = generateAccessCode(() => Uint8Array.from([0, 1, 2, 3, 28, 29, 30, 31]));

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    expect(code).not.toMatch(/[0O1I]/);
  });

  it('produce un HMAC reproducible, sensible al código y al pepper', async () => {
    const first = await hashAccessCode('ABCD-2345', 'pepper-secreto');

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    await expect(hashAccessCode('ABCD-2345', 'pepper-secreto')).resolves.toBe(first);
    await expect(hashAccessCode('ABCD-2346', 'pepper-secreto')).resolves.not.toBe(first);
    await expect(hashAccessCode('ABCD-2345', 'otro-pepper')).resolves.not.toBe(first);
  });

  it('rechaza un pepper vacío para no almacenar hashes previsibles', async () => {
    await expect(hashAccessCode('ABCD2345', '')).rejects.toThrow(/pepper/i);
  });
});
