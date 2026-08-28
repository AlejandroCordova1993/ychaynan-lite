import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createGroup, listGroups } from './groups';

interface FakeClientOptions {
  single?: unknown;
  select?: unknown;
  error?: { message: string } | null;
}

function fakeClient(options: FakeClientOptions) {
  const error = options.error ?? null;
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data: options.select, error })),
    single: vi.fn(() => Promise.resolve({ data: options.single, error })),
  };
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

describe('createGroup', () => {
  it('inserta un paralelo y devuelve el resultado ya validado', async () => {
    const client = fakeClient({
      single: {
        id: '11111111-1111-1111-1111-111111111111',
        name: '3ro BGU A',
        school_year: '2026-2027',
        status: 'active',
      },
    });

    const result = await createGroup(client, { name: '3ro BGU A', schoolYear: '2026-2027' });

    expect(result).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
  });

  it('lanza un mensaje seguro cuando la inserción falla', async () => {
    const client = fakeClient({ error: { message: 'duplicate key' } });
    await expect(
      createGroup(client, { name: '3ro BGU A', schoolYear: '2026-2027' }),
    ).rejects.toThrow(/No se pudo crear el paralelo/);
  });
});

describe('listGroups', () => {
  it('devuelve los paralelos ordenados por nombre', async () => {
    const client = fakeClient({
      select: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: '3ro BGU A',
          school_year: '2026-2027',
          status: 'active',
        },
      ],
    });

    const result = await listGroups(client);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('3ro BGU A');
  });
});
