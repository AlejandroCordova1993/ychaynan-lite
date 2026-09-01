import { useEffect, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  getAccessOverview,
  openAssessment,
  regenerateAccess,
  unblockAccess,
  type AccessCodeReceipt,
  type AccessOverview,
  type AccessState,
} from '../../lib/api/assessmentAccess';
import { getDraftAssessment } from '../../lib/api/assessments';
import { listGroups } from '../../lib/api/groups';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { Group } from '../../lib/validation/schemas';
import type { AssessmentDraftInput } from './assessmentSchemas';

const STATE_LABELS: Record<AccessState, string> = {
  unused: 'Sin usar',
  active: 'En curso',
  submitted: 'Entregado',
  blocked: 'Bloqueado',
  revoked: 'Revocado',
};

export function AccessManagementScreen() {
  const client = getSupabaseClient();
  const [assessment, setAssessment] = useState<AssessmentDraftInput | null>(null);
  const [overview, setOverview] = useState<AccessOverview | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [receipts, setReceipts] = useState<AccessCodeReceipt[] | null>(null);
  const [regeneratedCode, setRegeneratedCode] = useState<{ name: string; code: string } | null>(
    null,
  );
  const [busyAccessId, setBusyAccessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getDraftAssessment(client), listGroups(client), getAccessOverview(client)])
      .then(([draft, availableGroups, currentOverview]) => {
        setAssessment(draft);
        setGroups(availableGroups.filter(({ status }) => status === 'active'));
        setOverview(currentOverview);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
    // El cliente es un singleton estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = async () => {
    if (!assessment?.id || !groupId || !confirmed) return;
    setError(false);
    setOpening(true);
    try {
      setReceipts(await openAssessment(client, assessment.id, groupId));
    } catch (openError) {
      console.error(openError);
      setError(true);
    } finally {
      setOpening(false);
    }
  };

  const handleRegenerate = async (accessId: string, fullName: string) => {
    setError(false);
    setBusyAccessId(accessId);
    setRegeneratedCode(null);
    try {
      const code = await regenerateAccess(client, accessId);
      setRegeneratedCode({ name: fullName, code });
      setOverview((current) =>
        current
          ? {
              ...current,
              accesses: current.accesses.map((item) =>
                item.id === accessId
                  ? { ...item, state: 'unused', failedAttempts: 0, cooldownUntil: null }
                  : item,
              ),
            }
          : current,
      );
    } catch (regenerateError) {
      console.error(regenerateError);
      setError(true);
    } finally {
      setBusyAccessId(null);
    }
  };

  const handleUnblock = async (accessId: string) => {
    setError(false);
    setBusyAccessId(accessId);
    try {
      await unblockAccess(client, accessId);
      setOverview((current) =>
        current
          ? {
              ...current,
              accesses: current.accesses.map((item) =>
                item.id === accessId
                  ? { ...item, state: 'unused', failedAttempts: 0, cooldownUntil: null }
                  : item,
              ),
            }
          : current,
      );
    } catch (unblockError) {
      console.error(unblockError);
      setError(true);
    } finally {
      setBusyAccessId(null);
    }
  };

  return (
    <div className="access-management stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · distribución"
        title="Distribuir accesos"
        lead="Abre el borrador para un paralelo y gestiona el acceso de cada estudiante."
      />
      {loading && (
        <p role="status" className="loading">
          Preparando accesos…
        </p>
      )}
      {error && (
        <Notice tone="error">No pudimos completar la operación. Intenta nuevamente.</Notice>
      )}

      {!loading && overview && !receipts && (
        <section className="stack" aria-labelledby="access-overview-title">
          <div>
            <p className="mono-label">Evaluación abierta</p>
            <h2 id="access-overview-title">{overview.title}</h2>
          </div>
          {regeneratedCode && (
            <Notice tone="warning">
              El código nuevo de {regeneratedCode.name} es{' '}
              <strong className="access-code">{regeneratedCode.code}</strong>. Este código nuevo se
              muestra una sola vez.
            </Notice>
          )}
          <div className="table-scroll">
            <table className="table access-code-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado</th>
                  <th>Intentos fallidos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {overview.accesses.map((access) => (
                  <tr key={access.id}>
                    <td>{access.fullName}</td>
                    <td>{STATE_LABELS[access.state]}</td>
                    <td>{access.failedAttempts}</td>
                    <td>
                      <div className="cluster">
                        <button
                          type="button"
                          className="button button--secondary"
                          aria-label={`Regenerar código para ${access.fullName}`}
                          disabled={access.state === 'submitted' || busyAccessId === access.id}
                          onClick={() => void handleRegenerate(access.id, access.fullName)}
                        >
                          Regenerar
                        </button>
                        {access.state === 'blocked' && (
                          <button
                            type="button"
                            className="button button--secondary"
                            aria-label={`Desbloquear acceso de ${access.fullName}`}
                            disabled={busyAccessId === access.id}
                            onClick={() => void handleUnblock(access.id)}
                          >
                            Desbloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && !overview && !receipts && (
        <section className="assessment-section" aria-labelledby="access-assessment-title">
          <div className="assessment-section__heading">
            <p className="mono-label">01 · Confirmación</p>
            <div>
              <h2 id="access-assessment-title">
                {assessment?.title ?? 'No hay borrador disponible'}
              </h2>
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
                onChange={(event) => setGroupId(event.target.value)}
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
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>Confirmo que la lectura y las preguntas están listas para aplicarse.</span>
            </label>
            <button
              type="button"
              className="button button--primary"
              disabled={!assessment?.id || !groupId || !confirmed || opening}
              onClick={() => void handleOpen()}
            >
              {opening ? 'Generando códigos…' : 'Abrir evaluación y generar códigos'}
            </button>
          </div>
        </section>
      )}

      {receipts && (
        <section className="stack" aria-labelledby="access-codes-title">
          <Notice tone="warning">
            Guarda o imprime esta lista ahora. Los códigos claros no volverán a mostrarse.
          </Notice>
          <div className="cluster">
            <h2 id="access-codes-title">Códigos personales</h2>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => window.print()}
            >
              Imprimir lista
            </button>
          </div>
          <div className="table-scroll">
            <table className="table access-code-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Código</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.studentId}>
                    <td>{receipt.fullName}</td>
                    <td>
                      <strong className="access-code">{receipt.code}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
