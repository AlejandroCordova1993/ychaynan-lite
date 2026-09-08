import { describe, expect, it } from 'vitest';
import { assessmentAvailability, publicAccessError } from './studentAccessErrors';
describe('ventana de ingreso', () => {
  const now = Date.parse('2026-09-09T05:00:00Z');
  it('admite el instante de apertura y rechaza el de cierre', () => {
    expect(assessmentAvailability('2026-09-09T05:00:00Z', null, now)).toBe('available');
    expect(assessmentAvailability(null, '2026-09-09T05:00:00Z', now)).toBe('assessment_closed');
    expect(assessmentAvailability('2026-09-09T05:00:01Z', null, now)).toBe(
      'assessment_not_started',
    );
    expect(assessmentAvailability(null, null, now)).toBe('available');
  });
  it('solo acepta códigos públicos explícitos, nunca detalles arbitrarios', () => {
    expect(publicAccessError({ code: 'student_not_found', message: 'Ana' })).toBeNull();
    expect(publicAccessError({ code: 'service_unavailable', message: 'SQL secreto' })).toEqual({
      code: 'service_unavailable',
      message: 'No pudimos conectar con la evaluación. Intenta nuevamente en unos momentos.',
    });
  });
});
