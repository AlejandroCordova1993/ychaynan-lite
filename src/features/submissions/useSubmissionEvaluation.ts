import { useEffect, useState } from 'react';
import {
  getSubmissionEvaluation,
  requestSubmissionEvaluation,
  type SubmissionEvaluationView,
} from '../../lib/api/evaluations';
import type { getSubmissionDetail } from '../../lib/api/submissions';
import { getSupabaseClient } from '../../lib/supabase/client';

export type SubmissionDetail = Awaited<ReturnType<typeof getSubmissionDetail>>;

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

export interface SubmissionEvaluationState {
  evaluation: SubmissionEvaluationView | null;
  loading: boolean;
  running: boolean;
  error: string | null;
  /** Solicita una evaluación IA nueva (o el reintento de una fallida). */
  evaluate: () => Promise<void>;
  /** Vuelve a cargar mostrando el estado de carga habitual. */
  refresh: () => Promise<void>;
  /** Recarga silenciosa tras guardar una revisión docente; propaga el error sin capturarlo. */
  reload: () => Promise<void>;
}

/**
 * Aísla el ciclo de vida de la evaluación IA de una entrega (carga, solicitud,
 * reintento y recarga) del componente de presentación que la muestra.
 */
export function useSubmissionEvaluation(
  detail: SubmissionDetail,
  submissionId: string,
): SubmissionEvaluationState {
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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setEvaluation(
        await getSubmissionEvaluation(
          getSupabaseClient(),
          submissionId,
          evaluationQuestions(detail),
        ),
      );
    } catch {
      setError('No pudimos actualizar la evaluación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    setEvaluation(
      await getSubmissionEvaluation(getSupabaseClient(), submissionId, evaluationQuestions(detail)),
    );
  }

  return { evaluation, loading, running, error, evaluate, refresh, reload };
}
