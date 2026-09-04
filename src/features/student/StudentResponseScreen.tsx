import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  loadStudentAssessment,
  saveStudentDraft,
  type StudentAssessment,
} from '../../lib/api/studentAssessment';
import { submitAssessment } from '../../lib/api/studentSubmission';
import { getSupabaseClient } from '../../lib/supabase/client';
import { loadLocalDraft, saveLocalDraft } from './draftStorage';
import { saveSubmissionReceipt } from './submissionReceiptStorage';
import { loadStudentSession, saveStudentSession } from './studentSessionStorage';

type SyncStatus = 'local' | 'syncing' | 'saved' | 'offline' | 'error';
const STATUS: Record<SyncStatus, string> = {
  local: 'Guardado en este equipo',
  syncing: 'Sincronizando…',
  saved: 'Guardado',
  offline: 'Sin conexión',
  error: 'No se pudo sincronizar',
};

export function StudentResponseScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const session = loadStudentSession(slug);
  const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const draftVersionRef = useRef(session?.draftVersion ?? 0);
  const syncQueueRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<SyncStatus>('local');
  const [conflict, setConflict] = useState<{
    local: Record<string, string>;
    remote: Record<string, string>;
    version: number;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const confirmationDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!session) return;
    loadStudentAssessment(getSupabaseClient(), session)
      .then((result) => {
        setAssessment(result.assessment);
        draftVersionRef.current = result.draftVersion;
        const remote = Object.fromEntries(
          result.responses.map(({ questionId, text }) => [questionId, text]),
        );
        setResponses(loadLocalDraft(slug)?.responses ?? remote);
      })
      .catch((error: unknown) => {
        console.error(error);
        setLoadError(true);
      });
    // La sesión se captura al montar esta ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const dialog = confirmationDialogRef.current;
    if (!reviewOpen || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [reviewOpen]);

  if (!session) return <Navigate to={`/evaluacion/${slug}`} replace />;

  const registerConflict = (
    snapshot: Record<string, string>,
    result: { draftVersion: number; responses: Array<{ questionId: string; text: string }> },
  ) => {
    setConflict({
      local: snapshot,
      remote: Object.fromEntries(
        result.responses.map(({ questionId, text }) => [questionId, text]),
      ),
      version: result.draftVersion,
    });
    setStatus('local');
    setReviewOpen(false);
  };

  const performSync = async (snapshot: Record<string, string>) => {
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    try {
      const result = await saveStudentDraft(getSupabaseClient(), {
        token: session.token,
        clientSubmissionKey: session.clientSubmissionKey,
        expectedVersion: draftVersionRef.current,
        responses: Object.entries(snapshot).map(([questionId, text]) => ({ questionId, text })),
      });
      if (!result.ok) {
        registerConflict(snapshot, result);
        return;
      }
      draftVersionRef.current = result.draftVersion;
      saveStudentSession(slug, { ...session, draftVersion: result.draftVersion });
      setStatus('saved');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const sync = (snapshot: Record<string, string>) => {
    const previous = syncQueueRef.current ?? Promise.resolve();
    const queued = previous.then(() => performSync(snapshot));
    syncQueueRef.current = queued;
    return queued;
  };

  const updateResponse = (questionId: string, text: string) => {
    const next = { ...responses, [questionId]: text };
    setResponses(next);
    saveLocalDraft(slug, next);
    setStatus('local');
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmissionError(null);
    setStatus('syncing');
    let stage: 'saving' | 'submitting' = 'saving';
    try {
      await syncQueueRef.current;
      const client = getSupabaseClient();
      const saved = await saveStudentDraft(client, {
        token: session.token,
        clientSubmissionKey: session.clientSubmissionKey,
        expectedVersion: draftVersionRef.current,
        responses: Object.entries(responses).map(([questionId, text]) => ({ questionId, text })),
      });
      if (!saved.ok) {
        registerConflict(responses, saved);
        return;
      }
      draftVersionRef.current = saved.draftVersion;
      saveStudentSession(slug, { ...session, draftVersion: saved.draftVersion });
      setStatus('saved');
      stage = 'submitting';
      const receipt = await submitAssessment(client, {
        token: session.token,
        clientSubmissionKey: session.clientSubmissionKey,
        expectedVersion: saved.draftVersion,
        confirmed: true,
      });
      saveSubmissionReceipt(slug, receipt);
      navigate(`/evaluacion/${slug}/entregada`, { replace: true });
    } catch (error) {
      console.error(error);
      if (stage === 'saving') {
        setStatus('error');
        setSubmissionError(
          'No pudimos guardar la última versión. Tus respuestas siguen guardadas en este equipo.',
        );
      } else {
        setStatus('saved');
        setSubmissionError(
          'No pudimos confirmar si la entrega se registró. No vuelvas a enviarla todavía; avisa al docente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError)
    return <Notice tone="error">No pudimos cargar la evaluación. Vuelve a ingresar.</Notice>;
  if (!assessment)
    return (
      <p role="status" className="loading">
        Preparando evaluación…
      </p>
    );
  const answered = assessment.questions.filter(
    (question) => (responses[question.id] ?? '').trim().length > 0,
  ).length;

  return (
    <div className="student-response stack--loose stack">
      <PageHeader
        eyebrow="Evaluación diagnóstica"
        title={assessment.title}
        lead="Tu escritura se conserva tal como la redactas."
      />
      <p role="status" className="mono-label">
        {STATUS[status]}
      </p>
      <article className="reading-panel">
        <h2>Lectura</h2>
        <div className="reading-text">{assessment.readingText}</div>
      </article>
      {assessment.questions.map((question) => (
        <section className="panel response-question stack" key={question.id}>
          <p className="mono-label">Pregunta {question.position}</p>
          <h2>{question.prompt}</h2>
          {question.instructions && <p>{question.instructions}</p>}
          <label htmlFor={`response-${question.id}`}>
            Respuesta a la pregunta {question.position}
          </label>
          <textarea
            id={`response-${question.id}`}
            className="textarea"
            rows={10}
            value={responses[question.id] ?? ''}
            onChange={(event) => updateResponse(question.id, event.target.value)}
            onBlur={() => void sync(responses)}
          />
        </section>
      ))}
      <button type="button" className="button button--primary" onClick={() => setReviewOpen(true)}>
        Revisar y entregar
      </button>

      {reviewOpen && (
        <dialog
          ref={confirmationDialogRef}
          className="modal-card stack"
          aria-labelledby="submission-confirm-title"
          aria-modal="true"
          onCancel={() => setReviewOpen(false)}
          onClose={() => setReviewOpen(false)}
        >
          <h2 id="submission-confirm-title">Confirmar entrega</h2>
          <p>
            {answered} de {assessment.questions.length} preguntas respondidas
          </p>
          <p>Después de entregar no podrás modificar tus respuestas.</p>
          {submissionError && <Notice tone="error">{submissionError}</Notice>}
          <div className="cluster">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setReviewOpen(false)}
            >
              Volver a revisar
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={submitting}
              onClick={() => void handleFinalSubmit()}
            >
              {submitting ? 'Entregando…' : 'Confirmar entrega definitiva'}
            </button>
          </div>
        </dialog>
      )}

      {conflict && (
        <section className="panel conflict-panel stack" role="alert">
          <h2>Hay dos versiones del borrador</h2>
          <p>No las fusionaremos automáticamente. Compara antes de elegir.</p>
          {assessment.questions.map((question) => (
            <div className="conflict-grid" key={question.id}>
              <div>
                <h3>En este equipo</h3>
                <pre>{conflict.local[question.id] ?? ''}</pre>
              </div>
              <div>
                <h3>Guardada en línea</h3>
                <pre>{conflict.remote[question.id] ?? ''}</pre>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
