import { useState } from 'react';
import type { SubmissionEvaluationView } from '../../lib/api/evaluations';
import {
  adjustmentsSchema,
  reviewEvaluation,
  type TeacherAdjustment,
} from '../../lib/api/evaluationReview';
import { getSupabaseClient } from '../../lib/supabase/client';
import {
  CORE_CRITERIA,
  OPTIONAL_MODULES,
} from '../../../supabase/functions/_shared/assessmentRubric';
import { Notice } from '../../components/layout/Notice';
import { QuestionReviewFieldset } from './QuestionReviewFieldset';
import { ReviewDecisionControls } from './ReviewDecisionControls';

const labels: ReadonlyMap<string, string> = new Map(
  [...CORE_CRITERIA, ...OPTIONAL_MODULES].map((item) => [item.id, item.label]),
);

export function TeacherEvaluationReview({
  evaluation,
  onSaved,
}: {
  evaluation: SubmissionEvaluationView;
  onSaved: () => Promise<void>;
}) {
  const [adjustments, setAdjustments] = useState<TeacherAdjustment[]>([]);
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'reviewed' | 'discarded' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const final = evaluation.status === 'reviewed' || evaluation.status === 'discarded';
  const stored = adjustmentsSchema.safeParse(evaluation.teacherAdjustments ?? []);
  const changes = final && stored.success ? stored.data : adjustments;

  function change(item: TeacherAdjustment) {
    setDecision(null);
    setAdjustments((current) => [
      ...current.filter((other) => other.position !== item.position || other.id !== item.id),
      item,
    ]);
  }

  async function save() {
    if (!decision || saving || saved) return;
    setSaving(true);
    setError('');
    try {
      await reviewEvaluation(
        getSupabaseClient(),
        evaluation.id,
        decision,
        decision === 'discarded' ? [] : adjustments,
        note,
      );
      setSaved(true);
      setDecision(null);
      try {
        await onSaved();
      } catch {
        setError('Revisión guardada. Usa Actualizar evaluación para cargar el estado confirmado.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la revisión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="stack" aria-label="Revisión docente">
      <h3>Revisión docente</h3>
      {final && (
        <Notice tone={evaluation.status === 'reviewed' ? 'info' : 'warning'}>
          {evaluation.status === 'reviewed'
            ? 'Evaluación revisada por el docente.'
            : 'Evaluación descartada: no debe incluirse en los resultados diagnósticos.'}
          {evaluation.reviewedAt && (
            <p>Fecha: {new Date(evaluation.reviewedAt).toLocaleString()}</p>
          )}
        </Notice>
      )}
      {evaluation.status !== 'discarded' &&
        evaluation.result?.questionResults.map((question) => (
          <QuestionReviewFieldset
            key={question.position}
            question={question}
            changes={changes}
            disabled={saving || saved || final}
            final={final}
            labels={labels}
            onChange={change}
          />
        ))}
      {final ? (
        <p>Nota docente: {evaluation.teacherNote || 'Sin nota adicional.'}</p>
      ) : (
        <ReviewDecisionControls
          note={note}
          onNoteChange={(value) => {
            setNote(value);
            setDecision(null);
          }}
          decision={decision}
          onSelectDecision={setDecision}
          onCancelDecision={() => setDecision(null)}
          saving={saving}
          saved={saved}
          onConfirm={() => void save()}
        />
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
