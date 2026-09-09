import { describe, expect, it } from 'vitest';
import { escapeField, neutralizeFormula } from './csvEscaping';

describe('neutralizeFormula', () => {
  it.each(['=HYPERLINK("http://malo.test")', '+2+3', '-2+3', '@SUM(A1)'])(
    'antepone un apóstrofo a los valores que empiezan por %s',
    (value) => {
      expect(neutralizeFormula(value)).toBe(`'${value}`);
    },
  );

  it('deja sin cambios un valor que no parece una fórmula', () => {
    expect(neutralizeFormula('Ana Ruiz')).toBe('Ana Ruiz');
  });

  it('no altera una cadena vacía', () => {
    expect(neutralizeFormula('')).toBe('');
  });
});

describe('escapeField', () => {
  it('entrecomilla un valor que contiene una coma', () => {
    expect(escapeField('Ruiz, Ana')).toBe('"Ruiz, Ana"');
  });

  it('entrecomilla y duplica las comillas internas', () => {
    expect(escapeField('Ana "Anita" Ruiz')).toBe('"Ana ""Anita"" Ruiz"');
  });

  it('entrecomilla un valor con salto de línea', () => {
    expect(escapeField('3ro\nBGU A')).toBe('"3ro\nBGU A"');
  });

  it('neutraliza la fórmula antes de decidir si entrecomilla', () => {
    expect(escapeField('=HYPERLINK("http://malo.test")')).toBe(
      '"\'=HYPERLINK(""http://malo.test"")"',
    );
  });

  it('deja pasar sin cambios un valor que no necesita escapado', () => {
    expect(escapeField('Ana Ruiz')).toBe('Ana Ruiz');
  });
});
