import { useEffect, useState } from 'react';
import './submissions.css';
import { Link } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { listSubmissionOverview, type SubmissionOverviewStatus } from '../../lib/api/submissions';
import { getSupabaseClient } from '../../lib/supabase/client';

const LABELS: Record<SubmissionOverviewStatus, string> = {
  esperado: 'Esperado',
  iniciado: 'Iniciado',
  entregado: 'Entregado',
  bloqueado: 'Bloqueado',
  revocado: 'Revocado',
};
export function SubmissionListScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listSubmissionOverview>>>(null);
  const [filter, setFilter] = useState<'todos' | SubmissionOverviewStatus>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    listSubmissionOverview(getSupabaseClient())
      .then(setData)
      .catch((reason: unknown) => {
        console.error(reason);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);
  const rows = data?.rows.filter((row) => filter === 'todos' || row.status === filter) ?? [];
  return (
    <div className="submission-list stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · seguimiento"
        title="Respuestas"
        lead="Consulta quién inició y quién entregó la evaluación."
      />
      {loading && (
        <p role="status" className="loading">
          Cargando respuestas…
        </p>
      )}
      {error && <Notice tone="error">No pudimos cargar las respuestas.</Notice>}
      {!loading && !data && !error && (
        <Notice tone="info">Todavía no hay una evaluación aplicada.</Notice>
      )}
      {data && (
        <>
          <div className="cluster">
            <h2>{data.title}</h2>
            <div className="field compact-field">
              <label htmlFor="submission-filter">Filtrar por estado</label>
              <select
                id="submission-filter"
                className="select"
                value={filter}
                onChange={(event) => setFilter(event.target.value as typeof filter)}
              >
                <option value="todos">Todos</option>
                {Object.entries(LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.accessId}>
                    <td>{row.studentName}</td>
                    <td>{LABELS[row.status]}</td>
                    <td>
                      {row.submissionId ? (
                        <Link
                          className="button button--secondary"
                          to={`/docente/respuestas/${row.submissionId}`}
                          aria-label={`Ver respuesta de ${row.studentName}`}
                        >
                          Ver respuesta
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
