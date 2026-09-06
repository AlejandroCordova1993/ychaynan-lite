import { useEffect, useRef, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { requestSubmissionEvaluation } from '../../lib/api/evaluations';
import { getSupabaseClient } from '../../lib/supabase/client';
import { eligibleBatchJobs, runEvaluationBatch, type BatchJob } from './evaluationBatch';
import type { SubmissionOverviewRow } from '../../lib/api/submissions';

const statusLabels = {
  queued: 'Pendiente',
  running: 'Evaluando',
  completed: 'Evaluado',
  failed: 'Sin confirmar',
  skipped: 'Ya en curso',
};

export function BatchEvaluationPanel({
  rows,
  groupLabel,
  onBusyChange,
  onFinished,
}: {
  rows: SubmissionOverviewRow[];
  groupLabel: string | null;
  onBusyChange: (busy: boolean) => void;
  onFinished: () => Promise<void>;
}) {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const control = useRef({ stopped: false });
  const mounted = useRef(true);
  const active = useRef(false);
  const candidates = eligibleBatchJobs(rows);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      control.current.stopped = true;
    };
  }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  async function start() {
    if (active.current || !groupLabel || !candidates.length) return;
    active.current = true;
    const runControl = { stopped: false };
    control.current = runControl;
    setJobs(candidates);
    setConfirming(false);
    setMessage('');
    setBusy(true);
    onBusyChange(true);
    try {
      await runEvaluationBatch(
        candidates,
        (id, retry) => requestSubmissionEvaluation(getSupabaseClient(), id, retry),
        runControl,
        (job) => {
          if (mounted.current)
            setJobs((current) =>
              current.map((item) => (item.submissionId === job.submissionId ? job : item)),
            );
        },
      );
      if (mounted.current) {
        setMessage(
          runControl.stopped
            ? 'Lote detenido. Los trabajos ya iniciados terminaron; puedes continuar los pendientes.'
            : 'Lote terminado. Los resultados siguen siendo provisionales y requieren revisión docente.',
        );
        try {
          await onFinished();
        } catch {
          setMessage(
            'Los trabajos terminaron, pero no pudimos actualizar la lista. Usa Actualizar respuestas antes de continuar.',
          );
        }
      }
    } finally {
      active.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  const completed = jobs.filter((job) => job.status === 'completed').length;
  const settled = jobs.filter((job) =>
    ['completed', 'failed', 'skipped'].includes(job.status),
  ).length;
  return (
    <section className="panel stack" aria-label="Evaluación del paralelo">
      <h3>Evaluar entregas del paralelo</h3>
      <p>
        {groupLabel
          ? groupLabel + ': ' + candidates.length + ' entregas visibles pendientes o fallidas.'
          : 'Selecciona un paralelo para evaluar sus entregas.'}
      </p>
      <p>
        Cada trabajo se analiza por separado. Los ya evaluados, revisados o descartados se omiten.
      </p>
      <button
        type="button"
        className="button button--primary"
        disabled={busy || !groupLabel || !candidates.length}
        onClick={() => setConfirming(true)}
      >
        Evaluar entregas pendientes
      </button>
      {confirming && !busy && (
        <div className="stack">
          <p>
            Se solicitará evaluación con IA para {candidates.length} trabajos de {groupLabel}. Esta
            acción consume uso de IA.
          </p>
          <button type="button" className="button button--primary" onClick={() => void start()}>
            Confirmar evaluación del paralelo
          </button>
          <button type="button" className="button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </div>
      )}
      {busy && (
        <>
          <p role="status">Evaluando hasta tres trabajos a la vez. Mantén esta pantalla abierta.</p>
          <button
            type="button"
            className="button"
            onClick={() => {
              control.current.stopped = true;
              setMessage('Deteniendo: esperamos a que terminen los trabajos ya iniciados.');
            }}
          >
            Detener después de los trabajos en curso
          </button>
        </>
      )}
      {jobs.length > 0 && (
        <>
          <p role="status">
            {settled} de {jobs.length} procesados; {completed} evaluados.
          </p>
          <progress
            aria-label="Progreso de evaluación del paralelo"
            value={settled}
            max={jobs.length}
          />
          <details>
            <summary>Detalle del lote</summary>
            <ul>
              {jobs.map((job) => (
                <li key={job.submissionId}>
                  {job.studentName}: {statusLabels[job.status]}
                  {job.error ? '. ' + job.error : ''}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      {message && <Notice tone="info">{message}</Notice>}
    </section>
  );
}
