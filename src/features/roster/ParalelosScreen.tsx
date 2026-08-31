import { useEffect, useState, type FormEvent } from 'react';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { getSupabaseClient } from '../../lib/supabase/client';
import { createGroup, listGroups } from '../../lib/api/groups';
import { bulkImportStudents } from '../../lib/api/students';
import { ImportRosterPanel } from './ImportRosterPanel';
import type { Group } from '../../lib/validation/schemas';
import type { RosterCsvRow } from './parseRoster';

const GENERIC_ERROR_MESSAGE = 'Ocurrió un problema. Intenta de nuevo en unos segundos.';

export function ParalelosScreen() {
  const client = getSupabaseClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupYear, setNewGroupYear] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listGroups(client)
      .then(setGroups)
      .catch((loadError: unknown) => {
        console.error(loadError);
        setError(GENERIC_ERROR_MESSAGE);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const group = await createGroup(client, { name: newGroupName, schoolYear: newGroupYear });
      setGroups((current) => [...current, group]);
      setSelectedGroupId(group.id);
      setNewGroupName('');
      setNewGroupYear('');
    } catch (createError) {
      console.error(createError);
      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  const handleImportConfirm = async (rows: RosterCsvRow[]) => {
    setError(null);
    setMessage(null);

    if (!selectedGroupId) {
      setMessage('Selecciona un paralelo antes de importar.');
      // Se lanza para que el panel conserve la vista previa y las casillas ya
      // marcadas; devolver normalmente las descartaría sin haber importado nada.
      throw new Error('No hay paralelo seleccionado.');
    }

    try {
      const { inserted } = await bulkImportStudents(
        client,
        rows.map((row) => ({
          groupId: selectedGroupId,
          fullNameOriginal: row.fullNameOriginal,
          fullNameNormalized: row.fullNameNormalized,
          authorizedVariant: row.authorizedVariantRaw,
        })),
      );

      setMessage(`Se importaron ${inserted} estudiantes.`);
    } catch (importError) {
      console.error(importError);
      setError(GENERIC_ERROR_MESSAGE);
      throw importError;
    }
  };

  return (
    <div className="stack--loose stack">
      <PageHeader
        eyebrow="Panel docente"
        title="Paralelos y nómina"
        lead="Crea un paralelo por curso y carga su nómina desde el CSV que exporta la plataforma institucional."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="info">{message}</Notice>}

      <section className="card stack roster-panel" aria-labelledby="crear-paralelo-titulo">
        <div>
          <h2 id="crear-paralelo-titulo" className="card__title">
            Crear paralelo
          </h2>
          <p className="card__hint">Un paralelo por curso y año lectivo.</p>
        </div>

        <form className="form" onSubmit={handleCreateGroup} aria-label="Crear paralelo">
          <div className="field">
            <label htmlFor="group-name">Nombre del paralelo</label>
            <input
              id="group-name"
              className="input"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="3ro BGU A"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="group-year">Año lectivo</label>
            <input
              id="group-year"
              className="input"
              value={newGroupYear}
              onChange={(event) => setNewGroupYear(event.target.value)}
              placeholder="2026-2027"
              required
            />
          </div>

          <div className="cluster">
            <button type="submit" className="button button--primary">
              Crear paralelo
            </button>
          </div>
        </form>
      </section>

      <section
        className="card stack roster-panel roster-panel--import"
        aria-labelledby="importar-nomina-titulo"
      >
        <div>
          <h2 id="importar-nomina-titulo" className="card__title">
            Importar nómina
          </h2>
          <p className="card__hint">
            El archivo se revisa en tu navegador antes de guardar nada. Ninguna fila se importa
            hasta que confirmes.
          </p>
        </div>

        <div className="field">
          <label htmlFor="group-select">Paralelo activo para importar</label>
          <select
            id="group-select"
            className="select"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
          >
            <option value="">Selecciona un paralelo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.schoolYear})
              </option>
            ))}
          </select>
          {groups.length === 0 && (
            <p className="field__hint">Todavía no hay paralelos: crea uno arriba.</p>
          )}
        </div>

        <ImportRosterPanel onConfirm={handleImportConfirm} />
      </section>
    </div>
  );
}
