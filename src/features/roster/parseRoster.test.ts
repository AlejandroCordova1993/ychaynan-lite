import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeRosterCsv,
  importRosterFile,
  importRosterUpload,
  MAX_ROSTER_CELLS,
  MAX_ROSTER_ROWS,
  getFieldMismatchRowIndexes,
  parseRosterCsv,
  summarizeRosterRows,
} from './parseRoster';

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function windows1252Bytes(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

async function xlsxFixture(fileName: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve('src/features/roster/fixtures', fileName)));
}

describe('summarizeRosterRows', () => {
  it('resume estados de filas en una sola pasada', () => {
    expect(
      summarizeRosterRows([
        { status: 'valid' },
        { status: 'duplicate' },
        { status: 'invalid' },
        { status: 'valid' },
      ]),
    ).toEqual({ validCount: 2, duplicateCount: 1, invalidCount: 1 });
  });
});

describe('getFieldMismatchRowIndexes', () => {
  it('conserva solo los índices de errores de columnas', () => {
    expect(
      getFieldMismatchRowIndexes([
        { type: 'FieldMismatch', row: 0 },
        { type: 'TooManyFields', row: 1 },
        { type: 'FieldMismatch', row: 3 },
      ]),
    ).toEqual(new Set([0, 3]));
  });
});

describe('decodeRosterCsv', () => {
  it('decodifica un archivo UTF-8 válido como utf-8', () => {
    const result = decodeRosterCsv(utf8Bytes('nombres,apellidos\nMaría,Peña Ñacato\n'));
    expect(result.encodingUsed).toBe('utf-8');
    expect(result.text).toContain('María');
    expect(result.text).toContain('Ñacato');
  });

  it('usa windows-1252 cuando los bytes no son UTF-8 válido (CSV exportado desde Excel en Windows)', () => {
    const result = decodeRosterCsv(windows1252Bytes('nombres,apellidos\nMaría,Peña Ñacato\n'));
    expect(result.encodingUsed).toBe('windows-1252');
    expect(result.text).toContain('María');
    expect(result.text).toContain('Ñacato');
  });

  it('decodifica un archivo UTF-8 con BOM inicial y no deja el BOM en el texto', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = utf8Bytes('nombres,apellidos\nMaría,Peña Ñacato\n');
    const bytesWithBom = new Uint8Array([...bom, ...body]);

    const result = decodeRosterCsv(bytesWithBom);

    expect(result.encodingUsed).toBe('utf-8');
    expect(result.text.startsWith('nombres,apellidos')).toBe(true);
    expect(result.text.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('descarta un BOM inicial incluso cuando el resto del archivo está en windows-1252', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = windows1252Bytes('nombres,apellidos\nMaría,Peña Ñacato\n');
    const bytesWithBomAndWindows1252Body = new Uint8Array([...bom, ...body]);

    const result = decodeRosterCsv(bytesWithBomAndWindows1252Body);

    expect(result.encodingUsed).toBe('windows-1252');
    expect(result.text.startsWith('nombres,apellidos')).toBe(true);
    expect(result.text.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('parseRosterCsv', () => {
  it('lanza un error si faltan las columnas requeridas', () => {
    expect(() => parseRosterCsv('nombre,apellido\nAna,Ruiz\n')).toThrow(/columnas de la nómina/);
  });

  it('rechaza encabezados ambiguos para no descartar estudiantes silenciosamente', () => {
    expect(() =>
      parseRosterCsv('nombres,apellidos,nombre completo\nAna,Ruiz,\nLuis,Pérez,Luis Pérez\n'),
    ).toThrow(/dos formatos de nombre.*elimina la columna/i);
  });

  it('limita la cantidad de estudiantes materializados en una nómina', () => {
    const rows = Array.from(
      { length: MAX_ROSTER_ROWS + 1 },
      (_, index) => 'Nombre' + index + ',Apellido',
    );
    expect(() => parseRosterCsv('nombres,apellidos\n' + rows.join('\n'))).toThrow(
      /máximo.*estudiantes/i,
    );
  });

  it('cuenta también las celdas sobrantes al aplicar el límite', () => {
    const extraCells = Array.from({ length: 99 }, () => 'dato');
    const row = ['Ana', 'Ruiz', ...extraCells].join(',');
    const rowCount = Math.ceil(MAX_ROSTER_CELLS / 101);

    expect(() =>
      parseRosterCsv('nombres,apellidos\n' + Array(rowCount).fill(row).join('\n')),
    ).toThrow(/máximo.*celdas/i);
  });

  it('marca una fila válida y normaliza el nombre completo', () => {
    const result = parseRosterCsv('nombres,apellidos\nJosé Andrés,Muñoz\n');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].fullNameNormalized).toBe('jose andres muñoz');
  });

  it('marca como inválida una fila sin nombres o sin apellidos', () => {
    const result = parseRosterCsv('nombres,apellidos\n,Muñoz\n');
    expect(result.rows[0].status).toBe('invalid');
    expect(result.rows[0].issues[0]).toMatch(/Faltan/);
  });

  it('marca como duplicada la segunda fila con el mismo nombre normalizado', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n');
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[1].status).toBe('duplicate');
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(0);
  });

  it('cuenta correctamente válidas, duplicadas e inválidas', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\nAna,Ruiz\n,Sin Apellido\n');
    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(1);
  });

  it('mantiene el número de fila correcto cuando hay una línea en blanco en medio del archivo', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\n\nJose,Perez\n');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].rowNumber).toBe(2);
    expect(result.rows[1].rowNumber).toBe(4);
  });

  it('no cuenta ni reporta las líneas en blanco como filas', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\n\n\nJose,Perez\n');
    expect(result.rows).toHaveLength(2);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
  });

  it('marca como inválida una fila con un número de columnas distinto al esperado, sin desalinear las siguientes', () => {
    const result = parseRosterCsv(
      'nombres,apellidos,variante_autorizada\nAna,Ruiz,\nJose\nMaria,Lopez,\n',
    );
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[1].status).toBe('invalid');
    expect(result.rows[1].issues).toContain('La fila no tiene el número de columnas esperado.');
    expect(result.rows[2].status).toBe('valid');
    expect(result.rows[2].fullNameOriginal).toBe('Maria Lopez');
  });

  it('usa la codificación indicada explícitamente cuando se llama sin pasar por importRosterFile', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\n', 'windows-1252');
    expect(result.encodingUsed).toBe('windows-1252');
  });

  it('usa utf-8 por defecto cuando no se indica codificación', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\n');
    expect(result.encodingUsed).toBe('utf-8');
  });

  it('maneja un campo entre comillas con una coma incrustada', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,"Peña, hijo"\n');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].lastNamesRaw).toBe('Peña, hijo');
  });

  it('no descarta silenciosamente una fila con más columnas de las esperadas si tiene contenido real', () => {
    const result = parseRosterCsv('nombres,apellidos\nAna,Ruiz\n,,nota extra\nJose,Perez\n');
    expect(result.rows).toHaveLength(3);
    expect(result.rows[1].status).toBe('invalid');
    expect(result.rows[1].issues).toContain('La fila no tiene el número de columnas esperado.');
  });

  it('devuelve un resultado vacío para un archivo que solo tiene encabezado', () => {
    const result = parseRosterCsv('nombres,apellidos\n');
    expect(result.rows).toHaveLength(0);
    expect(result.validCount).toBe(0);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });
});

describe('importRosterFile', () => {
  it('combina decodificación y parseo de extremo a extremo para un archivo windows-1252', () => {
    const bytes = windows1252Bytes('nombres,apellidos\nMaría José,Peña Ñacato\n');
    const result = importRosterFile(bytes);
    expect(result.encodingUsed).toBe('windows-1252');
    expect(result.rows[0].fullNameNormalized).toBe('maria jose peña ñacato');
  });

  it('bloquea caracteres de reemplazo que indican una decodificación dañada', () => {
    const csv = new TextEncoder().encode('nombres,apellidos\nJos�,Peña\n');

    expect(() => importRosterFile(csv)).toThrow(/caracteres de reemplazo/i);
  });
});

describe('importRosterUpload', () => {
  it('mantiene compatible la importación CSV existente', async () => {
    const result = await importRosterUpload(
      utf8Bytes('nombres,apellidos\nAna,Ruiz\n'),
      'nomina.csv',
    );
    expect(result.fileType).toBe('csv');
    expect(result.encodingUsed).toBe('utf-8');
    expect(result.rows[0].fullNameOriginal).toBe('Ana Ruiz');
  });

  it('lee la primera hoja de un XLSX real con nombres y apellidos separados', async () => {
    const bytes = await xlsxFixture('nomina-separada.xlsx');
    const result = await importRosterUpload(bytes, 'Nómina.xlsx');
    expect(result.fileType).toBe('xlsx');
    expect(result.encodingUsed).toBeNull();
    expect(result.rows[0]).toMatchObject({
      fullNameOriginal: 'María José Peña Ñacato',
      fullNameNormalized: 'maria jose peña ñacato',
      authorizedVariantRaw: 'Ma. José Peña',
      status: 'valid',
    });
  });

  it('acepta una sola columna nombre completo en XLSX', async () => {
    const bytes = await xlsxFixture('nomina-nombre-completo.xlsx');
    const result = await importRosterUpload(bytes, 'nomina.XLSX');
    expect(result.rows[0]).toMatchObject({
      fullNameOriginal: 'Ana Sofía Ruiz Pérez',
      fullNameNormalized: 'ana sofia ruiz perez',
      status: 'valid',
    });
  });

  it('explica los encabezados detectados cuando el formato no coincide', async () => {
    const bytes = await xlsxFixture('nomina-encabezados-invalidos.xlsx');
    await expect(importRosterUpload(bytes, 'nomina.xlsx')).rejects.toThrow(
      /Encontramos: estudiante, curso.*nombres.*apellidos.*nombre completo/i,
    );
  });

  it('rechaza extensiones distintas de CSV y XLSX con un mensaje útil', async () => {
    await expect(importRosterUpload(utf8Bytes('contenido'), 'nomina.xls')).rejects.toThrow(
      /solo se aceptan archivos CSV o XLSX/i,
    );
  });
});
