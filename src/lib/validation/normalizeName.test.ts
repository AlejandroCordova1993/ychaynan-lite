import { describe, expect, it } from 'vitest';
import { containsInvalidNameCharacters, namesMatch, normalizeName } from './normalizeName';

describe('normalizeName', () => {
  it('reproduce los cuatro ejemplos de la guía técnica §10', () => {
    expect(normalizeName('María José Peña Ñacato')).toBe('maria jose peña ñacato');
    expect(normalizeName('MARIA JOSE PEÑA ÑACATO')).toBe('maria jose peña ñacato');
    expect(normalizeName('Maria José Peña Ñacato')).toBe('maria jose peña ñacato');
    expect(normalizeName('Maria Jose Pena Nacato')).toBe('maria jose pena nacato');
  });

  it('nunca convierte ñ en n ni infiere una ñ que no estaba en el original', () => {
    expect(normalizeName('Peña')).toBe('peña');
    expect(normalizeName('Pena')).toBe('pena');
    expect(normalizeName('Peña')).not.toBe(normalizeName('Pena'));
  });

  it('trata ü como u', () => {
    expect(normalizeName('Güemes')).toBe('guemes');
  });

  it('colapsa espacios repetidos y recorta los extremos', () => {
    expect(normalizeName('  JOSÉ   ANDRÉS  MUÑOZ  ')).toBe('jose andres muñoz');
  });

  it('convierte guiones y apóstrofos en separadores simples', () => {
    expect(normalizeName('Maria Fernanda  De-La-Cruz')).toBe('maria fernanda de la cruz');
    expect(normalizeName('Maria Fernanda De la Cruz')).toBe('maria fernanda de la cruz');
  });

  it('elimina puntos y comas que no cambian el nombre', () => {
    expect(normalizeName('J. Andrés Muñoz,')).toBe('j andres muñoz');
  });
});

describe('namesMatch', () => {
  it('coincide con diferencias de mayúsculas y tildes', () => {
    expect(namesMatch('JOSÉ  ANDRÉS MUÑOZ', 'José Andrés Muñoz')).toBe(true);
  });

  it('no hace coincidir Pena con Peña', () => {
    expect(namesMatch('Pena Ruiz', 'Peña Ruiz')).toBe(false);
  });
});

describe('containsInvalidNameCharacters', () => {
  it('detecta dígitos', () => {
    expect(containsInvalidNameCharacters('Ana2 Ruiz')).toBe(true);
  });

  it('acepta nombres sin dígitos ni caracteres de control', () => {
    expect(containsInvalidNameCharacters('María José Peña Ñacato')).toBe(false);
  });
});
