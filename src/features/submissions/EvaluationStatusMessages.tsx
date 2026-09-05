import { Notice } from '../../components/layout/Notice';
import type { SubmissionEvaluationView } from '../../lib/api/evaluations';

interface EvaluationStatusMessagesProps {
  loading: boolean;
  running: boolean;
  error: string | null;
  evaluation: SubmissionEvaluationView | null;
}

/** Agrupa los avisos transitorios del panel: carga, ejecución, error local y estados del servidor. */
export function EvaluationStatusMessages({
  loading,
  running,
  error,
  evaluation,
}: EvaluationStatusMessagesProps) {
  return (
    <>
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
          La evaluación está en curso. Usa Actualizar evaluación en unos momentos.
        </Notice>
      )}
    </>
  );
}
