import Papa from 'papaparse';
import { containsInvalidNameCharacters, normalizeName } from '../../lib/validation/normalizeName';

export type RosterRowStatus = 'valid' | 'duplicate' | 'invalid';
export type RosterEncoding = 'utf-8' | 'windows-1252';
export type RosterFileType = 'csv' | 'xlsx';

export interface RosterRow {
  rowNumber: number;
  namesRaw: string;
  lastNamesRaw: string;
  authorizedVariantRaw: string | null;
  fullNameOriginal: string;
  fullNameNormalized: string;
  status: RosterRowStatus;
  issues: string[];
}

export interface RosterImportResult {
  fileType: RosterFileType;
  encodingUsed: RosterEncoding | null;
  rows: RosterRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface RosterSummary {
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

interface RawRosterRow {
  rowNumber: number;
  record: Record<string, string>;
  hasMismatch: boolean;
  hasOverflowContent: boolean;
  cellCount: number;
}

export const MAX_ROSTER_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROSTER_ROWS = 2_000;
export const MAX_ROSTER_CELLS = 20_000;

const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
const FULL_NAME_HEADERS = ['nombre completo', 'nombres y apellidos'];

function normalizeHeader(header: string): string {
  return header.trim().toLocaleLowerCase('es').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function validateHeaders(headers: string[]): {
  namesHeader: string | null;
  lastNamesHeader: string | null;
  fullNameHeader: string | null;
  authorizedVariantHeader: string | null;
} {
  const normalizedHeaders: string[] = [];
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (normalized) normalizedHeaders.push(normalized);
  }
  const namesHeader = normalizedHeaders.includes('nombres') ? 'nombres' : null;
  const lastNamesHeader = normalizedHeaders.includes('apellidos') ? 'apellidos' : null;
  const fullNameHeader =
    FULL_NAME_HEADERS.find((header) => normalizedHeaders.includes(header)) ?? null;
  const authorizedVariantHeader = normalizedHeaders.includes('variante autorizada')
    ? 'variante autorizada'
    : null;

  if (namesHeader && lastNamesHeader && fullNameHeader) {
    throw new Error(
      'La nómina contiene dos formatos de nombre a la vez. Elimina la columna "nombre completo" o las columnas "nombres" y "apellidos".',
    );
  }

  if ((!namesHeader || !lastNamesHeader) && !fullNameHeader) {
    const detected = normalizedHeaders.length > 0 ? normalizedHeaders.join(', ') : 'ninguna';
    throw new Error(
      'No reconocimos las columnas de la nómina. Encontramos: ' +
        detected +
        '. Usa las columnas "nombres" y "apellidos", o una columna "nombre completo".',
    );
  }

  return { namesHeader, lastNamesHeader, fullNameHeader, authorizedVariantHeader };
}

function parseRawRows(
  headers: string[],
  rawRows: RawRosterRow[],
  fileType: RosterFileType,
  encodingUsed: RosterEncoding | null,
): RosterImportResult {
  const layout = validateHeaders(headers);
  if (rawRows.length > MAX_ROSTER_ROWS) {
    throw new Error(
      'La nómina supera el máximo de ' + MAX_ROSTER_ROWS + ' estudiantes por archivo.',
    );
  }
  const materializedCellCount =
    headers.length + rawRows.reduce((total, row) => total + row.cellCount, 0);
  if (materializedCellCount > MAX_ROSTER_CELLS) {
    throw new Error('La nómina supera el máximo de ' + MAX_ROSTER_CELLS + ' celdas permitidas.');
  }
  const seen = new Map<string, number>();
  const rows: RosterRow[] = [];

  for (const rawRow of rawRows) {
    const fullNameFromColumn = layout.fullNameHeader
      ? (rawRow.record[layout.fullNameHeader] ?? '').trim()
      : '';
    const namesRaw = layout.fullNameHeader
      ? fullNameFromColumn
      : (rawRow.record[layout.namesHeader ?? ''] ?? '').trim();
    const lastNamesRaw = layout.fullNameHeader
      ? ''
      : (rawRow.record[layout.lastNamesHeader ?? ''] ?? '').trim();
    const authorizedVariantRaw = layout.authorizedVariantHeader
      ? rawRow.record[layout.authorizedVariantHeader]?.trim() || null
      : null;

    const isBlankLine =
      namesRaw === '' && lastNamesRaw === '' && !authorizedVariantRaw && !rawRow.hasOverflowContent;
    if (isBlankLine) continue;

    const fullNameOriginal = layout.fullNameHeader
      ? fullNameFromColumn.replace(/\s+/g, ' ').trim()
      : (namesRaw + ' ' + lastNamesRaw).replace(/\s+/g, ' ').trim();
    const fullNameNormalized = normalizeName(fullNameOriginal);
    const issues: string[] = [];

    if (layout.fullNameHeader ? fullNameOriginal === '' : namesRaw === '' || lastNamesRaw === '') {
      issues.push(
        layout.fullNameHeader ? 'Falta el nombre completo.' : 'Faltan nombres o apellidos.',
      );
    }
    if (rawRow.hasMismatch) issues.push('La fila no tiene el número de columnas esperado.');
    if (containsInvalidNameCharacters(fullNameOriginal)) {
      issues.push('El nombre contiene dígitos o caracteres no válidos.');
    }

    let status: RosterRowStatus = issues.length > 0 ? 'invalid' : 'valid';
    if (status === 'valid') {
      const seenAtRow = seen.get(fullNameNormalized);
      if (seenAtRow !== undefined) {
        status = 'duplicate';
        issues.push(
          'Coincide con la fila ' + seenAtRow + '; revisa si es un duplicado accidental.',
        );
      } else {
        seen.set(fullNameNormalized, rawRow.rowNumber);
      }
    }

    rows.push({
      rowNumber: rawRow.rowNumber,
      namesRaw,
      lastNamesRaw,
      authorizedVariantRaw,
      fullNameOriginal,
      fullNameNormalized,
      status,
      issues,
    });
  }

  return { fileType, encodingUsed, rows, ...summarizeRosterRows(rows) };
}

export function getFieldMismatchRowIndexes(
  errors: Array<{ type: string; row?: number }>,
): Set<number> {
  const indexes = new Set<number>();
  for (const error of errors) {
    if (error.type === 'FieldMismatch' && error.row !== undefined) indexes.add(error.row);
  }
  return indexes;
}

export function summarizeRosterRows(rows: Array<Pick<RosterRow, 'status'>>): RosterSummary {
  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  for (const row of rows) {
    if (row.status === 'valid') validCount += 1;
    if (row.status === 'duplicate') duplicateCount += 1;
    if (row.status === 'invalid') invalidCount += 1;
  }
  return { validCount, duplicateCount, invalidCount };
}

function stripUtf8Bom(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length >= 3 &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  )
    return bytes.slice(3);
  return bytes;
}

export function decodeRosterCsv(
  bytes: Uint8Array,
  requestedEncoding?: RosterEncoding,
): { text: string; encodingUsed: RosterEncoding } {
  const withoutBom = stripUtf8Bom(bytes);
  if (requestedEncoding === 'utf-8') {
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(withoutBom),
      encodingUsed: 'utf-8',
    };
  }
  if (requestedEncoding === 'windows-1252') {
    return {
      text: new TextDecoder('windows-1252').decode(withoutBom),
      encodingUsed: 'windows-1252',
    };
  }
  try {
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(withoutBom),
      encodingUsed: 'utf-8',
    };
  } catch {
    return {
      text: new TextDecoder('windows-1252').decode(withoutBom),
      encodingUsed: 'windows-1252',
    };
  }
}

export function parseRosterCsv(
  text: string,
  encodingUsed: RosterEncoding = 'utf-8',
): RosterImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: false,
    transformHeader: normalizeHeader,
  });
  const headers = parsed.meta.fields ?? [];
  const mismatchIndexes = getFieldMismatchRowIndexes(parsed.errors);
  const rawRows = parsed.data.map((record, index) => {
    const overflowFields = (record as { __parsed_extra?: string[] }).__parsed_extra ?? [];
    return {
      rowNumber: index + 2,
      record,
      hasMismatch: mismatchIndexes.has(index),
      hasOverflowContent: overflowFields.some((value) => value.trim() !== ''),
      cellCount: headers.length + overflowFields.length,
    };
  });
  return parseRawRows(headers, rawRows, 'csv', encodingUsed);
}

export function importRosterFile(
  bytes: Uint8Array,
  requestedEncoding?: RosterEncoding,
): RosterImportResult {
  const { text, encodingUsed } = decodeRosterCsv(bytes, requestedEncoding);
  if (text.includes('\uFFFD')) {
    throw new Error(
      'El archivo contiene caracteres de reemplazo; revisa la codificación antes de importar.',
    );
  }
  return parseRosterCsv(text, encodingUsed);
}

async function importRosterXlsx(bytes: Uint8Array): Promise<RosterImportResult> {
  const { readSheet } = await import('read-excel-file/browser');
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  let sheetRows;
  try {
    sheetRows = await readSheet(arrayBuffer);
  } catch {
    throw new Error(
      'No se pudo abrir el archivo Excel. Comprueba que sea un archivo .xlsx válido.',
    );
  }

  const headerCells = sheetRows[0] ?? [];
  const headers = headerCells.map((cell) => normalizeHeader(cell == null ? '' : String(cell)));
  const rawRows: RawRosterRow[] = sheetRows.slice(1).map((cells, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      const cell = cells[columnIndex];
      if (header) record[header] = cell == null ? '' : String(cell).trim();
    });
    const overflowCells = cells.slice(headers.length);
    return {
      rowNumber: index + 2,
      record,
      hasMismatch: overflowCells.some((cell) => cell != null && String(cell).trim() !== ''),
      hasOverflowContent: overflowCells.some((cell) => cell != null && String(cell).trim() !== ''),
      cellCount: cells.length,
    };
  });

  return parseRawRows(headers, rawRows, 'xlsx', null);
}

export async function importRosterUpload(
  bytes: Uint8Array,
  fileName: string,
  requestedEncoding?: RosterEncoding,
): Promise<RosterImportResult> {
  if (bytes.byteLength > MAX_ROSTER_FILE_BYTES) {
    throw new Error('El archivo supera el máximo permitido de 5 MB.');
  }
  const extension = fileName.trim().toLocaleLowerCase('es').split('.').pop();
  if (extension === 'csv') return importRosterFile(bytes, requestedEncoding);
  if (extension === 'xlsx') return importRosterXlsx(bytes);
  throw new Error(
    'Solo se aceptan archivos CSV o XLSX. Selecciona una nómina en uno de esos formatos.',
  );
}
