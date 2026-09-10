import { useEffect, useState } from 'react';
import { Notice } from '../../components/layout/Notice';
import { getSupabaseClient } from '../../lib/supabase/client';
import { closeAssessment, updateAssessmentSchedule } from '../../lib/api/assessments';
import { extendAssessment, type AccessOverview } from '../../lib/api/assessmentAccess';
import type { Group } from '../../lib/validation/schemas';
import { assessmentAvailability } from '../../../supabase/functions/_shared/studentAccessErrors';

function localDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const isoDate = (value: string) => (value ? new Date(value).toISOString() : null);

export function AssessmentOperations({
  overview,
  groups,
  onChanged,
  selectedGroupId,
  onGroupChange,
}: {
  overview: AccessOverview;
  groups: Group[];
  onChanged: (next: AccessOverview | null) => void;
  selectedGroupId?: string;
  onGroupChange?: (groupId: string) => void;
}) {
  const [opens, setOpens] = useState(() => localDate(overview.opensAt));
  const [closes, setCloses] = useState(() => localDate(overview.closesAt));
  const [localGroup, setLocalGroup] = useState('');
  const group = selectedGroupId ?? localGroup;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const hasSchedule = overview.opensAt !== undefined && overview.closesAt !== undefined;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const availability = assessmentAvailability(
    overview.opensAt ?? null,
    overview.closesAt ?? null,
    now,
  );
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel stack" aria-label="Administrar evaluación publicada">
      <Notice tone="info">
        {!hasSchedule
          ? 'No se pudo consultar el horario. Actualiza la aplicación antes de modificarlo.'
          : availability === 'assessment_not_started'
            ? 'Programada: todavía no permite ingresar.'
            : availability === 'assessment_closed'
              ? 'El horario terminó: ya no admite entregas.'
              : 'Disponible: el horario permite ingresar.'}
      </Notice>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <p role="status">{message}</p>}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!hasSchedule) return;
          void run(async () => {
            const opensAt = isoDate(opens),
              closesAt = isoDate(closes);
            await updateAssessmentSchedule(
              getSupabaseClient(),
              overview.assessmentId,
              opensAt,
              closesAt,
            );
            onChanged({ ...overview, opensAt, closesAt });
            setNow(Date.now());
            setMessage('Horario guardado.');
          });
        }}
      >
        <h3>Horario de ingreso y entrega</h3>
        <p>
          Horas de este equipo ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Un campo vacío
          significa sin límite de inicio o cierre.
        </p>
        <label>
          Inicio de la evaluación
          <input
            className="input"
            type="datetime-local"
            value={opens}
            disabled={busy}
            onChange={(e) => setOpens(e.target.value)}
          />
        </label>
        <label>
          Cierre de la evaluación
          <input
            className="input"
            type="datetime-local"
            value={closes}
            disabled={busy}
            onChange={(e) => setCloses(e.target.value)}
          />
        </label>
        <button className="button" disabled={busy || !hasSchedule}>
          Guardar horario
        </button>
      </form>
      <div className="stack">
        <h3>Incorporar accesos faltantes</h3>
        <p>
          Selecciona un paralelo nuevo o uno cuya nómina hayas ampliado. Solo se generan códigos
          para quienes aún no tienen acceso; los códigos y las respuestas existentes se conservan.
        </p>
        <label>
          Paralelo para incorporar
          <select
            className="select"
            value={group}
            disabled={busy}
            onChange={(e) => {
              setLocalGroup(e.target.value);
              onGroupChange?.(e.target.value);
            }}
          >
            <option value="">Selecciona un paralelo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.schoolYear})
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          disabled={busy || !group}
          onClick={() =>
            void run(async () => {
              const next = await extendAssessment(
                getSupabaseClient(),
                overview.assessmentId,
                group,
              );
              const added = next.accesses.length - overview.accesses.length;
              onChanged(next);
              setMessage(
                added > 0
                  ? `Se añadieron ${added} accesos. Puedes descargar la lista actualizada.`
                  : 'Todos los estudiantes de este paralelo ya tenían acceso.',
              );
            })
          }
        >
          Generar accesos faltantes
        </button>
      </div>
      <button
        className="button"
        disabled={busy}
        onClick={() => {
          if (
            !window.confirm(
              '¿Cerrar la evaluación? Se conservarán las respuestas, pero nadie podrá ingresar ni entregar, incluso si ya empezó. Esta pantalla no permite reabrirla.',
            )
          )
            return;
          void run(async () => {
            await closeAssessment(getSupabaseClient(), overview.assessmentId);
            onChanged(null);
          });
        }}
      >
        Cerrar evaluación
      </button>
    </section>
  );
}
