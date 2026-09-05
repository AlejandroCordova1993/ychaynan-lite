import { useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { manageGroup, type GroupAction } from '../../lib/api/groupLifecycle';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { Group } from '../../lib/validation/schemas';

const actionLabels = { archive: 'Archivar', restore: 'Restaurar', delete: 'Eliminar' };

export function GroupManagementPanel({
  groups,
  onChanged,
}: {
  groups: Group[];
  onChanged: (groupId: string, action: GroupAction) => void;
}) {
  const [pending, setPending] = useState<{ group: Group; action: GroupAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await manageGroup(getSupabaseClient(), pending.group.id, pending.action);
      onChanged(pending.group.id, pending.action);
      setMessage(
        pending.action === 'delete'
          ? 'Curso y nómina eliminados definitivamente. Esta acción no se puede deshacer.'
          : pending.action === 'archive'
            ? 'Curso archivado. Su historial se conserva.'
            : 'Curso restaurado.',
      );
      setPending(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos actualizar el curso.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack" aria-labelledby="manage-groups-title">
      <h2 id="manage-groups-title">Administrar cursos</h2>
      <p>
        Archiva los cursos que ya no usas para conservar su historial. Solo se pueden eliminar
        cursos sin accesos ni entregas.
      </p>
      {groups.length === 0 && <p>Todavía no hay cursos.</p>}
      <ul className="stack">
        {groups.map((group) => (
          <li key={group.id} className="stack">
            <p>
              {group.name} ({group.schoolYear}) ·{' '}
              {group.status === 'active' ? 'Activo' : 'Archivado'}
            </p>
            <div className="cluster">
              {([group.status === 'active' ? 'archive' : 'restore', 'delete'] as GroupAction[]).map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    className="button button--secondary"
                    disabled={busy}
                    aria-label={actionLabels[action] + ' ' + group.name}
                    onClick={() => {
                      setPending({ group, action });
                      setError('');
                      setMessage('');
                    }}
                  >
                    {actionLabels[action]}
                  </button>
                ),
              )}
            </div>
          </li>
        ))}
      </ul>
      {pending && (
        <div className="stack" role="group" aria-label="Confirmar cambio de curso">
          <p>
            {actionLabels[pending.action]}: {pending.group.name} ({pending.group.schoolYear})
          </p>
          {pending.action === 'delete' && (
            <p>
              Se borrarán definitivamente el curso y toda su nómina. Si tiene accesos o entregas, se
              rechazará el borrado.
            </p>
          )}
          {pending.action === 'archive' && (
            <p>
              Se conservarán estudiantes y resultados. No se admitirán nuevas importaciones ni
              nuevos ingresos estudiantiles. Las sesiones ya iniciadas no se cierran
              automáticamente.
            </p>
          )}
          {pending.action === 'restore' && (
            <p>El curso volverá a estar disponible para importar nóminas y asignar evaluaciones.</p>
          )}
          <div className="cluster">
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Guardando…' : 'Confirmar ' + actionLabels[pending.action].toLowerCase()}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setError('');
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
