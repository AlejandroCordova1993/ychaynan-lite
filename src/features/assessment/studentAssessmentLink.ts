/**
 * El enlace estudiantil se arma con el origen y la base reales del despliegue,
 * de modo que funcione igual en desarrollo local y en GitHub Pages.
 */
export function buildStudentAssessmentLink(origin: string, baseUrl: string, slug: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${origin}${base}#/evaluacion/${encodeURIComponent(slug)}`;
}

export function currentStudentAssessmentLink(slug: string): string {
  return buildStudentAssessmentLink(window.location.origin, import.meta.env.BASE_URL, slug);
}
