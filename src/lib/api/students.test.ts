import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { bulkImportStudents } from './students';

function fakeClient(options: { select?: unknown; error?: { message: string } | null }) {
  const error = options.error ?? null;
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => Promise.resolve({ data: options.select, error })),
  };
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('bulkImportStudents', () => {
  it('no llama al cliente si la lista está vacía', async () => {
    const client = fakeClient({ select: [] });
    const result = await bulkImportStudents(client, []);
    expect(result).toEqual({ inserted: 0 });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserta las filas y devuelve la cantidad insertada', async () => {
    const client = fakeClient({ select: [{ id: '1' }, { id: '2' }] });

    const result = await bulkImportStudents(client, [
      { groupId: 'g1', fullNameOriginal: 'Ana Ruiz', fullNameNormalized: 'ana ruiz' },
      { groupId: 'g1', fullNameOriginal: 'José Muñoz', fullNameNormalized: 'jose muñoz' },
    ]);

    expect(result).toEqual({ inserted: 2 });
  });

  it('normaliza la variante autorizada antes de guardarla', async () => {
    const client = fakeClient({ select: [{ id: '1' }] });

    await bulkImportStudents(client, [
      {
        groupId: 'g1',
        fullNameOriginal: 'Maria Fernanda De la Cruz',
        fullNameNormalized: 'maria fernanda de la cruz',
        authorizedVariant: 'Ma. Fernanda De-La-Cruz',
      },
    ]);

    const chain = vi.mocked(client.from).mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ authorized_variants: ['ma fernanda de la cruz'] }),
    ]);
  });

  it('lanza un mensaje seguro cuando la inserción falla', async () => {
    const client = fakeClient({ error: { message: 'constraint violation' } });
    await expect(
      bulkImportStudents(client, [
        { groupId: 'g1', fullNameOriginal: 'Ana Ruiz', fullNameNormalized: 'ana ruiz' },
      ]),
    ).rejects.toThrow(/No se pudo importar la nómina/);
  });
});
