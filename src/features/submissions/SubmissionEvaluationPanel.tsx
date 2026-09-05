import { TeacherEvaluationReview } from './TeacherEvaluationReview';
import { EvaluationHeaderActions } from './EvaluationHeaderActions';
import { EvaluationStatusMessages } from './EvaluationStatusMessages';
import { useSubmissionEvaluation, type SubmissionDetail } from './useSubmissionEvaluation';
import { Notice } from '../../components/layout/Notice';
import {
  CORE_CRITERIA,
  OPTIONAL_MODULES,
} from '../../../supabase/functions/_shared/assessmentRubric';
import type {
  CriterionEvaluation,
  EvaluationResult,
  ModuleEvaluation,
  QuestionEvaluation,
} from '../../../supabase/functions/_shared/aiEvaluation';

const CRITERION_LABELS: ReadonlyMap<string, string> = new Map(
  [...CORE_CRITERIA, ...OPTIONAL_MODULES].map(({ id, label }) => [id, label]),
);
const DIMENSION_LABELS = {
  comprension_lectora: 'Comprensión lectora',
  respuesta_razonamiento: 'Respuesta y razonamiento',
  organizacion_discursiva: 'Organización discursiva',
  convenciones_escritura: 'Convenciones de escritura',
} as const;

function levelLabel(level: number | 'no_aplica') {
  return level === 'no_aplica' ? 'No aplica' : `Nivel ${level} de 4`;
}

function CriterionResult({ criterion }: { criterion: CriterionEvaluation | ModuleEvaluation }) {
  const id = 'criterionId' in criterion ? criterion.criterionId : criterion.moduleId;
  return (
    <article className="criterion-result stack">
      <div className="cluster">
        <h4>{CRITERION_LABELS.get(id) ?? id}</h4>
        <span className="status-badge">{levelLabel(criterion.level)}</span>
      </div>
      <p>{criterion.reason}</p>
      {criterion.evidences.length > 0 && (
        <div>
          <p className="mono-label">Evidencias</p>
          <ul>
            {criterion.evidences.map((evidence) => (
              <li key={evidence}>“{evidence}”</li>
            ))}
          </ul>
        </div>
      )}
      {criterion.review === 'needs_evidence_review' && (
        <p className="review-flag">Verificar la evidencia antes de aprobar.</p>
      )}
    </article>
  );
}

function QuestionResult({ question }: { question: QuestionEvaluation }) {
  return (
    <section className="evaluation-question stack">
      <h3>Pregunta {question.position}</h3>
      {[...question.criteria, ...question.modules].map((criterion) => {
        const id = 'criterionId' in criterion ? criterion.criterionId : criterion.moduleId;
        return <CriterionResult criterion={criterion} key={id} />;
      })}
      {question.strengths.length > 0 && (
        <div>
          <h4>Fortalezas</h4>
          <ul>
            {question.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {question.priorities.length > 0 && (
        <div>
          <h4>Prioridades</h4>
          <ul>
            {question.priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EvaluationResultView({
  result,
  provisional,
}: {
  result: EvaluationResult;
  provisional: boolean;
}) {
  return (
    <div className="evaluation-result stack--loose stack">
      {provisional && (
        <Notice tone="warning">
          Resultado provisional; requiere revisión docente antes de usarse para planificar.
        </Notice>
      )}
      <h3>Propuesta original de IA</h3>
      <p className="evaluation-confidence">
        Confianza global: {Math.round(result.globalConfidence * 100)}%
      </p>
      <section className="stack">
        <h3>Resumen por dimensiones</h3>
        <div className="dimension-grid">
          {result.dimensionSummaries.map((dimension) => (
            <article className="dimension-card" key={dimension.dimension}>
              <h4>{DIMENSION_LABELS[dimension.dimension]}</h4>
              <p>
                {dimension.averageLevel === null
                  ? 'Sin criterios aplicables'
                  : `${dimension.averageLevel.toFixed(1)} de 4`}
              </p>
              <p className="mono-label">
                {dimension.scoredCriteria} de {dimension.applicableCriteria} criterios
              </p>
            </article>
          ))}
        </div>
      </section>
      {result.questionResults.map((question) => (
        <QuestionResult question={question} key={question.position} />
      ))}
      {result.limitations.length > 0 && (
        <section>
          <h3>Limitaciones del análisis</h3>
          <ul>
            {result.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function SubmissionEvaluationPanel({
  detail,
  submissionId,
}: {
  detail: SubmissionDetail;
  submissionId: string;
}) {
  const { evaluation, loading, running, error, evaluate, refresh, reload } =
    useSubmissionEvaluation(detail, submissionId);

  return (
    <section
      className="panel evaluation-panel stack--loose stack"
      aria-labelledby="evaluation-title"
    >
      <EvaluationHeaderActions
        evaluation={evaluation}
        loading={loading}
        running={running}
        onEvaluate={() => void evaluate()}
      />
      <button
        type="button"
        className="button"
        disabled={loading || running}
        onClick={() => void refresh()}
      >
        Actualizar evaluación
      </button>
      <EvaluationStatusMessages
        loading={loading}
        running={running}
        error={error}
        evaluation={evaluation}
      />
      {evaluation?.result && (
        <>
          <TeacherEvaluationReview
            key={evaluation.id + evaluation.status}
            evaluation={evaluation}
            onSaved={reload}
          />
          <EvaluationResultView
            result={evaluation.result}
            provisional={evaluation.status === 'completed'}
          />
        </>
      )}
    </section>
  );
}
