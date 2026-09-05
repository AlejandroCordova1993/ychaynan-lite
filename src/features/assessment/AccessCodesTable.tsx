import type { AccessOverviewItem } from '../../lib/api/assessmentAccess';
import { CODE_PLACEHOLDERS, STATE_LABELS, SUBMISSION_LABELS } from './accessLabels';

interface AccessCodesTableProps {
  accesses: readonly AccessOverviewItem[];
  busyAccessId: string | null;
  onCopyCode: (access: AccessOverviewItem) => void;
  onRegenerate: (accessId: string) => void;
  onUnblock: (accessId: string) => void;
}

export function AccessCodesTable({
  accesses,
  busyAccessId,
  onCopyCode,
  onRegenerate,
  onUnblock,
}: AccessCodesTableProps) {
  return (
    <div className="table-scroll">
      <table className="table access-code-table">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Paralelo</th>
            <th>Código</th>
            <th>Estado</th>
            <th>Entrega</th>
            <th>Intentos fallidos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {accesses.map((access) => (
            <tr key={access.id}>
              <td>{access.fullName}</td>
              <td>{access.groupName}</td>
              <td>
                {access.code ? (
                  <div className="cluster">
                    <strong className="access-code">{access.code}</strong>
                    <button
                      type="button"
                      className="button button--secondary"
                      aria-label={`Copiar código de ${access.fullName}`}
                      onClick={() => onCopyCode(access)}
                    >
                      Copiar
                    </button>
                  </div>
                ) : (
                  <span className="mono-label">
                    {CODE_PLACEHOLDERS[access.codeStatus as keyof typeof CODE_PLACEHOLDERS]}
                  </span>
                )}
              </td>
              <td>{STATE_LABELS[access.state]}</td>
              <td>{SUBMISSION_LABELS[access.submissionStatus]}</td>
              <td>{access.failedAttempts}</td>
              <td>
                <div className="cluster">
                  <button
                    type="button"
                    className="button button--secondary"
                    aria-label={`Regenerar código para ${access.fullName}`}
                    disabled={access.state === 'submitted' || busyAccessId === access.id}
                    onClick={() => onRegenerate(access.id)}
                  >
                    Regenerar
                  </button>
                  {access.state === 'blocked' && (
                    <button
                      type="button"
                      className="button button--secondary"
                      aria-label={`Desbloquear acceso de ${access.fullName}`}
                      disabled={busyAccessId === access.id}
                      onClick={() => onUnblock(access.id)}
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
  );
}
