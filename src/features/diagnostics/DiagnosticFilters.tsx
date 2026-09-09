/**
 * Selección compartida por el resumen diagnóstico y la exportación (spec §3):
 * evaluación aplicada, paralelo participante y fuente de resultados.
 *
 * El componente gestiona únicamente los selectores y sus listas (evaluaciones y
 * paralelos participantes). **No carga el informe**: avisa a su pantalla con
 * `onSelectionChange` y es esa pantalla la que llama a `loadDiagnosticReport`.
 * Cambiar la fuente no vuelve a consultar la base: es un filtro sobre el
 * informe ya cargado, resuelto por la pantalla consumidora.
 */
import { useEffect, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { listDiagnosticAssessments, listGroupsForAssessment } from '../../lib/api/diagnosticReport';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { Group } from '../../lib/validation/schemas';
import { SOURCE_LABELS, type DiagnosticSource } from './diagnosticPresentation';

export type { DiagnosticSource };

export interface DiagnosticSelection {
  assessmentId: string;
  groupId: string;
  source: DiagnosticSource;
}

type AppliedAssessment = Awaited<ReturnType<typeof listDiagnosticAssessments>>[number];

export interface DiagnosticFiltersProps {
  /**
   * Recibe la selección vigente, o `null` mientras no exista una completa
   * (sin evaluaciones aplicadas, sin paralelos participantes o cargando).
   * Debe ser estable (`useCallback`): el aviso ocurre dentro de un efecto.
   */
  onSelectionChange: (selection: DiagnosticSelection | null) => void;
  /** Bloquea los selectores mientras la pantalla consumidora trabaja. */
  disabled?: boolean;
}

export function DiagnosticFilters({ onSelectionChange, disabled = false }: DiagnosticFiltersProps) {
  const [assessments, setAssessments] = useState<AppliedAssessment[]>([]);
  const [assessmentId, setAssessmentId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [source, setSource] = useState<DiagnosticSource>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // La lista llega ordenada por `opened_at` descendente: la primera es la
  // evaluación aplicada más reciente, que es la selección inicial del §3.
  useEffect(() => {
    let active = true;
    listDiagnosticAssessments(getSupabaseClient())
      .then((items) => {
        if (!active) return;
        setAssessments(items);
        setAssessmentId(items[0]?.id ?? '');
        if (items.length === 0) setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // El paralelo es obligatorio y no se mezclan cursos: se elige el primer
  // paralelo participante de la evaluación, nunca una opción «todos». La carga
  // ya quedó marcada al montar o en el `onChange` de la evaluación, para no
  // encadenar renders desde el cuerpo del efecto.
  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
    listGroupsForAssessment(getSupabaseClient(), assessmentId)
      .then((items) => {
        if (!active) return;
        setGroups(items);
        setGroupId(items[0]?.id ?? '');
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

  useEffect(() => {
    onSelectionChange(assessmentId && groupId ? { assessmentId, groupId, source } : null);
  }, [assessmentId, groupId, source, onSelectionChange]);

  const busy = disabled || loading;

  return (
    <section className="stack" aria-label="Selección del informe">
      {error && (
        <Notice tone="error">
          No pudimos cargar las evaluaciones y paralelos disponibles. Actualiza la página para
          intentarlo nuevamente.
        </Notice>
      )}
      {!error && !loading && assessments.length === 0 && (
        <Notice tone="info">Todavía no hay una evaluación aplicada.</Notice>
      )}
      <div className="cluster">
        <label>
          Evaluación
          <select
            className="select"
            value={assessmentId}
            disabled={busy || assessments.length === 0}
            onChange={(event) => {
              setLoading(true);
              setGroups([]);
              setGroupId('');
              setAssessmentId(event.target.value);
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
        <label>
          Paralelo
          <select
            className="select"
            value={groupId}
            disabled={busy || groups.length === 0}
            onChange={(event) => setGroupId(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.schoolYear})
              </option>
            ))}
          </select>
        </label>
        <label>
          Fuente de resultados
          <select
            className="select"
            value={source}
            disabled={disabled}
            onChange={(event) => setSource(event.target.value as DiagnosticSource)}
          >
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!error && !loading && assessmentId && groups.length === 0 && (
        <Notice tone="info">
          Esta evaluación todavía no tiene paralelos participantes con acceso entregado.
        </Notice>
      )}
    </section>
  );
}
