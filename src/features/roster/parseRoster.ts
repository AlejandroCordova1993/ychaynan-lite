import Papa from 'papaparse';
import { containsInvalidNameCharacters, normalizeName } from '../../lib/validation/normalizeName';

export type RosterRowStatus = 'valid' | 'duplicate' | 'invalid';

export interface RosterCsvRow {
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
  encodingUsed: RosterEncoding;
  rows: RosterCsvRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export type RosterEncoding = 'utf-8' | 'windows-1252';

export interface RosterSummary {
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
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

const REQUIRED_HEADERS = ['nombres', 'apellidos'];
const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

export function summarizeRosterRows(rows: Array<Pick<RosterCsvRow, 'status'>>): RosterSummary {
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
  ) {
    return bytes.slice(3);
  }
  return bytes;
}

export function decodeRosterCsv(
  bytes: Uint8Array,
  requestedEncoding?: RosterEncoding,
): {
  text: string;
  encodingUsed: RosterEncoding;
} {
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
    const text = new TextDecoder('utf-8', { fatal: true }).decode(withoutBom);
    return { text, encodingUsed: 'utf-8' };
  } catch {
    const text = new TextDecoder('windows-1252').decode(withoutBom);
    return { text, encodingUsed: 'windows-1252' };
  }
}

export function parseRosterCsv(
  text: string,
  encodingUsed: RosterEncoding = 'utf-8',
): RosterImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`El archivo no tiene las columnas requeridas: ${missingHeaders.join(', ')}`);
  }

  const fieldMismatchRowIndexes = getFieldMismatchRowIndexes(parsed.errors);

  const seen = new Map<string, number>();
  const rows: RosterCsvRow[] = [];

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2;
    const namesRaw = (record.nombres ?? '').trim();
    const lastNamesRaw = (record.apellidos ?? '').trim();
    const authorizedVariantRaw = record.variante_autorizada?.trim() || null;
    const hasMismatch = fieldMismatchRowIndexes.has(index);
    const overflowFields = (record as { __parsed_extra?: string[] }).__parsed_extra ?? [];
    const hasOverflowContent = overflowFields.some((value) => value.trim() !== '');

    const isBlankLine =
      hasMismatch &&
      namesRaw === '' &&
      lastNamesRaw === '' &&
      !authorizedVariantRaw &&
      !hasOverflowContent;
    if (isBlankLine) {
      return;
    }

    const fullNameOriginal = `${namesRaw} ${lastNamesRaw}`.replace(/\s+/g, ' ').trim();
    const fullNameNormalized = normalizeName(fullNameOriginal);

    const issues: string[] = [];
    if (namesRaw === '' || lastNamesRaw === '') {
      issues.push('Faltan nombres o apellidos.');
    }
    if (hasMismatch) {
      issues.push('La fila no tiene el número de columnas esperado.');
    }
    if (containsInvalidNameCharacters(fullNameOriginal)) {
      issues.push('El nombre contiene dígitos o caracteres no válidos.');
    }

    let status: RosterRowStatus = issues.length > 0 ? 'invalid' : 'valid';

    if (status === 'valid') {
      const seenAtRow = seen.get(fullNameNormalized);
      if (seenAtRow !== undefined) {
        status = 'duplicate';
        issues.push(`Coincide con la fila ${seenAtRow}; revisa si es un duplicado accidental.`);
      } else {
        seen.set(fullNameNormalized, rowNumber);
      }
    }

    rows.push({
      rowNumber,
      namesRaw,
      lastNamesRaw,
      authorizedVariantRaw,
      fullNameOriginal,
      fullNameNormalized,
      status,
      issues,
    });
  });

  return { encodingUsed, rows, ...summarizeRosterRows(rows) };
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
