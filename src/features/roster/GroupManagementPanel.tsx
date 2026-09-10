import { useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import {
  manageGroup,
  previewGroupDeletion,
  type GroupAction,
  type GroupDeletionImpact,
} from '../../lib/api/groupLifecycle';
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
  const [confirmation, setConfirmation] = useState('');
  const [impact, setImpact] = useState<GroupDeletionImpact | null>(null);

  async function selectAction(group: Group, action: GroupAction) {
    setPending({ group, action });
    setConfirmation('');
    setImpact(null);
    setError('');
    setMessage('');
    if (action !== 'delete') return;
    setBusy(true);
    try {
      setImpact(await previewGroupDeletion(getSupabaseClient(), group.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos consultar el curso.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending || busy) return;
    if (pending.action === 'delete' && (!impact || confirmation !== pending.group.name)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (pending.action === 'delete')
        await manageGroup(getSupabaseClient(), pending.group.id, pending.action, confirmation);
      else await manageGroup(getSupabaseClient(), pending.group.id, pending.action);
      onChanged(pending.group.id, pending.action);
      setMessage(
        pending.action === 'delete'
          ? 'Curso, nómina, accesos, respuestas y calificaciones eliminados definitivamente. Esta acción no se puede deshacer.'
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
        Archiva los cursos para conservar su historial, o elimínalos definitivamente junto con sus
        datos.
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
                      void selectAction(group, action);
                    }}
                  >
                    {action === 'delete' ? 'Eliminar definitivamente' : actionLabels[action]}
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
            <>
              <Notice tone="error">
                Se eliminarán definitivamente este curso, su nómina, códigos, sesiones, borradores,
                respuestas y calificaciones. No podrás recuperarlos desde la aplicación. Las
                lecturas compartidas y los demás cursos se conservan.
              </Notice>
              {impact && (
                <p>
                  Datos afectados: {impact.students} estudiantes, {impact.accesses} accesos,{' '}
                  {impact.submissions} trabajos, {impact.responses} respuestas y{' '}
                  {impact.evaluations} evaluaciones. El recuento puede cambiar si hay estudiantes
                  trabajando.
                </p>
              )}
              <label htmlFor="delete-group-name">Escribe el nombre del curso para eliminarlo</label>
              <input
                id="delete-group-name"
                className="input"
                value={confirmation}
                disabled={busy}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </>
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
              disabled={
                busy ||
                (pending.action === 'delete' && (!impact || confirmation !== pending.group.name))
              }
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
