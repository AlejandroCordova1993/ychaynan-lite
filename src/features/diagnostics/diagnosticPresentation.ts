/**
 * Piezas compartidas por las tablas del resumen diagnóstico: etiquetas legibles,
 * formato de números/fechas y ordenamiento de filas.
 *
 * Nada de esto calcula una métrica. El ordenamiento **reordena filas ya
 * calculadas** por `diagnosticMetrics.ts` y el formato solo redondea a dos
 * decimales en la capa de presentación, como pide el §4.2 (el motor devuelve el
 * número sin redondear).
 */
import { useCallback, useMemo, useState } from 'react';
import type {
  EvaluationDimension,
  ObservationSeverity,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import {
  CORE_CRITERIA,
  OPTIONAL_MODULES,
} from '../../../supabase/functions/_shared/assessmentRubric.ts';

/* ------------------------------------------------------------------ *
 * Etiquetas
 * ------------------------------------------------------------------ */

/** Único mapa id→etiqueta del proyecto: el de la rúbrica compartida. */
const RUBRIC_LABELS: ReadonlyMap<string, string> = new Map(
  [...CORE_CRITERIA, ...OPTIONAL_MODULES].map(({ id, label }) => [id, label]),
);

export function rubricLabel(id: string): string {
  return RUBRIC_LABELS.get(id) ?? id;
}

export const DIMENSION_LABELS: Readonly<Record<EvaluationDimension, string>> = {
  comprension_lectora: 'Comprensión lectora',
  respuesta_razonamiento: 'Respuesta y razonamiento',
  organizacion_discursiva: 'Organización discursiva',
  convenciones_escritura: 'Convenciones de escritura',
};

/**
 * `aiEvaluation.ts` publica `EVALUATION_OBSERVATION_CODES` pero no un catálogo
 * de textos legibles, y el detalle de entrega existente también muestra el
 * código tal cual. Hasta que ese catálogo exista en el módulo compartido, la
 * etiqueta legible es el propio código: inventar aquí un segundo diccionario
 * de textos crearía una fuente de verdad paralela.
 */
export function observationLabel(code: string): string {
  return code;
}

export const SEVERITY_LABELS: Readonly<Record<ObservationSeverity, string>> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const ASSESSMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  open: 'Abierta',
  closed: 'Cerrada',
  archived: 'Archivada',
};

/** Fuente de resultados del §3; filtra el informe ya cargado, no la consulta. */
export type DiagnosticSource = 'todos' | 'revisados' | 'provisionales';

export const SOURCE_LABELS: Readonly<Record<DiagnosticSource, string>> = {
  todos: 'Todos los utilizables',
  revisados: 'Solo revisados',
  provisionales: 'Solo provisionales',
};

/* ------------------------------------------------------------------ *
 * Formato
 * ------------------------------------------------------------------ */

/** Dos decimales; un promedio vacío nunca se presenta como cero (§4.2). */
export function formatAverage(value: number | null): string {
  return value === null ? 'Sin datos' : value.toFixed(2);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-EC');
}

/* ------------------------------------------------------------------ *
 * Ordenamiento de filas ya calculadas
 * ------------------------------------------------------------------ */

export type SortDirection = 'asc' | 'desc';

export interface SortState<Key extends string> {
  key: Key;
  direction: SortDirection;
}

export interface SortableColumn<Row, Key extends string> {
  key: Key;
  header: string;
  /** Compara valores ya presentes en la fila; jamás recalcula una métrica. */
  compare: (a: Row, b: Row) => number;
  /** Dirección inicial al activar la columna por primera vez. */
  initialDirection?: SortDirection;
}

/** Ordena texto en español y deja los valores vacíos al final. */
export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'es');
}

/** Compara números tratando `null` (sin datos) como el valor más alto. */
export function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

export interface TableSort<Row, Key extends string> {
  rows: Row[];
  sort: SortState<Key>;
  toggle: (key: Key) => void;
}

export function useTableSort<Row, Key extends string>(
  rows: readonly Row[],
  columns: readonly SortableColumn<Row, Key>[],
  initial: SortState<Key>,
): TableSort<Row, Key> {
  const [sort, setSort] = useState<SortState<Key>>(initial);

  const toggle = useCallback(
    (key: Key) => {
      setSort((current) => {
        if (current.key === key) {
          return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
        }
        const column = columns.find((item) => item.key === key);
        return { key, direction: column?.initialDirection ?? 'asc' };
      });
    },
    [columns],
  );

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return [...rows];
    const factor = sort.direction === 'asc' ? 1 : -1;
    // `sort` trabaja sobre una copia: la estructura de métricas nunca se muta.
    return [...rows].sort((a, b) => column.compare(a, b) * factor);
  }, [rows, columns, sort]);

  return { rows: sorted, sort, toggle };
}

/** El encabezado ordenable vive en `SortableHeader.tsx`: este módulo no tiene JSX. */
