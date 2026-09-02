import { describe, expect, it } from 'vitest';
import { generationSignature } from './generationSignature';

const base = {
  readingText: 'Una lectura breve sobre el agua.',
  purpose: 'Diagnóstico inicial.',
  questionCount: 3,
  focus: 'balanced' as const,
};

describe('generationSignature', () => {
  it('es determinista para los mismos datos', () => {
    expect(generationSignature(base)).toBe(generationSignature({ ...base }));
  });

  it('cambia si cambia la lectura', () => {
    expect(generationSignature({ ...base, readingText: 'Otra lectura.' })).not.toBe(
      generationSignature(base),
    );
  });

  it('cambia si cambia el propósito', () => {
    expect(generationSignature({ ...base, purpose: 'Otro propósito.' })).not.toBe(
      generationSignature(base),
    );
  });

  it('cambia si cambia la cantidad solicitada', () => {
    expect(generationSignature({ ...base, questionCount: 2 })).not.toBe(generationSignature(base));
  });

  it('cambia si cambia el foco diagnóstico', () => {
    expect(generationSignature({ ...base, focus: 'critical_reasoning' })).not.toBe(
      generationSignature(base),
    );
  });

  it('ignora los espacios de los extremos, igual que la validación del contrato', () => {
    expect(generationSignature({ ...base, readingText: `  ${base.readingText}  ` })).toBe(
      generationSignature(base),
    );
    expect(generationSignature({ ...base, purpose: `\n${base.purpose}\t` })).toBe(
      generationSignature(base),
    );
  });

  it('trata un propósito ausente y uno vacío como el mismo dato', () => {
    expect(generationSignature({ ...base, purpose: undefined })).toBe(
      generationSignature({ ...base, purpose: '   ' }),
    );
  });

  it('no confunde datos distintos que se concatenarían igual', () => {
    expect(generationSignature({ ...base, readingText: 'ab', purpose: 'c' })).not.toBe(
      generationSignature({ ...base, readingText: 'a', purpose: 'bc' }),
    );
  });
});
