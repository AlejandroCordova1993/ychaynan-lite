import { useEffect, useState } from 'react';
import './submissions.css';
import { Link, useParams } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { getSubmissionDetail } from '../../lib/api/submissions';
import { getSupabaseClient } from '../../lib/supabase/client';

export function SubmissionDetailScreen() {
  const { submissionId = '' } = useParams();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSubmissionDetail>> | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    getSubmissionDetail(getSupabaseClient(), submissionId)
      .then(setDetail)
      .catch((reason: unknown) => {
        console.error(reason);
        setError(true);
      });
  }, [submissionId]);
  if (error) return <Notice tone="error">No pudimos cargar esta entrega.</Notice>;
  if (!detail)
    return (
      <p role="status" className="loading">
        Cargando entrega…
      </p>
    );
  return (
    <div className="submission-detail stack--loose stack">
      <Link to="/docente/respuestas" className="back-link">
        ← Volver a respuestas
      </Link>
      <PageHeader
        eyebrow={detail.assessmentTitle}
        title={detail.studentName}
        lead={
          detail.submittedAt
            ? `Entregada el ${new Date(detail.submittedAt).toLocaleString('es-EC')}`
            : 'Borrador en curso'
        }
      />
      <article className="reading-panel">
        <h2>Lectura aplicada</h2>
        <div className="reading-text">{detail.readingText}</div>
      </article>
      {detail.responses.map((response) => (
        <section className="panel submission-response stack" key={response.questionId}>
          <p className="mono-label">Pregunta {response.position}</p>
          <h2>{response.prompt}</h2>
          <pre className="original-response">{response.originalText}</pre>
          <p className="mono-label">{response.wordCount} palabras</p>
        </section>
      ))}
    </div>
  );
}
