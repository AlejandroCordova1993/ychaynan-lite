/**
 * Encabezado de columna ordenable, compartido por las tablas del resumen
 * diagnóstico.
 *
 * Semántica ARIA estándar: `<th scope="col">` con `aria-sort` y un botón
 * alcanzable por teclado. El glifo de dirección es decorativo; el estado lo
 * comunica `aria-sort`, de modo que nada depende del color. Ordenar solo
 * reordena filas ya calculadas: ningún cálculo cambia.
 */
import type { SortableColumn, SortState } from './diagnosticPresentation';

export interface SortableHeaderProps<Row, Key extends string> {
  column: SortableColumn<Row, Key>;
  sort: SortState<Key>;
  onToggle: (key: Key) => void;
  /** Clase de la celda, por ejemplo `table__number` para columnas numéricas. */
  className?: string;
}

export function SortableHeader<Row, Key extends string>({
  column,
  sort,
  onToggle,
  className,
}: SortableHeaderProps<Row, Key>) {
  const active = sort.key === column.key;
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="table-sort" onClick={() => onToggle(column.key)}>
        {column.header}
        <span aria-hidden="true">{active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </button>
    </th>
  );
}
