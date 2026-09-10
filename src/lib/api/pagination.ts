/** Lee todas las páginas bajo la sesión/RLS del cliente. Nunca entrega datos parciales ante error. */
export async function readAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) return { data: [], error };
    if (!data?.length) return { data: rows, error: null };
    rows.push(...data);
    // Avanza por lo recibido: el servidor podría imponer un límite menor a 500.
  }
}
