import { useState } from 'react';
import { addStudent } from '../../lib/api/students';
import { getSupabaseClient } from '../../lib/supabase/client';
import { Notice } from '../../components/layout/Notice';

export function AddStudentForm({ groupId }: { groupId: string }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <form
      className="panel form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setDone(false);
        try {
          await addStudent(getSupabaseClient(), groupId, name);
          setName('');
          setDone(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo añadir el estudiante.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Añadir un estudiante sin archivo</h3>
      <label>
        Nombre completo del estudiante
        <input
          className="input"
          required
          maxLength={160}
          value={name}
          disabled={busy}
          onChange={(e) => {
            setName(e.target.value);
            setDone(false);
          }}
        />
      </label>
      <button className="button" disabled={busy || !groupId || !name.trim()}>
        Añadir estudiante
      </button>
      {error && <Notice tone="error">{error}</Notice>}
      {done && (
        <Notice tone="info">
          Estudiante añadido a la nómina. Si la evaluación ya está publicada, ve a Distribuir
          accesos, selecciona este paralelo y pulsa Generar accesos faltantes.
        </Notice>
      )}
    </form>
  );
}
