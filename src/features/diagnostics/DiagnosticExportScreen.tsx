/**
 * Pantalla «Exportar» (spec §6).
 *
 * Reutiliza tal cual la selección (`DiagnosticFilters`) y la orquestación
 * (`useDiagnosticReport`) del resumen diagnóstico: el archivo no puede contener
 * un universo distinto del que la docente acaba de leer. No calcula ningún
 * agregado — las cifras del resumen previo salen de `computeDiagnosticMetrics`
 * y las filas, de `buildDiagnosticCsv`/`buildDiagnosticWorkbook`.
 *
 * Dos reglas gobiernan los botones:
 *
 * 1. El libro de Excel se construye **solo** dentro del manejador de su botón.
 *    No hay ningún efecto que lo precalcule al cargar el informe: el
 *    `await import('exceljs')` que hay dentro de `buildDiagnosticWorkbook` debe
 *    dispararse cuando la docente lo pide, nunca por estar en esta pantalla.
 * 2. Si alguna entrega viola el contrato (§9), ambas descargas quedan
 *    bloqueadas y se cita cuál y por qué. El constructor de filas trata una
 *    entrega con contrato inválido igual que una sin resultado (celdas vacías),
 *    así que sin este bloqueo el archivo se vería completo sin serlo.
 */
import { useState } from 'react';
import './diagnostics.css';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { DiagnosticFilters } from './DiagnosticFilters';
import { buildDiagnosticCsv, diagnosticFileName } from './diagnosticCsv';
import type { DiagnosticContractErrorCode } from './diagnosticModel';
import { ASSESSMENT_STATUS_LABELS, SOURCE_LABELS, formatDateTime } from './diagnosticPresentation';
import { buildDiagnosticWorkbook } from './diagnosticWorkbook';
import { useDiagnosticReport } from './useDiagnosticReport';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Motivo legible de cada violación de contrato, con su remedio implícito (§9). */
const CONTRACT_ERROR_REASONS: Readonly<Record<DiagnosticContractErrorCode, string>> = {
  invalid_payload: 'La salida de IA no cumple el contrato de resultado.',
  adjustment_invalid_shape: 'Los ajustes docentes de esa revisión tienen una forma inválida.',
  adjustment_duplicated: 'Hay dos ajustes docentes para el mismo criterio de la misma pregunta.',
  adjustment_unknown_target:
    'Un ajuste docente apunta a un criterio o módulo que no estaba activo en esa pregunta.',
};

/**
 * Descarga en el cliente, con el mismo mecanismo que ya usa
 * `AccessManagementScreen` para su CSV de códigos: `Blob` + ancla `download`
 * revocando la URL al terminar. El archivo se arma en memoria y no sube a
 * Supabase ni a un tercero (§7).
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Segmento `<fecha>` del nombre de archivo, derivado del **mismo** `loadedAt`
 * con el que se cargó el informe: nunca de un `new Date()` al pulsar el botón.
 */
function cutoffDateSegment(loadedAt: string): string {
  const date = new Date(loadedAt);
  return Number.isNaN(date.getTime()) ? loadedAt : date.toISOString().slice(0, 10);
}

export function DiagnosticExportScreen() {
  const { selection, filteredReport, fullMetrics, metrics, loading, error, onSelectionChange } =
    useDiagnosticReport();
  const [building, setBuilding] = useState<'csv' | 'xlsx' | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);

  // Los errores de contrato se leen del informe **completo**, no del filtrado
  // por fuente: una entrega rota no tiene procedencia utilizable, así que
  // cualquier filtro distinto de «todos» la dejaría fuera y desbloquearía la
  // descarga sin que nadie la haya corregido.
  const contractErrors = fullMetrics?.contractErrors ?? [];
  const namesById = new Map(
    (fullMetrics?.students ?? []).map((item) => [item.studentId, item.studentName]),
  );
  const loaded =
    !loading && !error && filteredReport !== null && metrics !== null && fullMetrics !== null;
  // «Paralelo vacío» se decide sobre el informe **completo**, igual que en el
  // resumen: la nómina no depende de la fuente elegida. Usar aquí las métricas
  // filtradas hacía que «Solo revisados» en un paralelo sin revisiones acusara
  // al paralelo de no tener estudiantes, mandando a la docente a revisar una
  // nómina correcta.
  const emptyGroup = loaded && fullMetrics.coverage.expected === 0;
  // La fuente sí puede dejar la selección vacía; eso también bloquea, pero por
  // otro motivo y con otro remedio.
  const emptySource = loaded && !emptyGroup && metrics.coverage.expected === 0;
  const ready = loaded && !emptyGroup && !emptySource && contractErrors.length === 0;
  const busy = building !== null;

  const fileNameFor = (extension: 'csv' | 'xlsx'): string =>
    metrics === null
      ? ''
      : diagnosticFileName(
          metrics.assessment.title,
          metrics.group.name,
          cutoffDateSegment(metrics.loadedAt),
          extension,
        );

  const handleCsv = () => {
    if (!ready || busy || filteredReport === null || metrics === null) return;
    setDownloadFailed(false);
    setBuilding('csv');
    try {
      const csv = buildDiagnosticCsv(filteredReport, metrics);
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileNameFor('csv'));
    } catch {
      setDownloadFailed(true);
    } finally {
      setBuilding(null);
    }
  };

  const handleExcel = async () => {
    if (!ready || busy || filteredReport === null || metrics === null) return;
    setDownloadFailed(false);
    setBuilding('xlsx');
    try {
      // Único punto de todo el módulo donde se construye el libro: aquí es
      // donde el import diferido de `exceljs` llega a ejecutarse. Se pasa la
      // fuente activa para que la hoja `Resumen` registre, con su propio
      // texto, qué filtro produjo el archivo (§9): sin esto, un archivo
      // exportado con «Solo revisados» o «Solo provisionales» no dejaba
      // ningún rastro de que era una vista parcial del paralelo.
      const buffer = await buildDiagnosticWorkbook(
        filteredReport,
        metrics,
        selection?.source ?? 'todos',
      );
      triggerDownload(new Blob([buffer], { type: XLSX_MIME }), fileNameFor('xlsx'));
    } catch {
      setDownloadFailed(true);
    } finally {
      setBuilding(null);
    }
  };

  return (
    <div className="diagnostic-export stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · exportación"
        title="Exportar"
        lead="Descarga los resultados de una evaluación aplicada, para un paralelo, en Excel o CSV. El archivo se arma en tu navegador: no se sube a ningún servicio."
      />
      <DiagnosticFilters onSelectionChange={onSelectionChange} disabled={loading || busy} />
      {loading && <p role="status">Preparando el informe para exportar…</p>}
      {error && (
        <Notice tone="error">
          No pudimos cargar el informe de este paralelo. Vuelve a elegir la evaluación o actualiza
          la página para intentarlo nuevamente.
        </Notice>
      )}
      {emptyGroup && (
        <Notice tone="info">
          Este paralelo no tiene estudiantes con acceso a la evaluación seleccionada: no hay nada
          que exportar.
        </Notice>
      )}
      {emptySource && (
        <Notice tone="info">
          La fuente «{SOURCE_LABELS[selection?.source ?? 'todos']}» no incluye ningún resultado de
          este paralelo: no hay nada que exportar. El paralelo sí tiene{' '}
          {fullMetrics.coverage.expected} estudiante(s) con acceso; cambia la fuente de resultados
          para incluirlos.
        </Notice>
      )}
      {contractErrors.length > 0 && (
        <div role="alert" className="notice notice--error">
          <span className="notice__icon" aria-hidden="true">
            !
          </span>
          <div className="stack">
            <p>
              Exportación bloqueada: {contractErrors.length} entrega(s) tienen una salida de IA que
              viola el contrato y aparecerían en el archivo sin niveles, como si no se hubieran
              evaluado.
            </p>
            <ul>
              {contractErrors.map((item) => (
                <li key={`${item.studentId} ${item.evaluationId ?? ''} ${item.code}`}>
                  <strong>{namesById.get(item.studentId) ?? item.studentId}</strong>:{' '}
                  {CONTRACT_ERROR_REASONS[item.code]}
                </li>
              ))}
            </ul>
            <p>
              Reevalúa o descarta cada una desde el detalle de la entrega y vuelve a cargar el
              informe; no se excluyen en silencio del archivo.
            </p>
          </div>
        </div>
      )}
      {loaded && !emptyGroup && !emptySource && (
        <section className="stack" aria-labelledby="exportar-resumen">
          <h2 id="exportar-resumen">Antes de descargar</h2>
          <div role="group" aria-label="Resumen del archivo">
            <dl className="cluster">
              <div>
                <dt className="mono-label">Evaluación</dt>
                <dd>{metrics.assessment.title}</dd>
              </div>
              <div>
                <dt className="mono-label">Estado de la evaluación</dt>
                <dd>
                  {ASSESSMENT_STATUS_LABELS[metrics.assessment.status] ?? metrics.assessment.status}
                </dd>
              </div>
              <div>
                <dt className="mono-label">Paralelo</dt>
                <dd>{metrics.group.name}</dd>
              </div>
              <div>
                <dt className="mono-label">Estudiantes incluidos</dt>
                <dd>{metrics.coverage.expected}</dd>
              </div>
              <div>
                <dt className="mono-label">Resultados revisados incluidos</dt>
                <dd>{metrics.coverage.reviewed}</dd>
              </div>
              <div>
                <dt className="mono-label">Resultados provisionales incluidos</dt>
                <dd>{metrics.coverage.provisional}</dd>
              </div>
              <div>
                <dt className="mono-label">Fecha y hora del corte</dt>
                <dd>{formatDateTime(metrics.loadedAt)}</dd>
              </div>
            </dl>
          </div>
          {metrics.coverage.provisional > 0 && (
            <Notice tone="warning">
              Resultados mixtos: contienen evaluación provisional de IA
            </Notice>
          )}
        </section>
      )}
      <Notice tone="warning">
        El archivo contiene datos personales de las y los estudiantes y sus respuestas originales.
        Guárdalo únicamente en un lugar autorizado por la institución y no lo compartas por canales
        abiertos.
      </Notice>
      {downloadFailed && (
        <Notice tone="error">
          No pudimos generar el archivo. Inténtalo nuevamente; si vuelve a fallar, recarga la
          página.
        </Notice>
      )}
      <div className="cluster">
        <button
          type="button"
          className="button button--primary"
          disabled={!ready || busy}
          onClick={handleCsv}
        >
          Descargar CSV
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!ready || busy}
          aria-busy={building === 'xlsx'}
          onClick={() => void handleExcel()}
        >
          {building === 'xlsx' ? 'Generando el archivo de Excel…' : 'Descargar Excel'}
        </button>
      </div>
      <p className="text-small text-muted">
        El CSV es una tabla larga (una fila por estudiante, pregunta y criterio) lista para Google
        Sheets. El Excel trae cinco hojas: Resumen, Estudiantes, Criterios, Respuestas y
        Observaciones. Ambos conservan la fecha del corte que se muestra arriba.
      </p>
    </div>
  );
}
