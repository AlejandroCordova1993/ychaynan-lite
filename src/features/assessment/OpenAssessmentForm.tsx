import type { Group } from '../../lib/validation/schemas';

interface OpenAssessmentFormProps {
  title: string | null;
  groups: readonly Group[];
  groupId: string;
  confirmed: boolean;
  opening: boolean;
  canOpen: boolean;
  onGroupChange: (groupId: string) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  onOpen: () => void;
}

export function OpenAssessmentForm({
  title,
  groups,
  groupId,
  confirmed,
  opening,
  canOpen,
  onGroupChange,
  onConfirmedChange,
  onOpen,
}: OpenAssessmentFormProps) {
  return (
    <section className="assessment-section" aria-labelledby="access-assessment-title">
      <div className="assessment-section__heading">
        <p className="mono-label">01 · Confirmación</p>
        <div>
          <h2 id="access-assessment-title">{title ?? 'No hay borrador disponible'}</h2>
          <p>Al abrirla, la lectura y las preguntas quedan congeladas.</p>
        </div>
      </div>
      <div className="assessment-section__body form">
        <div className="field">
          <label htmlFor="access-group">Paralelo</label>
          <select
            id="access-group"
            className="select"
            value={groupId}
            onChange={(event) => onGroupChange(event.target.value)}
          >
            <option value="">Selecciona un paralelo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.schoolYear})
              </option>
            ))}
          </select>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            className="checkbox"
            checked={confirmed}
            onChange={(event) => onConfirmedChange(event.target.checked)}
          />
          <span>Confirmo que la lectura y las preguntas están listas para aplicarse.</span>
        </label>
        <button
          type="button"
          className="button button--primary"
          disabled={!canOpen || opening}
          onClick={onOpen}
        >
          {opening ? 'Generando códigos…' : 'Abrir evaluación y generar códigos'}
        </button>
      </div>
    </section>
  );
}
