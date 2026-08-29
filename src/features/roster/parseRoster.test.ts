import { describe, expect, it } from 'vitest';
import { decodeRosterCsv, importRosterFile, parseRosterCsv } from './parseRoster';

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function windows1252Bytes(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

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
    expect(() => parseRosterCsv('nombre,apellido\nAna,Ruiz\n')).toThrow(/columnas requeridas/);
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
});
