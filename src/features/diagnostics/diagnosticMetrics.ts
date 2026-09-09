/**
 * Motor de agregados del resumen diagnóstico (spec §4.2).
 *
 * Puro, síncrono y determinista: sin React, sin Supabase, sin CSV/Excel y sin
 * entrada/salida. Recibe un `DiagnosticReport` ya cargado y validado y devuelve
 * las métricas que consumen por igual la pantalla, el CSV y el libro de Excel;
 * ninguna de esas capas recalcula una regla por su cuenta.
 *
 * Los promedios se devuelven sin redondear ni localizar: el redondeo a dos
 * decimales es trabajo de la capa de presentación.
 */
import {
  CRITERIA_BY_DIMENSION,
  EVALUATION_DIMENSIONS,
  type EvaluationDimension,
  type ObservationSeverity,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { OPTIONAL_MODULES } from '../../../supabase/functions/_shared/assessmentRubric.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import type { SubmissionOverviewStatus } from '../../lib/api/submissions';
import {
  applyEffectiveResult,
  type DiagnosticContractError,
  type DiagnosticReport,
  type EffectiveJudgmentKind,
  type EffectiveSource,
} from './diagnosticModel';

/* ------------------------------------------------------------------ *
 * Tipos de salida
 * ------------------------------------------------------------------ */

/** Categoría de evaluación; cada estudiante cae en exactamente una. */
export type CoverageCategory =
  'sin_evaluacion_utilizable' | 'provisional' | 'revisada' | 'descartada' | 'fallida' | 'en_curso';

export interface CoverageStats {
  /** Estudiantes con acceso a la evaluación en este paralelo. */
  expected: number;
  /** Estudiantes que llegaron a iniciar una entrega (incluye a los entregados). */
  started: number;
  /** Estudiantes con la entrega ya realizada. */
  submitted: number;
  withoutUsableEvaluation: number;
  provisional: number;
  reviewed: number;
  discarded: number;
  failed: number;
  inProgress: number;
}

export interface StudentDimensionStat {
  dimension: EvaluationDimension;
  average: number | null;
  applicableJudgments: number;
  notApplicable: number;
}

export interface StudentCriterionStat {
  id: string;
  kind: EffectiveJudgmentKind;
  average: number | null;
  judgments: number;
  notApplicable: number;
  pendingEvidenceReview: number;
}

export interface StudentMetrics {
  studentId: string;
  studentName: string;
  accessStatus: SubmissionOverviewStatus;
  submissionId: string | null;
  submittedAt: string | null;
  evaluationStatus: SubmissionEvaluationStatus | null;
  coverageCategory: CoverageCategory;
  /** Procedencia del resultado vigente; `null` cuando no hay uno utilizable. */
  source: EffectiveSource | null;
  answeredResponses: number;
  omittedResponses: number;
  /** Juicios efectivos con nivel numérico. */
  judgments: number;
  notApplicable: number;
  dimensions: StudentDimensionStat[];
  criteria: StudentCriterionStat[];
  contractError: DiagnosticContractError | null;
}

export interface GroupDimensionStat {
  dimension: EvaluationDimension;
  /** Media de los promedios por estudiante: cada estudiante pesa una vez. */
  average: number | null;
  studentsMeasured: number;
  applicableJudgments: number;
  notApplicable: number;
}

export interface GroupCriterionStat {
  id: string;
  kind: EffectiveJudgmentKind;
  /** Media de los promedios por estudiante, no media plana de los juicios. */
  average: number | null;
  studentsMeasured: number;
  judgments: number;
  notApplicable: number;
  levelCounts: { 1: number; 2: number; 3: number; 4: number };
  pendingEvidenceReview: number;
}

export interface LevelDistributionEntry {
  level: 1 | 2 | 3 | 4;
  /** Juicios efectivos individuales en ese nivel. */
  judgments: number;
  /** Estudiantes distintos con al menos un juicio en ese nivel. */
  students: number;
}

export interface LevelDistribution {
  byLevel: LevelDistributionEntry[];
  totalJudgments: number;
  studentsMeasured: number;
  notApplicable: number;
}

export interface OmissionStats {
  omittedResponses: number;
  answeredResponses: number;
  studentsWithOmissions: number;
}

/**
 * Frecuencia por código y severidad. Las observaciones marcadas
 * `needs_evidence_review` se cuentan aparte y nunca se suman con las
 * confirmadas en una sola cifra.
 */
export interface ObservationStat {
  code: string;
  severity: ObservationSeverity;
  confirmed: number;
  needsEvidenceReview: number;
  students: number;
}

export interface DiagnosticMetrics {
  assessment: DiagnosticReport['assessment'];
  group: DiagnosticReport['group'];
  loadedAt: string;
  coverage: CoverageStats;
  students: StudentMetrics[];
  dimensions: GroupDimensionStat[];
  criteria: GroupCriterionStat[];
  levelDistribution: LevelDistribution;
  omissions: OmissionStats;
  observations: ObservationStat[];
  /** Entregas que violan el contrato; bloquean la exportación (§9). */
  contractErrors: DiagnosticContractError[];
}

/* ------------------------------------------------------------------ *
 * Implementación
 * ------------------------------------------------------------------ */

const NUMERIC_LEVELS = [1, 2, 3, 4] as const;

const CANONICAL_CRITERIA: readonly string[] = EVALUATION_DIMENSIONS.flatMap(
  (dimension) => CRITERIA_BY_DIMENSION[dimension],
);
const CANONICAL_MODULES: readonly string[] = OPTIONAL_MODULES.map(({ id }) => id);

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

interface JudgmentTally {
  levels: number[];
  notApplicable: number;
  pendingEvidenceReview: number;
}

function emptyTally(): JudgmentTally {
  return { levels: [], notApplicable: 0, pendingEvidenceReview: 0 };
}

interface StudentWork {
  metrics: StudentMetrics;
  tallies: Map<string, JudgmentTally>;
  levelsSeen: Set<number>;
}

export function computeDiagnosticMetrics(report: DiagnosticReport): DiagnosticMetrics {
  const kindById = new Map<string, EffectiveJudgmentKind>();
  for (const question of report.questions) {
    for (const id of question.activeCriteria) kindById.set(id, 'criterion');
    for (const id of question.activeModules) kindById.set(id, 'module');
  }

  const coverage: CoverageStats = {
    expected: report.students.length,
    started: 0,
    submitted: 0,
    withoutUsableEvaluation: 0,
    provisional: 0,
    reviewed: 0,
    discarded: 0,
    failed: 0,
    inProgress: 0,
  };
  const contractErrors: DiagnosticContractError[] = [];
  const observationTallies = new Map<
    string,
    {
      code: string;
      severity: ObservationSeverity;
      confirmed: number;
      needsEvidenceReview: number;
      students: Set<string>;
    }
  >();
  const omissions: OmissionStats = {
    omittedResponses: 0,
    answeredResponses: 0,
    studentsWithOmissions: 0,
  };
  const work: StudentWork[] = [];

  for (const entry of report.students) {
    if (entry.submissionId !== null) coverage.started += 1;
    if (entry.status === 'entregado') coverage.submitted += 1;

    const omittedResponses = entry.responses.filter((response) => response.omitted).length;
    omissions.omittedResponses += omittedResponses;
    omissions.answeredResponses += entry.responses.length - omittedResponses;
    if (omittedResponses > 0) omissions.studentsWithOmissions += 1;

    const outcome = applyEffectiveResult(entry);
    let category: CoverageCategory = 'sin_evaluacion_utilizable';
    let source: EffectiveSource | null = null;
    let contractError: DiagnosticContractError | null = null;
    const tallies = new Map<string, JudgmentTally>();
    const levelsSeen = new Set<number>();
    let judgments = 0;
    let notApplicable = 0;

    if (outcome.status === 'contract_error') {
      contractError = outcome.error;
      contractErrors.push(outcome.error);
    } else if (outcome.status === 'unusable') {
      if (outcome.reason === 'in_progress') category = 'en_curso';
      else if (outcome.reason === 'failed') category = 'fallida';
      else if (outcome.reason === 'discarded') category = 'descartada';
    } else {
      source = outcome.result.source;
      category = source === 'revisado_docente' ? 'revisada' : 'provisional';
      for (const question of outcome.result.questions) {
        for (const item of question.judgments) {
          const kind = kindById.get(item.id) ?? item.kind;
          kindById.set(item.id, kind);
          const tally = tallies.get(item.id) ?? emptyTally();
          if (item.review === 'needs_evidence_review') tally.pendingEvidenceReview += 1;
          if (item.level === 'no_aplica') {
            tally.notApplicable += 1;
            notApplicable += 1;
          } else {
            tally.levels.push(item.level);
            levelsSeen.add(item.level);
            judgments += 1;
          }
          tallies.set(item.id, tally);
        }
        for (const observation of question.observations) {
          const key = `${observation.code} ${observation.severity}`;
          const stat = observationTallies.get(key) ?? {
            code: observation.code,
            severity: observation.severity,
            confirmed: 0,
            needsEvidenceReview: 0,
            students: new Set<string>(),
          };
          if (observation.review === 'needs_evidence_review') stat.needsEvidenceReview += 1;
          else stat.confirmed += 1;
          stat.students.add(entry.studentId);
          observationTallies.set(key, stat);
        }
      }
    }

    coverage[COVERAGE_FIELD[category]] += 1;

    work.push({
      metrics: {
        studentId: entry.studentId,
        studentName: entry.studentName,
        accessStatus: entry.status,
        submissionId: entry.submissionId,
        submittedAt: entry.submittedAt,
        evaluationStatus: entry.evaluation?.status ?? null,
        coverageCategory: category,
        source,
        answeredResponses: entry.responses.length - omittedResponses,
        omittedResponses,
        judgments,
        notApplicable,
        dimensions: [],
        criteria: [],
        contractError,
      },
      tallies,
      levelsSeen,
    });
  }

  // Universo de criterios y módulos, en orden canónico y estable.
  const present = new Set<string>(kindById.keys());
  for (const student of work) for (const id of student.tallies.keys()) present.add(id);
  const ordered: string[] = [
    ...CANONICAL_CRITERIA.filter((id) => present.has(id)),
    ...CANONICAL_MODULES.filter((id) => present.has(id)),
  ];
  const extra = [...present].filter((id) => !ordered.includes(id)).sort();
  ordered.push(...extra);

  for (const student of work) {
    student.metrics.criteria = ordered.map((id) => {
      const tally = student.tallies.get(id);
      return {
        id,
        kind: kindById.get(id) ?? 'criterion',
        average: tally ? mean(tally.levels) : null,
        judgments: tally?.levels.length ?? 0,
        notApplicable: tally?.notApplicable ?? 0,
        pendingEvidenceReview: tally?.pendingEvidenceReview ?? 0,
      };
    });
    student.metrics.dimensions = EVALUATION_DIMENSIONS.map((dimension) => {
      const levels: number[] = [];
      let dimensionNotApplicable = 0;
      for (const id of CRITERIA_BY_DIMENSION[dimension]) {
        const tally = student.tallies.get(id);
        if (!tally) continue;
        levels.push(...tally.levels);
        dimensionNotApplicable += tally.notApplicable;
      }
      return {
        dimension,
        average: mean(levels),
        applicableJudgments: levels.length,
        notApplicable: dimensionNotApplicable,
      };
    });
  }

  const criteria: GroupCriterionStat[] = ordered.map((id) => {
    const studentAverages: number[] = [];
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let judgments = 0;
    let notApplicable = 0;
    let pendingEvidenceReview = 0;
    for (const student of work) {
      const tally = student.tallies.get(id);
      if (!tally) continue;
      notApplicable += tally.notApplicable;
      pendingEvidenceReview += tally.pendingEvidenceReview;
      judgments += tally.levels.length;
      for (const level of tally.levels) levelCounts[level as 1 | 2 | 3 | 4] += 1;
      // Media de los promedios por estudiante: cada estudiante aporta un solo
      // valor aunque el criterio aparezca en varias preguntas (§4.2).
      const studentAverage = mean(tally.levels);
      if (studentAverage !== null) studentAverages.push(studentAverage);
    }
    return {
      id,
      kind: kindById.get(id) ?? 'criterion',
      average: mean(studentAverages),
      studentsMeasured: studentAverages.length,
      judgments,
      notApplicable,
      levelCounts,
      pendingEvidenceReview,
    };
  });

  const dimensions: GroupDimensionStat[] = EVALUATION_DIMENSIONS.map((dimension) => {
    const studentAverages: number[] = [];
    let applicableJudgments = 0;
    let notApplicable = 0;
    for (const student of work) {
      const stat = student.metrics.dimensions.find((item) => item.dimension === dimension);
      if (!stat) continue;
      applicableJudgments += stat.applicableJudgments;
      notApplicable += stat.notApplicable;
      if (stat.average !== null) studentAverages.push(stat.average);
    }
    return {
      dimension,
      average: mean(studentAverages),
      studentsMeasured: studentAverages.length,
      applicableJudgments,
      notApplicable,
    };
  });

  const levelDistribution: LevelDistribution = {
    byLevel: NUMERIC_LEVELS.map((level) => ({
      level,
      judgments: criteria.reduce((total, stat) => total + stat.levelCounts[level], 0),
      students: work.filter((student) => student.levelsSeen.has(level)).length,
    })),
    totalJudgments: work.reduce((total, student) => total + student.metrics.judgments, 0),
    studentsMeasured: work.filter((student) => student.metrics.judgments > 0).length,
    notApplicable: work.reduce((total, student) => total + student.metrics.notApplicable, 0),
  };

  const observations: ObservationStat[] = [...observationTallies.values()]
    .map((stat) => ({
      code: stat.code,
      severity: stat.severity,
      confirmed: stat.confirmed,
      needsEvidenceReview: stat.needsEvidenceReview,
      students: stat.students.size,
    }))
    .sort((a, b) => a.code.localeCompare(b.code, 'es') || a.severity.localeCompare(b.severity));

  return {
    assessment: report.assessment,
    group: report.group,
    loadedAt: report.loadedAt,
    coverage,
    students: work.map((student) => student.metrics),
    dimensions,
    criteria,
    levelDistribution,
    omissions,
    observations,
    contractErrors,
  };
}

const COVERAGE_FIELD: Record<CoverageCategory, keyof CoverageStats> = {
  sin_evaluacion_utilizable: 'withoutUsableEvaluation',
  provisional: 'provisional',
  revisada: 'reviewed',
  descartada: 'discarded',
  fallida: 'failed',
  en_curso: 'inProgress',
};
