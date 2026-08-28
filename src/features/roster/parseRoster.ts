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
  encodingUsed: 'utf-8' | 'windows-1252';
  rows: RosterCsvRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

const REQUIRED_HEADERS = ['nombres', 'apellidos'];

export function decodeRosterCsv(
  bytes: Uint8Array,
): { text: string; encodingUsed: 'utf-8' | 'windows-1252' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, encodingUsed: 'utf-8' };
  } catch {
    const text = new TextDecoder('windows-1252').decode(bytes);
    return { text, encodingUsed: 'windows-1252' };
  }
}

export function parseRosterCsv(text: string): RosterImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`El archivo no tiene las columnas requeridas: ${missingHeaders.join(', ')}`);
  }

  const seen = new Map<string, number>();
  const rows: RosterCsvRow[] = parsed.data.map((record, index) => {
    const rowNumber = index + 2;
    const namesRaw = (record.nombres ?? '').trim();
    const lastNamesRaw = (record.apellidos ?? '').trim();
    const authorizedVariantRaw = record.variante_autorizada?.trim() || null;
    const fullNameOriginal = `${namesRaw} ${lastNamesRaw}`.replace(/\s+/g, ' ').trim();
    const fullNameNormalized = normalizeName(fullNameOriginal);

    const issues: string[] = [];
    if (namesRaw === '' || lastNamesRaw === '') {
      issues.push('Faltan nombres o apellidos.');
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

    return {
      rowNumber,
      namesRaw,
      lastNamesRaw,
      authorizedVariantRaw,
      fullNameOriginal,
      fullNameNormalized,
      status,
      issues,
    };
  });

  return {
    encodingUsed: 'utf-8',
    rows,
    validCount: rows.filter((row) => row.status === 'valid').length,
    duplicateCount: rows.filter((row) => row.status === 'duplicate').length,
    invalidCount: rows.filter((row) => row.status === 'invalid').length,
  };
}

export function importRosterFile(bytes: Uint8Array): RosterImportResult {
  const { text, encodingUsed } = decodeRosterCsv(bytes);
  const result = parseRosterCsv(text);
  return { ...result, encodingUsed };
}
