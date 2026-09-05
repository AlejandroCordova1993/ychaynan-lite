import { describe, expect, it } from 'vitest';
import { deriveRecoverableAccessCode, generateAccessCode, hashAccessCode } from './crypto.ts';

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

describe('derivación determinista de códigos recuperables', () => {
  const assessmentId = '11111111-1111-1111-1111-111111111111';
  const studentId = '22222222-2222-2222-2222-222222222222';

  it('deriva ocho caracteres del alfabeto legible', async () => {
    const code = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it('reconstruye el mismo código para la misma generación', async () => {
    const first = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);
    const second = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);

    expect(second).toBe(first);
  });

  it('cambia el código al aumentar la generación', async () => {
    const first = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);
    const second = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 2);

    expect(second).not.toBe(first);
  });

  it('entrega códigos distintos a cada estudiante de la misma evaluación', async () => {
    const first = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);
    const second = await deriveRecoverableAccessCode(
      'pepper-secreto',
      assessmentId,
      '33333333-3333-3333-3333-333333333333',
      1,
    );

    expect(second).not.toBe(first);
  });

  it('depende del pepper del servidor', async () => {
    const first = await deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 1);
    const second = await deriveRecoverableAccessCode('otro-pepper', assessmentId, studentId, 1);

    expect(second).not.toBe(first);
  });

  it('rechaza un pepper vacío', async () => {
    await expect(deriveRecoverableAccessCode('', assessmentId, studentId, 1)).rejects.toThrow(
      /pepper/i,
    );
  });

  it('rechaza generaciones heredadas o inválidas', async () => {
    await expect(
      deriveRecoverableAccessCode('pepper-secreto', assessmentId, studentId, 0),
    ).rejects.toThrow(/generación/i);
  });
});
