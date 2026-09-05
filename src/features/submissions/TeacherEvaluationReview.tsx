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
          <fieldset key={question.position} className="stack" disabled={saving || saved || final}>
            <legend>Pregunta {question.position}: niveles finales</legend>
            {[...question.criteria, ...question.modules].map((criterion) => {
              const id = 'criterionId' in criterion ? criterion.criterionId : criterion.moduleId;
              const adjustment = changes.find(
                (item) => item.position === question.position && item.id === id,
              );
              const current = adjustment ?? {
                position: question.position,
                id,
                level: criterion.level,
                reason: criterion.reason,
              };
              return (
                <div key={id} className="stack">
                  <label>
                    {labels.get(id) ?? id}
                    <select
                      value={current.level}
                      onChange={(event) =>
                        change({
                          ...current,
                          level:
                            event.target.value === 'no_aplica'
                              ? 'no_aplica'
                              : (Number(event.target.value) as 1 | 2 | 3 | 4),
                        })
                      }
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <option key={level} value={level}>
                          Nivel {level}
                        </option>
                      ))}
                      <option value="no_aplica">No aplica</option>
                    </select>
                  </label>
                  <p>
                    Propuesta IA:{' '}
                    {criterion.level === 'no_aplica' ? 'No aplica' : 'Nivel ' + criterion.level}
                  </p>
                  {adjustment && (
                    <label>
                      Justificación docente
                      <textarea
                        maxLength={1200}
                        value={current.reason}
                        onChange={(event) => change({ ...current, reason: event.target.value })}
                      />
                    </label>
                  )}
                  {!final && (
                    <button type="button" className="button" onClick={() => change(current)}>
                      Editar justificación
                    </button>
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}
      {final ? (
        <p>Nota docente: {evaluation.teacherNote || 'Sin nota adicional.'}</p>
      ) : (
        <>
          <label>
            Nota docente (obligatoria para descartar)
            <textarea
              maxLength={1200}
              disabled={saving || saved}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setDecision(null);
              }}
            />
          </label>
          <p>La revisión es definitiva. La propuesta original de IA se conserva debajo.</p>
          <div className="cluster">
            <button
              type="button"
              className="button button--primary"
              disabled={saving || saved}
              onClick={() => setDecision('reviewed')}
            >
              Aprobar evaluación
            </button>
            <button
              type="button"
              className="button"
              disabled={saving || saved || !note.trim()}
              onClick={() => setDecision('discarded')}
            >
              Descartar evaluación
            </button>
          </div>
          {decision && (
            <div className="stack">
              <p role="status">
                {decision === 'reviewed'
                  ? 'Se guardarán los niveles finales y tu nota.'
                  : 'Se excluirá este resultado del diagnóstico y se conservará el original.'}{' '}
                Confirma para finalizar.
              </p>
              <button
                type="button"
                className="button button--primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Guardando…' : 'Confirmar revisión definitiva'}
              </button>
              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => setDecision(null)}
              >
                Volver a revisar
              </button>
            </div>
          )}
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
