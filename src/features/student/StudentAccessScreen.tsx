import { useState, type FormEvent } from 'react';
import './student.css';
import { useNavigate, useParams } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { validateStudent } from '../../lib/api/studentAssessment';
import { getSupabaseClient } from '../../lib/supabase/client';
import { getStudentFingerprint, saveStudentSession } from './studentSessionStorage';

const GENERIC_ERROR = 'No pudimos validar tus datos. Revisa la información e intenta nuevamente.';

export function StudentAccessScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [personalCode, setPersonalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const session = await validateStudent(getSupabaseClient(), {
        assessmentSlug: slug,
        fullName,
        groupName,
        personalCode,
        fingerprint: getStudentFingerprint(),
      });
      saveStudentSession(slug, session);
      navigate(`/evaluacion/${slug}/responder`, { replace: true });
    } catch (validationError) {
      console.error(validationError);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="student-access stack--loose stack">
      <PageHeader
        eyebrow="Evaluación diagnóstica"
        title="Ingresa a tu evaluación"
        lead="Escribe tus datos tal como aparecen en la lista de tu curso."
      />
      {error && <Notice tone="error">{GENERIC_ERROR}</Notice>}
      <form
        className="panel form student-access__form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="field">
          <label htmlFor="student-full-name">Nombres y apellidos completos</label>
          <input
            id="student-full-name"
            className="input"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="student-group">Paralelo</label>
          <input
            id="student-group"
            className="input"
            autoComplete="off"
            required
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="student-code">Código personal</label>
          <input
            id="student-code"
            className="input access-code-input"
            autoComplete="one-time-code"
            required
            maxLength={8}
            value={personalCode}
            onChange={(event) => setPersonalCode(event.target.value.toUpperCase())}
          />
        </div>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Validando…' : 'Ingresar a la evaluación'}
        </button>
      </form>
    </div>
  );
}
