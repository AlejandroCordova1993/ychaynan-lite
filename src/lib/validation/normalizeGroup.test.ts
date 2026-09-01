import { describe, expect, it } from 'vitest';
import { normalizeGroup } from './normalizeGroup';

describe('normalizeGroup', () => {
  it('normaliza formato, mayúsculas y tildes vocálicas', () => {
    expect(normalizeGroup(' 3RO B.G.U. Á ')).toBe('3ro b g u a');
  });

  it('conserva la diferencia entre ñ y n', () => {
    expect(normalizeGroup('Año A')).not.toBe(normalizeGroup('Ano A'));
  });
});
