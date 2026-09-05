import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getAccessOverview, rotateLegacyAccessCodes } from './assessmentAccess';

function client(data: unknown, error: { message: string } | null = null) {
  return {
    functions: { invoke: vi.fn().mockResolvedValue({ data, error }) },
  } as unknown as SupabaseClient;
}

const overview = {
  assessmentId: 'assessment-1',
  slug: 'diagnostico-2026',
  title: 'Diagnóstico inicial',
  legacyCount: 1,
  accesses: [
    {
      id: 'access-1',
      studentId: 'student-1',
      fullName: 'Ana Ruiz',
      groupName: '3ro BGU A',
      state: 'unused',
      submissionStatus: 'none',
      failedAttempts: 0,
      cooldownUntil: null,
      code: 'ABCD2345',
      codeStatus: 'available',
    },
    {
      id: 'access-2',
      studentId: 'student-2',
      fullName: 'Luis Peña',
      groupName: '3ro BGU A',
      state: 'active',
      submissionStatus: 'in_progress',
      failedAttempts: 2,
      cooldownUntil: '2026-09-04T12:00:00+00:00',
      code: null,
      codeStatus: 'legacy',
    },
  ],
};

describe('consulta docente de códigos vigentes', () => {
  it('recupera la lista completa desde la función privada', async () => {
    const fake = client({ ok: true, data: overview });

    await expect(getAccessOverview(fake)).resolves.toEqual(overview);
    expect(fake.functions.invoke).toHaveBeenCalledWith('manage-assessment-access', {
      body: { action: 'list' },
    });
  });

  it('no consulta ninguna tabla del cliente para obtener los códigos', async () => {
    const fake = client({ ok: true, data: overview }) as SupabaseClient & { from?: unknown };

    await getAccessOverview(fake);

    expect(fake.from).toBeUndefined();
  });

  it('entrega nulo cuando no hay ninguna evaluación abierta', async () => {
    await expect(getAccessOverview(client({ ok: true, data: null }))).resolves.toBeNull();
  });

  it('rechaza una respuesta con un código fuera del alfabeto acordado', async () => {
    const invalido = {
      ...overview,
      accesses: [{ ...overview.accesses[0], code: 'código-inválido' }],
    };

    await expect(getAccessOverview(client({ ok: true, data: invalido }))).rejects.toThrow();
  });

  it('convierte los códigos heredados y devuelve la lista recargada', async () => {
    const fake = client({ ok: true, data: { rotated: 34, revokedSessions: 1, list: overview } });

    await expect(rotateLegacyAccessCodes(fake, 'assessment-1')).resolves.toEqual({
      rotated: 34,
      revokedSessions: 1,
      list: overview,
    });
    expect(fake.functions.invoke).toHaveBeenCalledWith('manage-assessment-access', {
      body: { action: 'rotateLegacy', assessmentId: 'assessment-1' },
    });
  });
});
