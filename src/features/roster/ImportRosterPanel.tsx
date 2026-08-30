import { useRef, useState, type ChangeEvent } from 'react';
import {
  importRosterFile,
  type RosterCsvRow,
  type RosterEncoding,
  type RosterImportResult,
} from './parseRoster';

export interface ImportRosterPanelProps {
  onConfirm: (rows: RosterCsvRow[]) => Promise<void>;
}

export function ImportRosterPanel({ onConfirm }: ImportRosterPanelProps) {
  const [result, setResult] = useState<RosterImportResult | null>(null);
  // Filas marcadas como duplicadas que el docente decidió importar de todos modos.
  // El esquema admite homónimos a propósito (guía §12.3), pero la coincidencia
  // exacta de nombre casi siempre indica una fila pegada dos veces, así que la
  // decisión es explícita y por fila en lugar de automática.
  const [approvedDuplicates, setApprovedDuplicates] = useState<ReadonlySet<number>>(new Set());
  const fileBytesRef = useRef<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.target;
    if (!file) {
      return;
    }

    setError(null);
    setResult(null);
    setApprovedDuplicates(new Set());
    fileBytesRef.current = null;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      fileBytesRef.current = bytes;
      setResult(importRosterFile(bytes));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo leer el archivo.');
    } finally {
      input.value = '';
    }
  };

  const handleEncodingChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const fileBytes = fileBytesRef.current;
    if (!fileBytes) {
      return;
    }

    const encoding = event.target.value as RosterEncoding;
    setError(null);
    // Al recodificar cambian los nombres y con ellos qué filas resultan
    // duplicadas; una aprobación anterior ya no se refiere necesariamente a la
    // misma persona, así que se descarta.
    setApprovedDuplicates(new Set());
    try {
      setResult(importRosterFile(fileBytes, encoding));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo leer el archivo.');
    }
  };

  const toggleDuplicate = (rowNumber: number) => {
    setApprovedDuplicates((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  const rowsToImport = (result?.rows ?? []).filter(
    (row) =>
      row.status === 'valid' ||
      (row.status === 'duplicate' && approvedDuplicates.has(row.rowNumber)),
  );

  const handleConfirm = async () => {
    if (!result) {
      return;
    }
    setConfirming(true);
    try {
      await onConfirm(rowsToImport);
      setResult(null);
      setApprovedDuplicates(new Set());
      fileBytesRef.current = null;
    } catch {
      // El mensaje de error ya lo muestra el componente padre (onConfirm);
      // aquí solo evitamos una promesa rechazada sin manejar y conservamos la
      // vista previa para que el docente no tenga que volver a subir el archivo.
    } finally {
      setConfirming(false);
    }
  };

  const omittedDuplicateCount = (result?.duplicateCount ?? 0) - approvedDuplicates.size;

  return (
    <section aria-label="Importar nómina">
      <label htmlFor="roster-file">Archivo CSV de la nómina</label>
      <input id="roster-file" type="file" accept=".csv" onChange={handleFileChange} />

      {error && <p role="alert">{error}</p>}

      {result && (
        <div>
          <label htmlFor="roster-encoding">Codificación</label>
          <select id="roster-encoding" value={result.encodingUsed} onChange={handleEncodingChange}>
            <option value="utf-8">UTF-8</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
          <p>
            Codificación detectada: {result.encodingUsed}. Válidas: {result.validCount}. Duplicadas:{' '}
            {result.duplicateCount}. Inválidas: {result.invalidCount}.
          </p>
          {omittedDuplicateCount > 0 && (
            <p>
              {omittedDuplicateCount === 1
                ? 'Se omitirá 1 fila duplicada.'
                : `Se omitirán ${omittedDuplicateCount} filas duplicadas.`}{' '}
              Si se trata de dos estudiantes distintos con el mismo nombre completo, marca la
              casilla de esa fila para importarla de todos modos.
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Nombre original</th>
                <th scope="col">Nombre normalizado</th>
                <th scope="col">Estado</th>
                <th scope="col">Problemas</th>
                <th scope="col">Importar de todos modos</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.fullNameOriginal}</td>
                  <td>{row.fullNameNormalized}</td>
                  <td>{row.status}</td>
                  <td>{row.issues.length > 0 ? row.issues.join(' ') : '—'}</td>
                  <td>
                    {row.status === 'duplicate' ? (
                      <input
                        type="checkbox"
                        checked={approvedDuplicates.has(row.rowNumber)}
                        onChange={() => toggleDuplicate(row.rowNumber)}
                        aria-label={`Importar de todos modos la fila ${row.rowNumber}: ${row.fullNameOriginal}`}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || rowsToImport.length === 0}
          >
            Confirmar importación de {rowsToImport.length} estudiantes
          </button>
        </div>
      )}
    </section>
  );
}
