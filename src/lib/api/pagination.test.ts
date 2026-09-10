import { expect, it } from 'vitest';
import { readAllPages } from './pagination';

it('continúa aunque el servidor entregue menos filas que las solicitadas', async () => {
  const source = [1, 2, 3, 4, 5];
  const result = await readAllPages(async (from) => ({
    data: source.slice(from, from + 2),
    error: null,
  }));
  expect(result).toEqual({ data: [1, 2, 3, 4, 5], error: null });
});

it('no presenta una exportación parcial si falla una página posterior', async () => {
  const result = await readAllPages<number>(async (from) =>
    from === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: 'Sin conexión' } },
  );
  expect(result).toEqual({ data: [], error: { message: 'Sin conexión' } });
});

it('termina correctamente cuando no hay filas', async () => {
  expect(await readAllPages(async () => ({ data: [], error: null }))).toEqual({
    data: [],
    error: null,
  });
});
