import type { TeacherAdjustment } from '../../lib/api/evaluationReview';

type Level = 1 | 2 | 3 | 4 | 'no_aplica';

interface CriterionReviewRowProps {
  label: string;
  aiLevel: Level;
  current: TeacherAdjustment;
  adjusted: boolean;
  /** El propio `<fieldset>` de la pregunta ya deshabilita estos controles; no se repite aquí. */
  final: boolean;
  onChange: (item: TeacherAdjustment) => void;
  onEdit: (item: TeacherAdjustment) => void;
}

/** Una fila de revisión: nivel final, propuesta de la IA y su justificación editable. */
export function CriterionReviewRow({
  label,
  aiLevel,
  current,
  adjusted,
  final,
  onChange,
  onEdit,
}: CriterionReviewRowProps) {
  return (
    <div className="stack">
      <label>
        {label}
        <select
          value={current.level}
          onChange={(event) =>
            onChange({
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
      <p>Propuesta IA: {aiLevel === 'no_aplica' ? 'No aplica' : 'Nivel ' + aiLevel}</p>
      {adjusted && (
        <label>
          Justificación docente
          <textarea
            maxLength={1200}
            value={current.reason}
            onChange={(event) => onChange({ ...current, reason: event.target.value })}
          />
        </label>
      )}
      {!final && (
        <button type="button" className="button" onClick={() => onEdit(current)}>
          Editar justificación
        </button>
      )}
    </div>
  );
}
