/**
 * Helpers de escritura CSV compartidos: neutralización de fórmulas y
 * escapado RFC 4180. Extraídos de `src/features/assessment/accessCodesCsv.ts`
 * (comportamiento idéntico, sin cambios) para que cualquier exportador CSV del
 * proyecto — códigos de acceso, resumen diagnóstico — use el mismo código
 * probado en vez de reimplementarlo.
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@'];

/**
 * Una hoja de cálculo evalúa como fórmula cualquier celda que empiece por
 * `=`, `+`, `-` o `@`. El apóstrofo inicial la obliga a tratarla como texto.
 */
export function neutralizeFormula(value: string): string {
  return FORMULA_PREFIXES.includes(value.slice(0, 1)) ? `'${value}` : value;
}

export function escapeField(value: string): string {
  const safe = neutralizeFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
