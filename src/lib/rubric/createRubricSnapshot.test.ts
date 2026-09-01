import rubric from '../../../rubric-v1.json';
import { describe, expect, it } from 'vitest';
import { createRubricSnapshot } from './createRubricSnapshot';

describe('createRubricSnapshot', () => {
  it('produce el mismo SHA-256 cuando solo cambia el orden de las claves', async () => {
    const first = await createRubricSnapshot({ schemaVersion: '1.0', nested: { b: 2, a: 1 } });
    const second = await createRubricSnapshot({ nested: { a: 1, b: 2 }, schemaVersion: '1.0' });

    expect(first.hash).toBe(second.hash);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produce otro hash cuando cambia el contenido', async () => {
    const first = await createRubricSnapshot({ schemaVersion: '1.0', value: 'uno' });
    const second = await createRubricSnapshot({ schemaVersion: '1.0', value: 'dos' });

    expect(first.hash).not.toBe(second.hash);
  });

  it('conserva la versión y una copia canónica de la rúbrica operativa', async () => {
    const result = await createRubricSnapshot(rubric);

    expect(result.schemaVersion).toBe('1.0');
    expect(result.snapshot).toEqual(rubric);
    expect(result.snapshot).not.toBe(rubric);
  });
});
