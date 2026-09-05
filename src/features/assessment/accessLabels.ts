import type {
  AccessCodeStatus,
  AccessState,
  SubmissionStatus,
} from '../../lib/api/assessmentAccess';

export const STATE_LABELS: Record<AccessState, string> = {
  unused: 'Sin usar',
  active: 'En curso',
  submitted: 'Entregado',
  blocked: 'Bloqueado',
  revoked: 'Revocado',
};

export const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  none: 'Sin iniciar',
  in_progress: 'En progreso',
  submitted: 'Entregada',
  reopened: 'Reabierta',
};

// El código solo se muestra cuando el servidor pudo reconstruirlo.
export const CODE_PLACEHOLDERS: Record<Exclude<AccessCodeStatus, 'available'>, string> = {
  legacy: 'Formato anterior',
  hidden: 'Sin código',
  unavailable: 'No disponible',
};

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
