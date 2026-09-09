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
import {
  applyEffectiveResult,
  type DiagnosticReport,
  type EffectiveJudgmentKind,
  type EffectiveSource,
} from './diagnosticModel';
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

function levelText(level: EvaluationLevel | null): string {
  if (level === null) return '';
  return level === 'no_aplica' ? 'no_aplica' : String(level);
}

/**
 * Una fila de la tabla larga «estudiante × pregunta × criterio/módulo activo»,
 * ya resuelta con `applyEffectiveResult` y con las etiquetas de rúbrica
 * compartidas. Los campos que dependen de un resultado utilizable son `null`
 * cuando no lo hay: nunca cero, nunca un nivel inventado (§4.2).
 */
export interface DiagnosticJudgmentRow {
  studentId: string;
  studentName: string;
  questionId: string;
  position: number;
  prompt: string;
  /** Respuesta original literal; nunca se recorta ni se sintetiza. */
  originalText: string;
  omitted: boolean;
  /** Identificador del criterio o módulo activo en esa pregunta. */
  id: string;
  label: string;
  kind: EffectiveJudgmentKind;
  originalLevel: EvaluationLevel | null;
  level: EvaluationLevel | null;
  source: EffectiveSource | null;
  reason: string | null;
  confidence: number | null;
  pendingEvidenceReview: boolean | null;
  /** Códigos de observación de esa pregunta, en el orden que trajo la IA. */
  observationCodes: string[];
}

/**
 * Fuente única de «qué es una fila» para el CSV (§6.2) y para la hoja
 * `Criterios` del libro de Excel (§6.1). Ambos exportadores consumen esta
 * misma función para que no puedan divergir: si un día cambia el universo de
 * filas, cambia en un solo lugar.
 */
export function buildDiagnosticJudgmentRows(report: DiagnosticReport): DiagnosticJudgmentRow[] {
  const rows: DiagnosticJudgmentRow[] = [];

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
        ? questionResult.observations.map((observation) => observation.code)
        : [];

      const targets: { id: string; kind: EffectiveJudgmentKind }[] = [
        ...question.activeCriteria.map((id) => ({ id, kind: 'criterion' as const })),
        ...question.activeModules.map((id) => ({ id, kind: 'module' as const })),
      ];

      for (const { id, kind } of targets) {
        const judgment = questionResult?.judgments.find((item) => item.id === id);
        rows.push({
          studentId: student.studentId,
          studentName: student.studentName,
          questionId: question.questionId,
          position: question.position,
          prompt: question.prompt,
          originalText,
          omitted,
          id,
          label: rubricLabel(id),
          kind: judgment?.kind ?? kind,
          originalLevel: judgment?.originalLevel ?? null,
          level: judgment?.level ?? null,
          source,
          reason: judgment?.reason ?? null,
          confidence: judgment?.confidence ?? null,
          pendingEvidenceReview: judgment ? judgment.review === 'needs_evidence_review' : null,
          observationCodes,
        });
      }
    }
  }

  return rows;
}

export function buildDiagnosticCsv(report: DiagnosticReport, metrics: DiagnosticMetrics): string {
  const evaluacion = metrics.assessment.title;
  const paralelo = metrics.group.name;
  const rows: string[] = [HEADER.join(',')];

  for (const row of buildDiagnosticJudgmentRows(report)) {
    rows.push(
      [
        evaluacion,
        paralelo,
        row.studentName,
        String(row.position),
        row.originalText,
        row.omitted ? 'Sí' : 'No',
        row.id,
        row.label,
        levelText(row.originalLevel),
        levelText(row.level),
        row.source ?? '',
        row.reason ?? '',
        row.confidence === null ? '' : String(row.confidence),
        row.pendingEvidenceReview === null ? '' : row.pendingEvidenceReview ? 'Sí' : 'No',
        row.observationCodes.join(OBSERVATION_CODE_SEPARATOR),
      ]
        .map(escapeField)
        .join(','),
    );
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
