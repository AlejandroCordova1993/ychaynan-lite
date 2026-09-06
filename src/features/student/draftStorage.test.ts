import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from './draftStorage';

describe('draftStorage', () => {
  beforeEach(() => localStorage.clear());
  it('conserva saltos, tildes, espacios y errores tal como fueron escritos', () => {
    saveLocalDraft('diag', 'sub-1', 3, { q1: '  Él dijo:\n"sí"  ' });
    expect(loadLocalDraft('diag', 'sub-1')?.responses.q1).toBe('  Él dijo:\n"sí"  ');
    expect(loadLocalDraft('diag', 'sub-1')?.draftVersion).toBe(3);
  });
  it('aísla y limpia el borrador por entrega, aunque compartan evaluación', () => {
    saveLocalDraft('diag', 'sub-1', 0, { q1: 'a' });
    saveLocalDraft('diag', 'sub-2', 0, { q1: 'b' });
    clearLocalDraft('diag', 'sub-1');
    expect(loadLocalDraft('diag', 'sub-1')).toBeNull();
    expect(loadLocalDraft('diag', 'sub-2')?.responses.q1).toBe('b');
  });
  it('ignora el formato heredado que no identifica una entrega', () => {
    localStorage.setItem(
      'ychaynan-lite:v1:draft:diag',
      JSON.stringify({ responses: { q1: 'ajeno' }, savedAt: new Date().toISOString() }),
    );
    expect(loadLocalDraft('diag', 'sub-1')).toBeNull();
  });
});
