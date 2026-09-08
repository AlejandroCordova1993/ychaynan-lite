export const STUDENT_ACCESS_MESSAGES = {
  assessment_not_started: 'La evaluación todavía no comienza. Consulta el horario con tu docente.',
  assessment_closed: 'La evaluación ya no recibe respuestas. Consulta con tu docente.',
  service_unavailable:
    'No pudimos conectar con la evaluación. Intenta nuevamente en unos momentos.',
} as const;

export function publicAccessError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (
    code !== 'assessment_not_started' &&
    code !== 'assessment_closed' &&
    code !== 'service_unavailable'
  )
    return null;
  return { code, message: STUDENT_ACCESS_MESSAGES[code] };
}

export function assessmentAvailability(
  opensAt: string | null,
  closesAt: string | null,
  now = Date.now(),
) {
  if (closesAt && Date.parse(closesAt) <= now) return 'assessment_closed';
  if (opensAt && Date.parse(opensAt) > now) return 'assessment_not_started';
  return 'available';
}
