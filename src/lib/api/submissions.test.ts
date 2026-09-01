import { describe, expect, it } from 'vitest';
import { mapAccessState } from './submissions';

describe('mapAccessState', () => {
  it('distingue esperado, iniciado y entregado sin inventar una nota', () => {
    expect(mapAccessState({ access: 'unused', submission: null })).toBe('esperado');
    expect(mapAccessState({ access: 'active', submission: 'in_progress' })).toBe('iniciado');
    expect(mapAccessState({ access: 'submitted', submission: 'submitted' })).toBe('entregado');
    expect(mapAccessState({ access: 'blocked', submission: null })).toBe('bloqueado');
  });
});
