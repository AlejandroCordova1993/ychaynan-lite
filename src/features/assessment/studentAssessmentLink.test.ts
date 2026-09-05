import { describe, expect, it } from 'vitest';
import { buildStudentAssessmentLink } from './studentAssessmentLink';

describe('enlace estudiantil', () => {
  it('funciona en el entorno local', () => {
    expect(buildStudentAssessmentLink('http://localhost:5173', '/', 'diagnostico-2026')).toBe(
      'http://localhost:5173/#/evaluacion/diagnostico-2026',
    );
  });

  it('funciona en GitHub Pages con la base del proyecto', () => {
    expect(
      buildStudentAssessmentLink(
        'https://docente.github.io',
        '/ychaynan-lite/',
        'diagnostico-2026',
      ),
    ).toBe('https://docente.github.io/ychaynan-lite/#/evaluacion/diagnostico-2026');
  });

  it('normaliza una base sin barra final', () => {
    expect(
      buildStudentAssessmentLink('https://docente.github.io', '/ychaynan-lite', 'diagnostico-2026'),
    ).toBe('https://docente.github.io/ychaynan-lite/#/evaluacion/diagnostico-2026');
  });

  it('codifica un slug con caracteres reservados', () => {
    expect(buildStudentAssessmentLink('http://localhost:5173', '/', 'a b/c')).toBe(
      'http://localhost:5173/#/evaluacion/a%20b%2Fc',
    );
  });
});
