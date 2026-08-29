import { useState, type ChangeEvent } from 'react';
import { importRosterFile, type RosterImportResult } from './parseRoster';

export interface ImportRosterPanelProps {
  onConfirm: (result: RosterImportResult) => Promise<void>;
}

export function ImportRosterPanel({ onConfirm }: ImportRosterPanelProps) {
  const [result, setResult] = useState<RosterImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setResult(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setResult(importRosterFile(bytes));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No se pudo leer el archivo.');
    }
  };

  const handleConfirm = async () => {
    if (!result) {
      return;
    }
    setConfirming(true);
    try {
      await onConfirm(result);
      setResult(null);
    } finally {
      setConfirming(false);
    }
  };

  const importableCount = result ? result.validCount + result.duplicateCount : 0;

  return (
    <section aria-label="Importar nómina">
      <label htmlFor="roster-file">Archivo CSV de la nómina</label>
      <input id="roster-file" type="file" accept=".csv" onChange={handleFileChange} />

      {error && <p role="alert">{error}</p>}

      {result && (
        <div>
          <p>
            Codificación detectada: {result.encodingUsed}. Válidas: {result.validCount}. Duplicadas:{' '}
            {result.duplicateCount}. Inválidas: {result.invalidCount}.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Nombre original</th>
                <th scope="col">Nombre normalizado</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.fullNameOriginal}</td>
                  <td>{row.fullNameNormalized}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || importableCount === 0}
          >
            Confirmar importación de {importableCount} estudiantes
          </button>
        </div>
      )}
    </section>
  );
}
