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
import { StudentQuestionResponse } from './StudentQuestionResponse';
import {
  loadStudentSession,
  saveStudentSession,
  loadPendingSubmission,
  savePendingSubmission,
  clearPendingSubmission,
} from './studentSessionStorage';

type SyncStatus = 'local' | 'syncing' | 'saved' | 'offline' | 'error';
const STATUS: Record<SyncStatus, string> = {
  local: 'Guardado en este equipo',
  syncing: 'Sincronizando…',
  saved: 'Borrador guardado en la nube',
  offline: 'Sin conexión',
  error: 'No se pudo sincronizar',
};

export function StudentResponseScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [pendingSubmission, setPendingSubmission] = useState(() => loadPendingSubmission(slug));
  const session = pendingSubmission ?? loadStudentSession(slug);
  const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const responsesRef = useRef<Record<string, string>>({});
  const localRevisionRef = useRef(0);
  const draftVersionRef = useRef(session?.draftVersion ?? 0);
  const syncQueueRef = useRef<Promise<void> | null>(null);
  const savingDraftRef = useRef(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const conflictBlockedRef = useRef(false);
  const [status, setStatus] = useState<SyncStatus>('local');
  const [conflict, setConflict] = useState<{
    local: Record<string, string>;
    remote: Record<string, string>;
    version: number;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const confirmationDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!session || loadPendingSubmission(slug)) return;
    loadStudentAssessment(getSupabaseClient(), session)
      .then((result) => {
        setAssessment(result.assessment);
        const remote = Object.fromEntries(
          result.responses.map(({ questionId, text }) => [questionId, text]),
        );
        const local = loadLocalDraft(slug, session.submissionId);
        draftVersionRef.current = result.draftVersion;
        if (!local) {
          responsesRef.current = remote;
          setResponses(remote);
          return;
        }
        if (local.draftVersion === result.draftVersion) {
          responsesRef.current = local.responses;
          setResponses(local.responses);
          return;
        }
        if (JSON.stringify(local.responses) === JSON.stringify(remote)) {
          responsesRef.current = remote;
          setResponses(remote);
          saveLocalDraft(slug, session.submissionId, result.draftVersion, remote);
          return;
        }
        responsesRef.current = remote;
        setResponses(remote);
        conflictBlockedRef.current = true;
        setConflict({ local: local.responses, remote, version: result.draftVersion });
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
    conflictBlockedRef.current = true;
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

  const performSync = async (snapshot: Record<string, string>, localRevision: number) => {
    if (loadPendingSubmission(slug) || conflictBlockedRef.current) return;
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
        registerConflict(responsesRef.current, result);
        return;
      }
      draftVersionRef.current = result.draftVersion;
      saveStudentSession(slug, { ...session, draftVersion: result.draftVersion });
      const isCurrentRevision = localRevision === localRevisionRef.current;
      saveLocalDraft(
        slug,
        session.submissionId,
        result.draftVersion,
        isCurrentRevision ? snapshot : responsesRef.current,
      );
      setStatus(isCurrentRevision ? 'saved' : 'local');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const sync = (snapshot: Record<string, string>) => {
    const localRevision = localRevisionRef.current;
    const previous = syncQueueRef.current ?? Promise.resolve();
    const queued = previous.then(() => performSync(snapshot, localRevision));
    syncQueueRef.current = queued;
    return queued;
  };

  const updateResponse = (questionId: string, text: string) => {
    const next = { ...responses, [questionId]: text };
    localRevisionRef.current += 1;
    responsesRef.current = next;
    setResponses(next);
    saveLocalDraft(slug, session.submissionId, draftVersionRef.current, next);
    setStatus('local');
  };

  const handleSaveDraft = async () => {
    if (savingDraftRef.current || submittingRef.current || conflictBlockedRef.current) return;
    savingDraftRef.current = true;
    setSavingDraft(true);
    try {
      await sync(responsesRef.current);
    } finally {
      savingDraftRef.current = false;
      setSavingDraft(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      const pending = { ...session, draftVersion: saved.draftVersion };
      savePendingSubmission(slug, pending);
      setPendingSubmission(pending);
      stage = 'submitting';
      const receipt = await submitAssessment(client, {
        token: session.token,
        clientSubmissionKey: session.clientSubmissionKey,
        expectedVersion: saved.draftVersion,
        confirmed: true,
      });
      saveSubmissionReceipt(slug, receipt);
      clearPendingSubmission(slug);
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
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const recoverSubmission = async () => {
    if (!pendingSubmission || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const receipt = await submitAssessment(getSupabaseClient(), {
        token: pendingSubmission.token,
        clientSubmissionKey: pendingSubmission.clientSubmissionKey,
        expectedVersion: pendingSubmission.draftVersion,
        confirmed: true,
      });
      saveSubmissionReceipt(slug, receipt);
      clearPendingSubmission(slug);
      navigate(`/evaluacion/${slug}/entregada`, { replace: true });
    } catch {
      setSubmissionError(
        'No pudimos confirmar si la entrega se registró. Comprueba tu conexión y vuelve a recuperar la confirmación; si persiste, avisa al docente.',
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (pendingSubmission)
    return (
      <section className="panel stack" aria-labelledby="pending-submission-title">
        <h1 id="pending-submission-title">Confirmación de entrega pendiente</h1>
        <Notice tone="warning">
          {submissionError ??
            'La entrega está pendiente de confirmación. Tus respuestas no se modificarán.'}
        </Notice>
        <button
          type="button"
          className="button button--primary"
          disabled={submitting}
          onClick={() => void recoverSubmission()}
        >
          {submitting ? 'Confirmando…' : 'Recuperar confirmación de entrega'}
        </button>
      </section>
    );

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
      <p className="field-hint">
        Tu escritura se conserva automáticamente en este navegador. Pulsa Guardar borrador para
        guardar una copia en la nube sin entregar. Si cambias de dispositivo o borras los datos del
        navegador, solo podrás recuperar la última copia guardada en la nube. Al confirmar la
        entrega se enviarán todas tus respuestas.
      </p>
      {assessment.generalInstructions && (
        <section className="panel stack" aria-labelledby="general-instructions-title">
          <h2 id="general-instructions-title">Instrucciones generales</h2>
          <p>{assessment.generalInstructions}</p>
        </section>
      )}
      {assessment.closesAt && (
        <p className="field-hint">
          Fecha de cierre: {new Date(assessment.closesAt).toLocaleString('es-EC')}
        </p>
      )}
      <article className="reading-panel">
        <h2>Lectura</h2>
        <div className="reading-text">{assessment.readingText}</div>
      </article>
      {assessment.questions.map((question) => (
        <StudentQuestionResponse
          key={question.id}
          question={question}
          response={responses[question.id] ?? ''}
          readingText={assessment.readingText}
          pastePolicy={assessment.pastePolicy}
          disabled={submitting || Boolean(conflict)}
          onChange={(text) => updateResponse(question.id, text)}
        />
      ))}
      <button
        type="button"
        className="button button--secondary"
        disabled={savingDraft || submitting || Boolean(conflict)}
        onClick={() => void handleSaveDraft()}
      >
        {savingDraft ? 'Guardando borrador…' : 'Guardar borrador'}
      </button>
      <button
        type="button"
        className="button button--primary"
        disabled={submitting || Boolean(conflict)}
        onClick={() => setReviewOpen(true)}
      >
        Revisar y entregar
      </button>

      {reviewOpen && (
        <dialog
          ref={confirmationDialogRef}
          className="modal-card stack"
          aria-labelledby="submission-confirm-title"
          aria-modal="true"
          onCancel={(event) => {
            if (submittingRef.current) event.preventDefault();
            else setReviewOpen(false);
          }}
          onClose={() => {
            if (!submittingRef.current) setReviewOpen(false);
          }}
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
              disabled={submitting}
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
          <div className="cluster">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                const selected = conflict.local;
                conflictBlockedRef.current = false;
                draftVersionRef.current = conflict.version;
                responsesRef.current = selected;
                setResponses(selected);
                setConflict(null);
                saveLocalDraft(slug, session.submissionId, conflict.version, selected);
                localRevisionRef.current += 1;
                setStatus('local');
              }}
            >
              Conservar versión de este equipo
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                conflictBlockedRef.current = false;
                draftVersionRef.current = conflict.version;
                localRevisionRef.current += 1;
                responsesRef.current = conflict.remote;
                setResponses(conflict.remote);
                setConflict(null);
                saveLocalDraft(slug, session.submissionId, conflict.version, conflict.remote);
                setStatus('saved');
              }}
            >
              Usar versión guardada en línea
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
