const BOM = '﻿';
const HEADER = ['Nombre completo', 'Paralelo', 'Código', 'Estado', 'Enlace de evaluación'];
const FORMULA_PREFIXES = ['=', '+', '-', '@'];

export interface AccessCsvRow {
  fullName: string;
  groupName: string;
  code: string;
  state: string;
  link: string;
}

/**
 * Una hoja de cálculo evalúa como fórmula cualquier celda que empiece por
 * `=`, `+`, `-` o `@`. El apóstrofo inicial la obliga a tratarla como texto.
 */
function neutralizeFormula(value: string): string {
  return FORMULA_PREFIXES.includes(value.slice(0, 1)) ? `'${value}` : value;
}

function escapeField(value: string): string {
  const safe = neutralizeFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildAccessCodesCsv(rows: readonly AccessCsvRow[]): string {
  const lines = [
    HEADER.join(','),
    ...rows.map(({ fullName, groupName, code, state, link }) =>
      [fullName, groupName, code, state, link].map(escapeField).join(','),
    ),
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

export function accessCodesFileName(slug: string): string {
  return `${slug}-codigos.csv`;
}
