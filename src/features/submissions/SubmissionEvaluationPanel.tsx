import { useEffect, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import {
  getSubmissionEvaluation,
  requestSubmissionEvaluation,
  type SubmissionEvaluationView,
} from '../../lib/api/evaluations';
import type { getSubmissionDetail } from '../../lib/api/submissions';
import { getSupabaseClient } from '../../lib/supabase/client';
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

type SubmissionDetail = Awaited<ReturnType<typeof getSubmissionDetail>>;

const CRITERION_LABELS: ReadonlyMap<string, string> = new Map(
  [...CORE_CRITERIA, ...OPTIONAL_MODULES].map(({ id, label }) => [id, label]),
);
const DIMENSION_LABELS = {
  comprension_lectora: 'Comprensión lectora',
  respuesta_razonamiento: 'Respuesta y razonamiento',
  organizacion_discursiva: 'Organización discursiva',
  convenciones_escritura: 'Convenciones de escritura',
} as const;

function evaluationQuestions(detail: SubmissionDetail) {
  return detail.responses.map((response) => ({
    position: response.position,
    prompt: response.prompt,
    instructions: response.instructions,
    responseText: response.originalText,
    wordCount: response.wordCount,
    activeCriteria: response.activeCriteria,
    activeModules: response.activeModules,
    suggestedMinWords: response.suggestedMinWords,
    suggestedMaxWords: response.suggestedMaxWords,
  }));
}

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

function EvaluationResultView({ result }: { result: EvaluationResult }) {
  return (
    <div className="evaluation-result stack--loose stack">
      <Notice tone="warning">
        Resultado provisional; requiere revisión docente antes de usarse para planificar.
      </Notice>
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
  const [evaluation, setEvaluation] = useState<SubmissionEvaluationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSubmissionEvaluation(getSupabaseClient(), submissionId, evaluationQuestions(detail))
      .then((value) => {
        if (active) setEvaluation(value);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        if (active) setError('No pudimos cargar la evaluación de esta entrega.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detail, submissionId]);

  async function evaluate() {
    if (running) return;
    setRunning(true);
    setError(null);
    const client = getSupabaseClient();
    try {
      await requestSubmissionEvaluation(client, submissionId, evaluation?.status === 'failed');
      setEvaluation(
        await getSubmissionEvaluation(client, submissionId, evaluationQuestions(detail)),
      );
    } catch (reason) {
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'No pudimos completar la evaluación.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className="panel evaluation-panel stack--loose stack"
      aria-labelledby="evaluation-title"
    >
      <div className="cluster evaluation-heading">
        <div>
          <p className="mono-label">Uso privado del docente</p>
          <h2 id="evaluation-title">Evaluación con IA</h2>
        </div>
        {(evaluation === null || evaluation.status === 'failed') && !loading && (
          <button
            type="button"
            className="button button--primary"
            disabled={running}
            onClick={() => void evaluate()}
          >
            {running
              ? 'Evaluando…'
              : evaluation?.status === 'failed'
                ? 'Reintentar evaluación con IA'
                : 'Evaluar con IA'}
          </button>
        )}
      </div>
      {loading && <p role="status">Cargando evaluación…</p>}
      {running && (
        <p role="status">Analizando la entrega completa. Esto puede tardar hasta 90 segundos.</p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {evaluation?.status === 'failed' && !running && (
        <Notice tone="error">
          {evaluation.errorMessage ?? 'La evaluación no pudo completarse.'}
        </Notice>
      )}
      {(evaluation?.status === 'pending' || evaluation?.status === 'running') && (
        <Notice tone="info">
          La evaluación está en curso. Recarga la página en unos momentos.
        </Notice>
      )}
      {evaluation?.result && <EvaluationResultView result={evaluation.result} />}
    </section>
  );
}
