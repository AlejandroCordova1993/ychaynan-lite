import { useEffect, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { createGroup, listGroups } from '../../lib/api/groups';
import { bulkImportStudents } from '../../lib/api/students';
import { ImportRosterPanel } from './ImportRosterPanel';
import type { Group } from '../../lib/validation/schemas';
import type { RosterImportResult } from './parseRoster';

export function ParalelosScreen() {
  const client = getSupabaseClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupYear, setNewGroupYear] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listGroups(client).then(setGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    const group = await createGroup(client, { name: newGroupName, schoolYear: newGroupYear });
    setGroups((current) => [...current, group]);
    setSelectedGroupId(group.id);
    setNewGroupName('');
    setNewGroupYear('');
  };

  const handleImportConfirm = async (result: RosterImportResult) => {
    if (!selectedGroupId) {
      setMessage('Selecciona un paralelo antes de importar.');
      return;
    }

    const importableRows = result.rows.filter(
      (row) => row.status === 'valid' || row.status === 'duplicate',
    );

    const { inserted } = await bulkImportStudents(
      client,
      importableRows.map((row) => ({
        groupId: selectedGroupId,
        fullNameOriginal: row.fullNameOriginal,
        fullNameNormalized: row.fullNameNormalized,
        authorizedVariant: row.authorizedVariantRaw,
      })),
    );

    setMessage(`Se importaron ${inserted} estudiantes.`);
  };

  return (
    <main>
      <h1>Paralelos y nómina</h1>

      <form onSubmit={handleCreateGroup} aria-label="Crear paralelo">
        <label htmlFor="group-name">Nombre del paralelo</label>
        <input
          id="group-name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          required
        />

        <label htmlFor="group-year">Año lectivo</label>
        <input
          id="group-year"
          value={newGroupYear}
          onChange={(event) => setNewGroupYear(event.target.value)}
          required
        />

        <button type="submit">Crear paralelo</button>
      </form>

      <label htmlFor="group-select">Paralelo activo para importar</label>
      <select
        id="group-select"
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

      {message && <p role="status">{message}</p>}

      <ImportRosterPanel onConfirm={handleImportConfirm} />
    </main>
  );
}
