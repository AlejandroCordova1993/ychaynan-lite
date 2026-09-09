/**
 * Serialización CSV del resumen diagnóstico (spec §6.2).
 *
 * Tabla larga: una fila por estudiante, pregunta y criterio/módulo activo en
 * esa pregunta. `computeDiagnosticMetrics` (Task 1) agrega los juicios por
 * criterio a través de todas las preguntas de un estudiante y no conserva la
 * resolución por pregunta que esta tabla necesita, así que este módulo llama
 * directamente a `applyEffectiveResult` por estudiante — la misma función pura
 * que usa el motor de métricas — en vez de volver a interpretar
 * `result_json`/`teacher_adjustments` por su cuenta. `metrics` solo aporta los
 * metadatos ya resueltos de evaluación/paralelo (idénticos a los que muestran
 * el resumen y el Excel), para que las tres salidas queden inequívocamente
 * alineadas.
 */
import type { EvaluationLevel } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { escapeField } from '../../lib/csv/csvEscaping';
import { applyEffectiveResult, type DiagnosticReport } from './diagnosticModel';
import type { DiagnosticMetrics } from './diagnosticMetrics';
import { rubricLabel } from './diagnosticPresentation';

const BOM = '﻿';

const HEADER = [
  'Evaluación',
  'Paralelo',
  'Estudiante',
  'Pregunta',
  'Respuesta original',
  'Omitida',
  'Criterio o módulo',
  'Etiqueta',
  'Nivel original',
  'Nivel efectivo',
  'Fuente',
  'Razón',
  'Confianza',
  'Evidencia pendiente',
  'Códigos de observación',
];

/**
 * Separador dentro de una celda para los códigos de observación de una misma
 * pregunta. `; ` no puede confundirse con la coma que delimita columnas y no
 * dispara el entrecomillado RFC 4180 (a diferencia de una coma real).
 */
const OBSERVATION_CODE_SEPARATOR = '; ';

function levelText(level: EvaluationLevel | undefined): string {
  if (level === undefined) return '';
  return level === 'no_aplica' ? 'no_aplica' : String(level);
}

export function buildDiagnosticCsv(report: DiagnosticReport, metrics: DiagnosticMetrics): string {
  const evaluacion = metrics.assessment.title;
  const paralelo = metrics.group.name;
  const rows: string[] = [HEADER.join(',')];

  for (const student of report.students) {
    const outcome = applyEffectiveResult({
      studentId: student.studentId,
      submissionId: student.submissionId,
      evaluation: student.evaluation,
    });
    const source = outcome.status === 'usable' ? outcome.result.source : null;
    const questionResults = outcome.status === 'usable' ? outcome.result.questions : [];

    for (const question of report.questions) {
      const response = student.responses.find((item) => item.questionId === question.questionId);
      const originalText = response?.originalText ?? '';
      const omitted = response ? response.omitted : true;
      const questionResult = questionResults.find((item) => item.position === question.position);
      const observationCodes = questionResult
        ? questionResult.observations
            .map((observation) => observation.code)
            .join(OBSERVATION_CODE_SEPARATOR)
        : '';

      const targets = [
        ...question.activeCriteria.map((id) => ({ id })),
        ...question.activeModules.map((id) => ({ id })),
      ];

      for (const { id } of targets) {
        const judgment = questionResult?.judgments.find((item) => item.id === id);

        rows.push(
          [
            evaluacion,
            paralelo,
            student.studentName,
            String(question.position),
            originalText,
            omitted ? 'Sí' : 'No',
            id,
            rubricLabel(id),
            levelText(judgment?.originalLevel),
            levelText(judgment?.level),
            source ?? '',
            judgment?.reason ?? '',
            judgment ? String(judgment.confidence) : '',
            judgment ? (judgment.review === 'needs_evidence_review' ? 'Sí' : 'No') : '',
            observationCodes,
          ]
            .map(escapeField)
            .join(','),
        );
      }
    }
  }

  return `${BOM}${rows.join('\r\n')}\r\n`;
}

/**
 * Convierte un segmento en algo seguro para un nombre de archivo en Windows y
 * macOS: minúsculas, sin tildes/ñ (se normalizan a su base ASCII), sin
 * espacios ni símbolos — cualquier corrida de caracteres no alfanuméricos se
 * colapsa en un solo guion, sin guiones al inicio o al final.
 */
function sanitizeFileNameSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `yachaynan-diagnostico_<evaluacion>_<paralelo>_<fecha>.<extension>`, con
 * cada segmento saneado. `extension` es un parámetro (no `.csv` fijo) porque
 * la Task 5 (Excel) reutiliza esta misma función para nombrar el `.xlsx`.
 */
export function diagnosticFileName(
  evaluacionSlugOrTitle: string,
  groupName: string,
  cutoffDate: string,
  extension: 'csv' | 'xlsx',
): string {
  const evaluacion = sanitizeFileNameSegment(evaluacionSlugOrTitle);
  const paralelo = sanitizeFileNameSegment(groupName);
  const fecha = sanitizeFileNameSegment(cutoffDate);
  return `yachaynan-diagnostico_${evaluacion}_${paralelo}_${fecha}.${extension}`;
}
