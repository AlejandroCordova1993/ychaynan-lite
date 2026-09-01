import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { clearLocalDraft } from './draftStorage';
import { clearSubmissionReceipt, loadSubmissionReceipt } from './submissionReceiptStorage';
import { clearStudentSession } from './studentSessionStorage';

export function SubmissionReceiptScreen({ slug }: { slug?: string }) {
  const params = useParams();
  const assessmentSlug = slug ?? params.slug ?? '';
  const receipt = loadSubmissionReceipt(assessmentSlug);
  const [cleaned, setCleaned] = useState(false);
  if (!receipt) return <Notice tone="warning">No encontramos el recibo en este equipo.</Notice>;
  const clean = () => {
    clearStudentSession(assessmentSlug);
    clearLocalDraft(assessmentSlug);
    clearSubmissionReceipt(assessmentSlug);
    setCleaned(true);
  };
  return (
    <div className="submission-receipt stack--loose stack">
      <PageHeader
        eyebrow="Evaluación diagnóstica"
        title="Entrega recibida"
        lead="Tu docente podrá revisar tu respuesta original."
      />
      <section className="panel stack">
        <p className="mono-label">Comprobante</p>
        <p>
          <strong>Identificador:</strong> {receipt.receiptId}
        </p>
        <p>
          <strong>Fecha de entrega:</strong> {new Date(receipt.submittedAt).toLocaleString('es-EC')}
        </p>
      </section>
      {cleaned ? (
        <Notice tone="success">Este equipo quedó limpio. Ya puedes cerrar esta página.</Notice>
      ) : (
        <button type="button" className="button button--primary" onClick={clean}>
          Finalizar y limpiar este equipo
        </button>
      )}
    </div>
  );
}
