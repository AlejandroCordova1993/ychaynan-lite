export interface ParsedRubricSource {
  criterionIds: string[];
  observationCodes: string[];
}

const IDENTIFIER_PATTERN = /\*\*Identificador:\*\*\s*`([^`]+)`/g;
const OBSERVATION_CODE_PATTERN = /^\|\s*`([^`]+)`\s*\|/gm;

/**
 * Acota el inventario de observaciones a su propia sección. Sin este recorte,
 * cualquier tabla posterior cuya primera columna use backticks (por ejemplo la
 * del perfil diagnóstico) se colaría como si fuera un código de observación.
 */
function extractObservationSection(markdown: string): string {
  const start = markdown.search(/^## 9\.[^\n]*$/m);
  if (start < 0) {
    // Sin el encabezado esperado no se puede acotar; se devuelve el documento
    // completo para que la comparación estricta contra rubric-v1.json falle de
    // forma visible en lugar de dar un inventario vacío que parezca correcto.
    return markdown;
  }

  const fromHeading = markdown.slice(start);
  // Se busca desde el carácter siguiente para no volver a encontrar el propio
  // encabezado de la sección 9. Los subtítulos `###` no interrumpen el corte.
  const nextHeadingOffset = fromHeading.slice(1).search(/^## /m);

  return nextHeadingOffset < 0 ? fromHeading : fromHeading.slice(0, nextHeadingOffset + 1);
}

export function parseRubricSource(markdown: string): ParsedRubricSource {
  const criterionIds = [...markdown.matchAll(IDENTIFIER_PATTERN)].map((match) => match[1]);
  const observationCodes = [
    ...extractObservationSection(markdown).matchAll(OBSERVATION_CODE_PATTERN),
  ].map((match) => match[1]);

  return { criterionIds, observationCodes };
}
