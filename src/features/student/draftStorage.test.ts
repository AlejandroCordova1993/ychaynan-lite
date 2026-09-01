import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from './draftStorage';

describe('draftStorage', () => {
  beforeEach(() => localStorage.clear());
  it('conserva saltos, tildes, espacios y errores tal como fueron escritos', () => {
    saveLocalDraft('diag', { q1: '  Él dijo:\n"sí"  ' });
    expect(loadLocalDraft('diag')?.responses.q1).toBe('  Él dijo:\n"sí"  ');
  });
  it('limpia solo el borrador de la evaluación indicada', () => {
    saveLocalDraft('uno', { q1: 'a' });
    saveLocalDraft('dos', { q1: 'b' });
    clearLocalDraft('uno');
    expect(loadLocalDraft('uno')).toBeNull();
    expect(loadLocalDraft('dos')?.responses.q1).toBe('b');
  });
});
