import { escapeField } from '../../lib/csv/csvEscaping';

const BOM = '﻿';
const HEADER = ['Nombre completo', 'Paralelo', 'Código', 'Estado', 'Enlace de evaluación'];

export interface AccessCsvRow {
  fullName: string;
  groupName: string;
  code: string;
  state: string;
  link: string;
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
