import { useEffect, useState } from 'react';
import './submissions.css';
import { Link } from 'react-router-dom';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  listAppliedAssessments,
  listSubmissionOverview,
  type SubmissionOverviewStatus,
} from '../../lib/api/submissions';
import { getSupabaseClient } from '../../lib/supabase/client';
import { BatchEvaluationPanel } from './BatchEvaluationPanel';

const LABELS: Record<SubmissionOverviewStatus, string> = {
  esperado: 'Esperado',
  iniciado: 'Iniciado',
  entregado: 'Entregado',
  bloqueado: 'Bloqueado',
  revocado: 'Revocado',
};
const AI_LABELS = {
  pending: 'En cola',
  running: 'Evaluando',
  completed: 'Evaluado · por revisar',
  reviewed: 'Revisado',
  discarded: 'Descartado',
  failed: 'Falló',
};

export function SubmissionListScreen() {
  const [assessments, setAssessments] = useState<
    Awaited<ReturnType<typeof listAppliedAssessments>>
  >([]);
  const [assessmentId, setAssessmentId] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof listSubmissionOverview>>>(null);
  const [filter, setFilter] = useState<'todos' | SubmissionOverviewStatus>('todos');
  const [groupId, setGroupId] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    listAppliedAssessments(getSupabaseClient())
      .then((items) => {
        if (!active) return;
        setAssessments(items);
        setAssessmentId(items[0]?.id ?? '');
        if (!items.length) setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
    listSubmissionOverview(getSupabaseClient(), assessmentId)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assessmentId]);

  async function reload() {
    const value = await listSubmissionOverview(getSupabaseClient(), assessmentId);
    setData(value);
  }
  async function refresh() {
    setError(false);
    setLoading(true);
    try {
      await reload();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  const groups = new Map(
    (data?.rows ?? []).map((row) => [row.groupId, row.groupName + ' (' + row.schoolYear + ')']),
  );
  const groupRows =
    data?.rows.filter((row) => groupId === 'todos' || row.groupId === groupId) ?? [];
  const rows = groupRows.filter((row) => filter === 'todos' || row.status === filter);
  const delivered = groupRows.filter((row) => row.status === 'entregado').length;
  const evaluated = groupRows.filter(
    (row) => row.evaluationStatus === 'completed' || row.evaluationStatus === 'reviewed',
  ).length;
  const reviewed = groupRows.filter((row) => row.evaluationStatus === 'reviewed').length;

  return (
    <div className="submission-list stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · seguimiento"
        title="Respuestas"
        lead="Selecciona una evaluación y un paralelo para consultar y evaluar sus entregas."
      />
      {assessments.length > 0 && (
        <label>
          Evaluación
          <select
            className="select"
            value={assessmentId}
            disabled={busy}
            onChange={(event) => {
              setLoading(true);
              setError(false);
              setData(null);
              setAssessmentId(event.target.value);
              setGroupId('todos');
              setFilter('todos');
            }}
          >
            {assessments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.opened_at ? ' · ' + new Date(item.opened_at).toLocaleDateString('es-EC') : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {loading && <p role="status">Cargando respuestas…</p>}
      {error && (
        <Notice tone="error">
          No pudimos cargar las respuestas. Intenta actualizar nuevamente.
        </Notice>
      )}
      {!loading && !data && !error && (
        <Notice tone="info">Todavía no hay una evaluación aplicada.</Notice>
      )}
      {assessmentId && (
        <button
          type="button"
          className="button"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          Actualizar respuestas
        </button>
      )}
      {data && data.assessmentId === assessmentId && (
        <>
          <h2>{data.title}</h2>
          <div className="cluster">
            <label>
              Filtrar por paralelo
              <select
                className="select"
                value={groupId}
                disabled={busy || loading}
                onChange={(event) => setGroupId(event.target.value)}
              >
                <option value="todos">Todos los paralelos</option>
                {[...groups].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filtrar por estado
              <select
                className="select"
                value={filter}
                disabled={busy || loading}
                onChange={(event) => setFilter(event.target.value as typeof filter)}
              >
                <option value="todos">Todos</option>
                {Object.entries(LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p aria-label="Resumen del paralelo">
            {groupRows.length} estudiantes · {delivered} entregas · {evaluated} evaluadas ·{' '}
            {reviewed} revisadas. Los descartados no cuentan como evaluados.
          </p>
          {!loading && !error && (
            <BatchEvaluationPanel
              key={assessmentId + ':' + groupId + ':' + filter}
              rows={rows}
              groupLabel={groups.get(groupId) ?? null}
              onBusyChange={setBusy}
              onFinished={reload}
            />
          )}
          {rows.length === 0 && <p>No hay estudiantes que coincidan con estos filtros.</p>}
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Paralelo</th>
                  <th>Estado</th>
                  <th>Evaluación IA</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.accessId}>
                    <td>{row.studentName}</td>
                    <td>
                      {row.groupName} ({row.schoolYear})
                    </td>
                    <td>{LABELS[row.status]}</td>
                    <td>
                      {row.evaluationStatus
                        ? AI_LABELS[row.evaluationStatus]
                        : row.status === 'entregado'
                          ? 'Sin evaluar'
                          : '—'}
                    </td>
                    <td>
                      {row.submissionId && !busy ? (
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
