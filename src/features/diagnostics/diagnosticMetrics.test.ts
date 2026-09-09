import { describe, expect, it } from 'vitest';
import type {
  CriterionEvaluation,
  EvaluationLevel,
  EvaluationObservation,
  EvaluationResult,
  ModuleEvaluation,
  QuestionEvaluation,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import { EVALUATION_DIMENSIONS } from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import type { TeacherAdjustment } from '../../lib/api/evaluationReview';
import type {
  DiagnosticEvaluation,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticResponse,
  DiagnosticStudentEntry,
} from './diagnosticModel';
import { computeDiagnosticMetrics } from './diagnosticMetrics';

function makeQuestion(
  position: number,
  activeCriteria: string[],
  activeModules: string[] = [],
): DiagnosticQuestion {
  return {
    questionId: `q${position}`,
    position,
    prompt: `Consigna ${position}`,
    instructions: `Instrucciones ${position}`,
    activeCriteria,
    activeModules,
    suggestedMinWords: null,
    suggestedMaxWords: null,
  };
}

function makeResponses(
  questions: DiagnosticQuestion[],
  omittedPositions: number[] = [],
): DiagnosticResponse[] {
  return questions.map((question) => {
    const omitted = omittedPositions.includes(question.position);
    return {
      questionId: question.questionId,
      position: question.position,
      originalText: omitted ? null : `Respuesta ${question.position} con ñ y tildes.`,
      wordCount: omitted ? 0 : 6,
      omitted,
      submittedAt: omitted ? null : '2026-09-01T09:00:00.000Z',
    };
  });
}

function criterion(
  criterionId: string,
  level: EvaluationLevel,
  extra: Partial<CriterionEvaluation> = {},
): CriterionEvaluation {
  return {
    criterionId,
    level,
    reason: `Razón de ${criterionId}`,
    evidences: [],
    confidence: 0.8,
    review: 'none',
    ...extra,
  };
}

function moduleResult(
  moduleId: string,
  level: EvaluationLevel,
  extra: Partial<ModuleEvaluation> = {},
): ModuleEvaluation {
  return {
    moduleId,
    level,
    reason: `Razón de ${moduleId}`,
    evidences: [],
    confidence: 0.7,
    review: 'none',
    ...extra,
  };
}

function questionResult(
  position: number,
  criteria: CriterionEvaluation[],
  options: { modules?: ModuleEvaluation[]; observations?: EvaluationObservation[] } = {},
): QuestionEvaluation {
  return {
    position,
    criteria,
    modules: options.modules ?? [],
    observations: options.observations ?? [],
    strengths: [],
    priorities: [],
  };
}

function evaluationResult(questionResults: QuestionEvaluation[]): EvaluationResult {
  return {
    questionResults,
    dimensionSummaries: EVALUATION_DIMENSIONS.map((dimension) => ({
      dimension,
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    })),
    globalConfidence: 0.8,
    limitations: [],
  };
}

function makeEvaluation(
  status: SubmissionEvaluationStatus,
  result: EvaluationResult | null,
  extra: Partial<DiagnosticEvaluation> = {},
): DiagnosticEvaluation {
  return {
    id: `eval-${status}`,
    status,
    result,
    confidence: 0.8,
    requestedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:02:00.000Z',
    errorCode: null,
    teacherAdjustments: null,
    teacherNote: null,
    reviewedAt: null,
    contractViolation: null,
    ...extra,
  };
}

function makeStudent(
  studentId: string,
  studentName: string,
  overrides: Partial<DiagnosticStudentEntry> = {},
): DiagnosticStudentEntry {
  return {
    studentId,
    studentName,
    accessState: 'submitted',
    status: 'entregado',
    submissionId: `sub-${studentId}`,
    startedAt: '2026-09-01T08:00:00.000Z',
    submittedAt: '2026-09-01T09:00:00.000Z',
    responses: [],
    evaluation: null,
    ...overrides,
  };
}

function makeReport(
  questions: DiagnosticQuestion[],
  students: DiagnosticStudentEntry[],
): DiagnosticReport {
  return {
    assessment: {
      id: 'assess-1',
      title: 'Diagnóstico inicial',
      status: 'closed',
      openedAt: '2026-08-30T12:00:00.000Z',
    },
    group: { id: 'group-1', name: '3ro BGU A', schoolYear: '2026-2027' },
    questions,
    students,
    loadedAt: '2026-09-08T12:00:00.000Z',
  };
}

function criterionStat(metrics: ReturnType<typeof computeDiagnosticMetrics>, id: string) {
  const stat = metrics.criteria.find((item) => item.id === id);
  if (!stat) throw new Error(`no se encontró el criterio ${id}`);
  return stat;
}

describe('computeDiagnosticMetrics — cobertura (§4.2)', () => {
  it('clasifica cada estudiante en exactamente una categoría de evaluación', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const usable = evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]);
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        accessState: 'issued',
        status: 'esperado',
        submissionId: null,
        startedAt: null,
        submittedAt: null,
        responses: [],
      }),
      makeStudent('b', 'Bruno', {
        accessState: 'active',
        status: 'iniciado',
        submittedAt: null,
        responses: makeResponses(questions),
      }),
      makeStudent('c', 'Carla', { responses: makeResponses(questions) }),
      makeStudent('d', 'Diego', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('pending', null),
      }),
      makeStudent('e', 'Elsa', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('running', null),
      }),
      makeStudent('f', 'Fabián', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('completed', usable),
      }),
      makeStudent('g', 'Gina', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('reviewed', usable, {
          reviewedAt: '2026-09-02T08:00:00.000Z',
          teacherAdjustments: [
            { position: 1, id: 'core.pertinencia', level: 4, reason: 'Corregido.' },
          ],
        }),
      }),
      makeStudent('h', 'Hugo', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('discarded', usable),
      }),
      makeStudent('i', 'Irene', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('failed', null, { errorCode: 'ai_timeout' }),
      }),
    ]);

    const { coverage } = computeDiagnosticMetrics(report);

    expect(coverage.expected).toBe(9);
    expect(coverage.started).toBe(8);
    expect(coverage.submitted).toBe(7);
    expect(coverage.withoutUsableEvaluation).toBe(3);
    expect(coverage.inProgress).toBe(2);
    expect(coverage.provisional).toBe(1);
    expect(coverage.reviewed).toBe(1);
    expect(coverage.discarded).toBe(1);
    expect(coverage.failed).toBe(1);
    expect(
      coverage.withoutUsableEvaluation +
        coverage.inProgress +
        coverage.provisional +
        coverage.reviewed +
        coverage.discarded +
        coverage.failed,
    ).toBe(coverage.expected);
  });

  it('conserva la procedencia de cada estudiante evaluado', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const usable = evaluationResult([questionResult(1, [criterion('core.pertinencia', 3)])]);
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('completed', usable),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('reviewed', usable),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);

    expect(metrics.students[0].source).toBe('provisional_ia');
    expect(metrics.students[1].source).toBe('revisado_docente');
    expect(metrics.students[0].coverageCategory).toBe('provisional');
    expect(metrics.students[1].coverageCategory).toBe('revisada');
  });
});

describe('computeDiagnosticMetrics — promedio del paralelo por criterio (§4.2)', () => {
  it('pondera una vez a cada estudiante aunque el criterio aparezca en varias preguntas', () => {
    const questions = [
      makeQuestion(1, ['core.pertinencia']),
      makeQuestion(2, ['core.pertinencia']),
    ];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 4)]),
            questionResult(2, [criterion('core.pertinencia', 4)]),
          ]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions, [2]),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 1)]),
            questionResult(2, [criterion('core.pertinencia', 'no_aplica')]),
          ]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const stat = criterionStat(metrics, 'core.pertinencia');

    // Media de promedios por estudiante: (4 + 1) / 2 = 2.5.
    expect(stat.average).toBe(2.5);
    // Una media plana de los tres juicios daría (4 + 4 + 1) / 3 = 3: eso sería incorrecto.
    expect(stat.average).not.toBe(3);
    expect(stat.judgments).toBe(3);
    expect(stat.studentsMeasured).toBe(2);
    expect(stat.notApplicable).toBe(1);

    const ana = metrics.students[0].criteria.find((item) => item.id === 'core.pertinencia');
    const bruno = metrics.students[1].criteria.find((item) => item.id === 'core.pertinencia');
    expect(ana?.average).toBe(4);
    expect(ana?.judgments).toBe(2);
    expect(bruno?.average).toBe(1);
    expect(bruno?.judgments).toBe(1);
  });

  it('promedia por dimensión ponderando una vez a cada estudiante', () => {
    const questions = [
      makeQuestion(1, ['core.comprension_explicita']),
      makeQuestion(2, ['core.comprension_explicita']),
    ];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.comprension_explicita', 4)]),
            questionResult(2, [criterion('core.comprension_explicita', 4)]),
          ]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.comprension_explicita', 1)]),
            questionResult(2, [criterion('core.comprension_explicita', 'no_aplica')]),
          ]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const dimension = metrics.dimensions.find((item) => item.dimension === 'comprension_lectora');

    expect(dimension?.average).toBe(2.5);
    expect(dimension?.average).not.toBe(3);
    expect(dimension?.studentsMeasured).toBe(2);
    expect(dimension?.applicableJudgments).toBe(3);
  });
});

describe('computeDiagnosticMetrics — dimensiones por estudiante (§4.2)', () => {
  it('promedia los niveles numéricos de la dimensión y expone los juicios aplicables', () => {
    const questions = [
      makeQuestion(1, [
        'core.comprension_explicita',
        'core.comprension_inferencial',
        'core.lectura_critica',
      ]),
    ];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [
              criterion('core.comprension_explicita', 4),
              criterion('core.comprension_inferencial', 2),
              criterion('core.lectura_critica', 'no_aplica'),
            ]),
          ]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const student = metrics.students[0];
    const lectora = student.dimensions.find((item) => item.dimension === 'comprension_lectora');
    const escritura = student.dimensions.find(
      (item) => item.dimension === 'convenciones_escritura',
    );

    expect(student.dimensions).toHaveLength(4);
    expect(lectora?.average).toBe(3);
    expect(lectora?.applicableJudgments).toBe(2);
    expect(lectora?.notApplicable).toBe(1);
    expect(escritura?.average).toBeNull();
    expect(escritura?.applicableJudgments).toBe(0);
  });
});

describe('computeDiagnosticMetrics — exclusiones que nunca valen cero (§2, §4.2)', () => {
  it('deja el promedio vacío cuando no existe ningún nivel numérico', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions, [1]),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 'no_aplica')])]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const stat = criterionStat(metrics, 'core.pertinencia');
    const student = metrics.students[0];
    const dimension = student.dimensions.find(
      (item) => item.dimension === 'respuesta_razonamiento',
    );

    expect(stat.average).toBeNull();
    expect(stat.average).not.toBe(0);
    expect(Number.isNaN(stat.average as unknown as number)).toBe(false);
    expect(stat.studentsMeasured).toBe(0);
    expect(stat.notApplicable).toBe(1);
    expect(dimension?.average).toBeNull();
    expect(metrics.levelDistribution.totalJudgments).toBe(0);
    expect(metrics.levelDistribution.studentsMeasured).toBe(0);
  });

  it('no deja que descartados, fallidos, omitidos ni no_aplica reduzcan los promedios', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const alto = evaluationResult([questionResult(1, [criterion('core.pertinencia', 4)])]);
    const bajo = evaluationResult([questionResult(1, [criterion('core.pertinencia', 1)])]);
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('completed', alto),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('discarded', bajo),
      }),
      makeStudent('c', 'Carla', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation('failed', bajo),
      }),
      makeStudent('d', 'Diego', {
        responses: makeResponses(questions, [1]),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 'no_aplica')])]),
        ),
      }),
      makeStudent('e', 'Elsa', {
        responses: makeResponses(questions),
        evaluation: null,
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const stat = criterionStat(metrics, 'core.pertinencia');

    expect(stat.average).toBe(4);
    expect(stat.judgments).toBe(1);
    expect(stat.studentsMeasured).toBe(1);
    expect(metrics.levelDistribution.totalJudgments).toBe(1);
    expect(metrics.levelDistribution.studentsMeasured).toBe(1);
    expect(metrics.coverage.expected).toBe(5);
    expect(metrics.coverage.discarded).toBe(1);
    expect(metrics.coverage.failed).toBe(1);
    expect(metrics.coverage.withoutUsableEvaluation).toBe(1);
    expect(metrics.omissions.omittedResponses).toBe(1);
    expect(metrics.omissions.studentsWithOmissions).toBe(1);
    expect(metrics.omissions.answeredResponses).toBe(4);
  });
});

describe('computeDiagnosticMetrics — distribución 1–4 (§4.2)', () => {
  it('expone por separado el conteo de juicios y el de estudiantes', () => {
    const questions = [makeQuestion(1, ['core.cohesion']), makeQuestion(2, ['core.cohesion'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.cohesion', 3)]),
            questionResult(2, [criterion('core.cohesion', 3)]),
          ]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions, [2]),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.cohesion', 2)]),
            questionResult(2, [criterion('core.cohesion', 'no_aplica')]),
          ]),
        ),
      }),
    ]);

    const { levelDistribution } = computeDiagnosticMetrics(report);
    const byLevel = (level: 1 | 2 | 3 | 4) => {
      const entry = levelDistribution.byLevel.find((item) => item.level === level);
      if (!entry) throw new Error(`falta el nivel ${level}`);
      return entry;
    };

    expect(levelDistribution.byLevel.map((item) => item.level)).toEqual([1, 2, 3, 4]);
    expect(byLevel(3).judgments).toBe(2);
    expect(byLevel(3).students).toBe(1);
    expect(byLevel(3).judgments).not.toBe(byLevel(3).students);
    expect(byLevel(2).judgments).toBe(1);
    expect(byLevel(2).students).toBe(1);
    expect(byLevel(1).judgments).toBe(0);
    expect(byLevel(4).judgments).toBe(0);
    expect(levelDistribution.totalJudgments).toBe(3);
    expect(levelDistribution.studentsMeasured).toBe(2);
    expect(levelDistribution.notApplicable).toBe(1);
  });
});

describe('computeDiagnosticMetrics — observaciones frecuentes (§4.2)', () => {
  it('cuenta aparte las observaciones con evidencia pendiente de comprobar', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const observation = (
      fragment: string,
      review: EvaluationObservation['review'],
    ): EvaluationObservation => ({
      code: 'PERT',
      fragment,
      explanation: 'No responde la consigna.',
      severity: 'medium',
      review,
    });
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 3)], {
              observations: [
                observation('primer fragmento', 'none'),
                observation('segundo fragmento', 'needs_evidence_review'),
              ],
            }),
          ]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 2)], {
              observations: [observation('tercer fragmento', 'none')],
            }),
          ]),
        ),
      }),
      makeStudent('c', 'Carla', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'discarded',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 1)], {
              observations: [observation('cuarto fragmento', 'none')],
            }),
          ]),
        ),
      }),
    ]);

    const { observations } = computeDiagnosticMetrics(report);

    expect(observations).toHaveLength(1);
    expect(observations[0].code).toBe('PERT');
    expect(observations[0].severity).toBe('medium');
    expect(observations[0].confirmed).toBe(2);
    expect(observations[0].needsEvidenceReview).toBe(1);
    expect(observations[0].students).toBe(2);
    expect(observations[0]).not.toHaveProperty('total');
  });

  it('cuenta la evidencia pendiente de revisión por criterio', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [
              criterion('core.pertinencia', 3, { review: 'needs_evidence_review' }),
            ]),
          ]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);

    expect(criterionStat(metrics, 'core.pertinencia').pendingEvidenceReview).toBe(1);
  });
});

describe('computeDiagnosticMetrics — errores de contrato (§9)', () => {
  it('señala la entrega afectada y la excluye de los promedios', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 4)])]),
        ),
      }),
      makeStudent('b', 'Bruno', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'reviewed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 1)])]),
          {
            teacherAdjustments: [
              { position: 1, id: 'core.pertinencia', level: 3, reason: 'Uno.' },
              { position: 1, id: 'core.pertinencia', level: 2, reason: 'Duplicado.' },
            ] as unknown as TeacherAdjustment[],
          },
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);

    expect(metrics.contractErrors).toHaveLength(1);
    expect(metrics.contractErrors[0].studentId).toBe('b');
    expect(metrics.contractErrors[0].submissionId).toBe('sub-b');
    expect(metrics.contractErrors[0].code).toBe('adjustment_duplicated');
    expect(metrics.students[1].contractError?.code).toBe('adjustment_duplicated');
    expect(criterionStat(metrics, 'core.pertinencia').average).toBe(4);
    expect(criterionStat(metrics, 'core.pertinencia').studentsMeasured).toBe(1);
    expect(metrics.coverage.withoutUsableEvaluation).toBe(1);
  });
});

describe('computeDiagnosticMetrics — módulos opcionales (§4.2)', () => {
  it('incluye los módulos en criterios y distribución, pero no en las dimensiones', () => {
    const questions = [
      makeQuestion(1, ['core.pertinencia'], ['optional.estructura_argumentativa']),
    ];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'completed',
          evaluationResult([
            questionResult(1, [criterion('core.pertinencia', 3)], {
              modules: [moduleResult('optional.estructura_argumentativa', 1)],
            }),
          ]),
        ),
      }),
    ]);

    const metrics = computeDiagnosticMetrics(report);
    const moduleStat = criterionStat(metrics, 'optional.estructura_argumentativa');

    expect(moduleStat.kind).toBe('module');
    expect(moduleStat.average).toBe(1);
    expect(metrics.levelDistribution.totalJudgments).toBe(2);
    const razonamiento = metrics.dimensions.find(
      (item) => item.dimension === 'respuesta_razonamiento',
    );
    expect(razonamiento?.applicableJudgments).toBe(1);
    expect(razonamiento?.average).toBe(3);
  });
});

describe('computeDiagnosticMetrics — determinismo', () => {
  it('devuelve el mismo resultado en llamadas sucesivas y no muta el reporte', () => {
    const questions = [makeQuestion(1, ['core.pertinencia'])];
    const report = makeReport(questions, [
      makeStudent('a', 'Ana', {
        responses: makeResponses(questions),
        evaluation: makeEvaluation(
          'reviewed',
          evaluationResult([questionResult(1, [criterion('core.pertinencia', 2)])]),
          {
            teacherAdjustments: [
              { position: 1, id: 'core.pertinencia', level: 4, reason: 'Corregido.' },
            ],
          },
        ),
      }),
    ]);
    const before = JSON.parse(JSON.stringify(report));

    const first = computeDiagnosticMetrics(report);
    const second = computeDiagnosticMetrics(report);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(report))).toEqual(before);
    expect(criterionStat(first, 'core.pertinencia').average).toBe(4);
  });
});
