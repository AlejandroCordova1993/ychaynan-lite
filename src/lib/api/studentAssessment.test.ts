import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { validateStudent } from './studentAssessment';

it('envía los cuatro datos y valida la sesión devuelta', async () => {
  const invoke = vi.fn().mockResolvedValue({
    data: {
      ok: true,
      data: {
        token: 'token-seguro-de-prueba-con-longitud-suficiente',
        expiresAt: '2099-09-01T12:00:00.000+00:00',
        clientSubmissionKey: 'key',
        submissionId: 'submission-1',
        draftVersion: 0,
      },
    },
    error: null,
  });
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, {
      assessmentSlug: 'diagnostico',
      fullName: 'María Peña',
      groupName: '3ro A',
      personalCode: 'ABCD2345',
      fingerprint: 'device-1',
    }),
  ).resolves.toMatchObject({
    submissionId: 'submission-1',
    draftVersion: 0,
    expiresAt: '2099-09-01T12:00:00.000+00:00',
  });
  expect(invoke).toHaveBeenCalledWith('validate-student', {
    body: expect.objectContaining({ personalCode: 'ABCD2345' }),
  });
});

function baseInput() {
  return {
    assessmentSlug: 'diagnostico',
    fullName: 'María Peña',
    groupName: '3ro A',
    personalCode: 'ABCD2345',
    fingerprint: 'device-1',
  };
}

it('rechaza un nombre completo de más de 160 caracteres antes de invocar la función', async () => {
  const invoke = vi.fn();
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, { ...baseInput(), fullName: 'a'.repeat(161) }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});

it('rechaza un paralelo de más de 80 caracteres antes de invocar la función', async () => {
  const invoke = vi.fn();
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, { ...baseInput(), groupName: 'a'.repeat(81) }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});

it('rechaza un código personal de más de 12 caracteres antes de invocar la función', async () => {
  const invoke = vi.fn();
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, { ...baseInput(), personalCode: 'a'.repeat(13) }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});

it('rechaza una huella de dispositivo de más de 128 caracteres antes de invocar la función', async () => {
  const invoke = vi.fn();
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, { ...baseInput(), fingerprint: 'a'.repeat(129) }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});

it('rechaza un slug de evaluación de más de 200 caracteres antes de invocar la función', async () => {
  const invoke = vi.fn();
  const client = { functions: { invoke } } as unknown as SupabaseClient;
  await expect(
    validateStudent(client, { ...baseInput(), assessmentSlug: 'a'.repeat(201) }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});
