/**
 * Orquestación compartida por `DiagnosticSummaryScreen` y
 * `DiagnosticExportScreen`: convierte la selección que emite
 * `DiagnosticFilters` en un informe cargado y sus métricas.
 *
 * `DiagnosticFilters` sólo gestiona los selectores; llamar a
 * `loadDiagnosticReport` es trabajo de la pantalla. Con dos pantallas
 * consumiendo la misma secuencia (invalidar → cargar → medir → filtrar por
 * fuente), ese trabajo vive aquí una sola vez: así el resumen y la exportación
 * no pueden divergir sobre cuándo se invalida un informe ni sobre qué
 * estudiantes deja dentro cada fuente (§3, §9).
 *
 * Este módulo no calcula ninguna regla: delega en `computeDiagnosticMetrics` y
 * en la procedencia que ya resolvió `applyEffectiveResult`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadDiagnosticReport } from '../../lib/api/diagnosticReport';
import { getSupabaseClient } from '../../lib/supabase/client';
import type { DiagnosticSelection } from './DiagnosticFilters';
import { computeDiagnosticMetrics, type DiagnosticMetrics } from './diagnosticMetrics';
import type { DiagnosticReport, EffectiveSource } from './diagnosticModel';

export interface DiagnosticReportState {
  /** Selección vigente de los filtros; `null` mientras no exista una completa. */
  selection: DiagnosticSelection | null;
  /** Informe completo tal como lo entregó el cargador. */
  report: DiagnosticReport | null;
  /**
   * Informe restringido a la fuente elegida. Es lo que consumen los
   * exportadores, para que el archivo contenga exactamente lo que resume la
   * pantalla. Con `Todos los utilizables` es el mismo objeto que `report`.
   */
  filteredReport: DiagnosticReport | null;
  /** Métricas del informe completo: cobertura y errores de contrato reales. */
  fullMetrics: DiagnosticMetrics | null;
  /** Métricas de la fuente elegida. */
  metrics: DiagnosticMetrics | null;
  loading: boolean;
  error: boolean;
  /** Pásalo tal cual a `DiagnosticFilters`; ya es estable. */
  onSelectionChange: (next: DiagnosticSelection | null) => void;
}

export function useDiagnosticReport(): DiagnosticReportState {
  const [selection, setSelection] = useState<DiagnosticSelection | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const previous = useRef<DiagnosticSelection | null>(null);

  // Invalida el informe anterior en el mismo evento que cambia la selección: no
  // existe un instante en que se vea una tabla vieja bajo un encabezado nuevo.
  // La fuente no entra en esta comparación porque filtra sin recargar.
  const onSelectionChange = useCallback((next: DiagnosticSelection | null) => {
    const before = previous.current;
    previous.current = next;
    if (before?.assessmentId !== next?.assessmentId || before?.groupId !== next?.groupId) {
      setReport(null);
      setError(false);
      setLoading(next !== null);
    }
    setSelection(next);
  }, []);

  const assessmentId = selection?.assessmentId ?? '';
  const groupId = selection?.groupId ?? '';
  const source = selection?.source ?? 'todos';

  useEffect(() => {
    if (!assessmentId || !groupId) return;
    // `onSelectionChange` ya marcó la carga al cambiar la selección; aquí solo
    // se resuelve, para no encadenar renders desde el cuerpo del efecto.
    let active = true;
    loadDiagnosticReport(getSupabaseClient(), assessmentId, groupId)
      .then((value) => {
        if (active) setReport(value);
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
  }, [assessmentId, groupId]);

  const fullMetrics = useMemo(() => (report ? computeDiagnosticMetrics(report) : null), [report]);

  // La fuente filtra el informe ya cargado usando la procedencia que el motor
  // ya determinó; no vuelve a decidir qué resultado es utilizable.
  const filteredReport = useMemo(() => {
    if (!report || !fullMetrics || source === 'todos') return report;
    const wanted: EffectiveSource = source === 'revisados' ? 'revisado_docente' : 'provisional_ia';
    const keep = new Set(
      fullMetrics.students.filter((item) => item.source === wanted).map((item) => item.studentId),
    );
    return { ...report, students: report.students.filter((entry) => keep.has(entry.studentId)) };
  }, [report, fullMetrics, source]);

  const metrics = useMemo(() => {
    if (filteredReport === null) return null;
    // Identidad, no igualdad estructural: con `todos` el filtro devolvió el
    // mismo objeto y las métricas completas ya sirven sin recalcular.
    if (filteredReport === report) return fullMetrics;
    return computeDiagnosticMetrics(filteredReport);
  }, [filteredReport, report, fullMetrics]);

  return {
    selection,
    report,
    filteredReport,
    fullMetrics,
    metrics,
    loading,
    error,
    onSelectionChange,
  };
}
