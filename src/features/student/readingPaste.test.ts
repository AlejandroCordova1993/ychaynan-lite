import { describe, expect, it } from 'vitest';
import { prepareReadingPaste } from './readingPaste';

const reading =
  'La comunidad aprende cuando conversa.\nEscuchar otras voces permite comprender mejor el problema.';

describe('prepareReadingPaste', () => {
  it('acepta un fragmento continuo de la lectura y lo envuelve en comillas tipográficas', () => {
    expect(prepareReadingPaste('Escuchar otras voces', reading)).toEqual({
      ok: true,
      text: '“Escuchar otras voces”',
    });
  });

  it('tolera diferencias de espacios y saltos de línea al comprobar la fuente', () => {
    expect(prepareReadingPaste('conversa.   Escuchar\notras voces', reading)).toEqual({
      ok: true,
      text: '“conversa.   Escuchar\notras voces”',
    });
  });

  it('evita duplicar comillas cuando el fragmento ya viene entrecomillado', () => {
    expect(prepareReadingPaste('“La comunidad aprende”', reading)).toEqual({
      ok: true,
      text: '“La comunidad aprende”',
    });
  });

  it('rechaza texto que no pertenece íntegramente a la lectura', () => {
    expect(prepareReadingPaste('La comunidad aprende y esta es mi respuesta', reading)).toEqual({
      ok: false,
      reason: 'not_in_reading',
    });
  });

  it('acepta exactamente cuarenta palabras', () => {
    const fortyWords = Array.from({ length: 40 }, (_, index) => `palabra${index + 1}`).join(' ');
    expect(prepareReadingPaste(fortyWords, `Inicio ${fortyWords} final`)).toEqual({
      ok: true,
      text: `“${fortyWords}”`,
    });
  });

  it('rechaza un fragmento de cuarenta y una palabras', () => {
    const fortyOneWords = Array.from({ length: 41 }, (_, index) => `palabra${index + 1}`).join(' ');
    expect(prepareReadingPaste(fortyOneWords, fortyOneWords)).toEqual({
      ok: false,
      reason: 'too_long',
    });
  });
});
