import { describe, expect, it } from 'vitest';
import { accessCodesFileName, buildAccessCodesCsv } from './accessCodesCsv';

const baseRow = {
  fullName: 'Ana Ruiz',
  groupName: '3ro BGU A',
  code: 'ABCD2345',
  state: 'Sin usar',
  link: 'https://ejemplo.test/ychaynan-lite/#/evaluacion/diagnostico-2026',
};

describe('exportación CSV de códigos', () => {
  it('abre en Excel con BOM y con la cabecera acordada', () => {
    const csv = buildAccessCodesCsv([baseRow]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('\r\n')[0]).toBe(
      '﻿Nombre completo,Paralelo,Código,Estado,Enlace de evaluación',
    );
  });

  it('escribe una fila por acceso separando los campos con comas', () => {
    const csv = buildAccessCodesCsv([baseRow]);

    expect(csv.split('\r\n')[1]).toBe(
      'Ana Ruiz,3ro BGU A,ABCD2345,Sin usar,https://ejemplo.test/ychaynan-lite/#/evaluacion/diagnostico-2026',
    );
  });

  it('entrecomilla los valores con comas, comillas o saltos de línea', () => {
    const csv = buildAccessCodesCsv([
      { ...baseRow, fullName: 'Ruiz, Ana "Anita"', groupName: '3ro\nBGU A' },
    ]);

    expect(csv.split('\r\n')[1]).toContain('"Ruiz, Ana ""Anita"""');
    expect(csv).toContain('"3ro\nBGU A"');
  });

  it('neutraliza los valores que una hoja de cálculo interpretaría como fórmula', () => {
    const csv = buildAccessCodesCsv([
      { ...baseRow, fullName: '=HYPERLINK("http://malo.test")' },
      { ...baseRow, fullName: '+2+3' },
      { ...baseRow, fullName: '-2+3' },
      { ...baseRow, fullName: '@SUM(A1)' },
    ]);
    const filas = csv.split('\r\n').slice(1);

    expect(filas[0]).toBe(
      '"\'=HYPERLINK(""http://malo.test"")",3ro BGU A,ABCD2345,Sin usar,https://ejemplo.test/ychaynan-lite/#/evaluacion/diagnostico-2026',
    );
    expect(filas[1].startsWith("'+2+3,")).toBe(true);
    expect(filas[2].startsWith("'-2+3,")).toBe(true);
    expect(filas[3].startsWith("'@SUM(A1),")).toBe(true);
  });

  it('deja el código vacío cuando el acceso ya no debe mostrarlo', () => {
    const csv = buildAccessCodesCsv([{ ...baseRow, code: '' }]);

    expect(csv.split('\r\n')[1]).toBe(
      'Ana Ruiz,3ro BGU A,,Sin usar,https://ejemplo.test/ychaynan-lite/#/evaluacion/diagnostico-2026',
    );
  });

  it('nombra el archivo con el slug de la evaluación', () => {
    expect(accessCodesFileName('diagnostico-2026')).toBe('diagnostico-2026-codigos.csv');
  });
});
