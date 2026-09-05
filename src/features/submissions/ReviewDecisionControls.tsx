type Decision = 'reviewed' | 'discarded';

interface ReviewDecisionControlsProps {
  note: string;
  onNoteChange: (note: string) => void;
  decision: Decision | null;
  onSelectDecision: (decision: Decision) => void;
  onCancelDecision: () => void;
  saving: boolean;
  saved: boolean;
  onConfirm: () => void;
}

/** Nota docente y el par aprobar/descartar, con su paso de confirmación explícita. */
export function ReviewDecisionControls({
  note,
  onNoteChange,
  decision,
  onSelectDecision,
  onCancelDecision,
  saving,
  saved,
  onConfirm,
}: ReviewDecisionControlsProps) {
  return (
    <>
      <label>
        Nota docente (obligatoria para descartar)
        <textarea
          maxLength={1200}
          disabled={saving || saved}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>
      <p>La revisión es definitiva. La propuesta original de IA se conserva debajo.</p>
      <div className="cluster">
        <button
          type="button"
          className="button button--primary"
          disabled={saving || saved}
          onClick={() => onSelectDecision('reviewed')}
        >
          Aprobar evaluación
        </button>
        <button
          type="button"
          className="button"
          disabled={saving || saved || !note.trim()}
          onClick={() => onSelectDecision('discarded')}
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
            onClick={onConfirm}
          >
            {saving ? 'Guardando…' : 'Confirmar revisión definitiva'}
          </button>
          <button type="button" className="button" disabled={saving} onClick={onCancelDecision}>
            Volver a revisar
          </button>
        </div>
      )}
    </>
  );
}
