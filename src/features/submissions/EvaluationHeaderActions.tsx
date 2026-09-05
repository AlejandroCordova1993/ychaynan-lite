import type { SubmissionEvaluationView } from '../../lib/api/evaluations';

interface EvaluationHeaderActionsProps {
  evaluation: SubmissionEvaluationView | null;
  loading: boolean;
  running: boolean;
  onEvaluate: () => void;
}

/** Encabezado del panel: título privado y el único botón para pedir o reintentar la evaluación IA. */
export function EvaluationHeaderActions({
  evaluation,
  loading,
  running,
  onEvaluate,
}: EvaluationHeaderActionsProps) {
  const canRequestEvaluation = (evaluation === null || evaluation.status === 'failed') && !loading;

  return (
    <div className="cluster evaluation-heading">
      <div>
        <p className="mono-label">Uso privado del docente</p>
        <h2 id="evaluation-title">Evaluación con IA</h2>
      </div>
      {canRequestEvaluation && (
        <button
          type="button"
          className="button button--primary"
          disabled={running}
          onClick={onEvaluate}
        >
          {running
            ? 'Evaluando…'
            : evaluation?.status === 'failed'
              ? 'Reintentar evaluación con IA'
              : 'Evaluar con IA'}
        </button>
      )}
    </div>
  );
}
