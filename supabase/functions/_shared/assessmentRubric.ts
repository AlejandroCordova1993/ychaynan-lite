export const CORE_CRITERIA = [
  { id: 'core.pertinencia', label: 'Pertinencia y cumplimiento de la consigna' },
  { id: 'core.comprension_explicita', label: 'Comprensión de información explícita' },
  { id: 'core.comprension_inferencial', label: 'Comprensión inferencial' },
  { id: 'core.lectura_critica', label: 'Lectura crítica y valoración' },
  { id: 'core.tesis_posicion', label: 'Idea central, tesis o posición' },
  { id: 'core.evidencia_razonamiento', label: 'Evidencia y razonamiento' },
  { id: 'core.organizacion_coherencia', label: 'Organización y coherencia global' },
  { id: 'core.cohesion', label: 'Cohesión y relaciones entre ideas' },
  { id: 'core.lexico_registro', label: 'Precisión léxica y adecuación del registro' },
  { id: 'core.sintaxis_concordancia', label: 'Construcción sintáctica y concordancia' },
  { id: 'core.ortografia_acentuacion', label: 'Ortografía literal y acentuación' },
  { id: 'core.puntuacion_segmentacion', label: 'Puntuación, segmentación y mayúsculas' },
] as const;

export const OPTIONAL_MODULES = [
  { id: 'optional.proposito_punto_vista', label: 'Propósito, contexto y punto de vista' },
  { id: 'optional.estructura_argumentativa', label: 'Estructura del texto argumentativo' },
] as const;

export const DEFAULT_CRITERIA = ['core.pertinencia', 'core.comprension_explicita'] as const;

export const ACTIVE_CRITERIA_IDS = new Set(CORE_CRITERIA.map(({ id }) => id));
export const ACTIVE_MODULE_IDS = new Set(OPTIONAL_MODULES.map(({ id }) => id));
