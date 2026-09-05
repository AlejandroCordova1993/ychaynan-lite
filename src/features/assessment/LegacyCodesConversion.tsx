import { Notice } from '../../components/layout/Notice';
import { pluralize } from './accessLabels';

interface LegacyCodesConversionProps {
  legacyCount: number;
  activeSessions: number;
  confirming: boolean;
  rotating: boolean;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Los códigos aleatorios anteriores no pueden reconstruirse: convertirlos exige
 * una confirmación explícita porque cierra las sesiones abiertas.
 */
export function LegacyCodesConversion({
  legacyCount,
  activeSessions,
  confirming,
  rotating,
  onStart,
  onCancel,
  onConfirm,
}: LegacyCodesConversionProps) {
  return (
    <div className="stack">
      <Notice tone="warning">
        Los códigos actuales se generaron con el formato anterior y no pueden recuperarse. Regenera
        la lista para poder consultarla y descargarla en adelante.
      </Notice>
      {confirming ? (
        <div className="stack">
          <p>
            Se regenerarán {pluralize(legacyCount, 'código', 'códigos')} y se cerrarán{' '}
            {pluralize(activeSessions, 'sesión activa', 'sesiones activas')}. Los borradores y las
            respuestas guardadas se conservan.
          </p>
          <div className="cluster">
            <button
              type="button"
              className="button button--primary"
              disabled={rotating}
              onClick={onConfirm}
            >
              {legacyCount === 1
                ? 'Sí, regenerar 1 código'
                : `Sí, regenerar los ${legacyCount} códigos`}
            </button>
            <button
              type="button"
              className="button button--secondary"
              disabled={rotating}
              onClick={onCancel}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="button button--secondary" onClick={onStart}>
          Regenerar lista completa
        </button>
      )}
    </div>
  );
}
