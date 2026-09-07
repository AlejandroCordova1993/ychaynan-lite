import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { bulkImportStudents } from './students';

function fakeClient(options: { data?: unknown; error?: { message: string } | null }) {
  return {
    rpc: vi.fn(() => Promise.resolve({ data: options.data ?? null, error: options.error ?? null })),
    from: vi.fn(),
  } as unknown as SupabaseClient;
}

describe('bulkImportStudents', () => {
  it('no llama al cliente si la lista está vacía', async () => {
    const client = fakeClient({ data: 0 });
    const result = await bulkImportStudents(client, []);
    expect(result).toEqual({ inserted: 0 });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('envía una sola llamada a la RPC atómica y devuelve la cantidad insertada', async () => {
    const client = fakeClient({ data: 2 });

    const result = await bulkImportStudents(client, [
      { groupId: 'g1', fullNameOriginal: 'Ana Ruiz' },
      { groupId: 'g1', fullNameOriginal: 'José Muñoz', authorizedVariant: 'Pepe Muñoz' },
    ]);

    expect(result).toEqual({ inserted: 2 });
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('import_students_to_group', {
      p_group_id: 'g1',
      p_students: [
        { full_name_original: 'Ana Ruiz', authorized_variant: null },
        { full_name_original: 'José Muñoz', authorized_variant: 'Pepe Muñoz' },
      ],
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('rechaza una nómina que mezcla paralelos antes de tocar la red', async () => {
    const client = fakeClient({ data: 2 });

    await expect(
      bulkImportStudents(client, [
        { groupId: 'g1', fullNameOriginal: 'Ana Ruiz' },
        { groupId: 'g2', fullNameOriginal: 'José Muñoz' },
      ]),
    ).rejects.toThrow(/un solo paralelo/);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('lanza un mensaje seguro cuando la RPC falla, sin filtrar el detalle técnico', async () => {
    const client = fakeClient({ error: { message: 'group would exceed maximum 50 students' } });

    let thrown: unknown;
    try {
      await bulkImportStudents(client, [{ groupId: 'g1', fullNameOriginal: 'Ana Ruiz' }]);
    } catch (caught) {
      thrown = caught;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/No se pudo importar la nómina/);
    expect((thrown as Error).message).not.toMatch(/Ana Ruiz|maximum 50/);
  });

  it('rechaza una respuesta que no sea un conteo válido', async () => {
    const client = fakeClient({ data: { inserted: 'muchos' } });

    await expect(
      bulkImportStudents(client, [{ groupId: 'g1', fullNameOriginal: 'Ana Ruiz' }]),
    ).rejects.toThrow();
  });
});
