import { useState } from 'react';
import './assessmentAiAssistant.css';
import type { SupabaseClient } from '@supabase/supabase-js';
import rubric from '../../../rubric-v1.json';
import { Notice } from '../../components/layout/Notice';
import {
  AssessmentGenerationError,
  GENERATION_LIMITS,
  generateAssessmentDraft,
  type GeneratedAssessmentDraft,
  type GenerationFocus,
} from '../../lib/api/assessmentGeneration';
import { generationSignature } from './generationSignature';

interface Props {
  client: SupabaseClient;
  readingText: string;
  purpose: string;
  /**
   * Preguntas que traía el borrador recuperado, o 0 si no había ninguno. No sigue la
   * edición en curso: es el dato con el que se calcula la cantidad recomendada.
   */
  draftQuestionCount: number;
  loading: boolean;
  onApply: (draft: GeneratedAssessmentDraft) => void;
}

const QUESTION_OPTIONS = Array.from(
  { length: GENERATION_LIMITS.maxQuestions - GENERATION_LIMITS.minQuestions + 1 },
  (_, index) => GENERATION_LIMITS.minQuestions + index,
);

const RUBRIC_LABELS = new Map<string, string>([
  ...rubric.coreCriteria.map(({ id, label }) => [id, label] as const),
  ...rubric.optionalModules.map(({ id, label }) => [id, label] as const),
]);

const STALE_MESSAGE = 'La propuesta dejó de corresponder a los datos actuales. Genera una nueva.';

type GenerationOutcome =
  | { kind: 'draft'; revision: number; draft: GeneratedAssessmentDraft }
  | { kind: 'error'; revision: number; message: string };

function labelsFor(ids: readonly string[]): string {
  return ids.map((id) => RUBRIC_LABELS.get(id) ?? id).join(' · ');
}

function wordRangeLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `De ${min} a ${max} palabras`;
  if (min !== null) return `Desde ${min} palabras`;
  if (max !== null) return `Hasta ${max} palabras`;
  return 'Sin extensión sugerida';
}

/**
 * Con un borrador recuperado se propone su misma cantidad de preguntas; si no existe una
 * cantidad significativa se recomienda 3, la extensión diagnóstica habitual.
 */
function recommendGenerationCount(draftQuestionCount: number): number {
  return Number.isInteger(draftQuestionCount) &&
    draftQuestionCount >= GENERATION_LIMITS.minQuestions &&
    draftQuestionCount <= GENERATION_LIMITS.maxQuestions
    ? draftQuestionCount
    : GENERATION_LIMITS.defaultQuestions;
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mono-label">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function ProposalQuestion({
  question,
}: {
  question: GeneratedAssessmentDraft['questions'][number];
}) {
  return (
    <li>
      <strong>{question.prompt}</strong>
      <span>Indicaciones: {question.instructions || 'Sin indicaciones específicas.'}</span>
      <span>
        Extensión: {wordRangeLabel(question.suggestedMinWords, question.suggestedMaxWords)}
      </span>
      <span>Criterios: {labelsFor(question.activeCriteria)}</span>
      <span>
        Módulos: {question.activeModules.length > 0 ? labelsFor(question.activeModules) : 'Ninguno'}
      </span>
    </li>
  );
}

/**
 * Vista previa íntegra de lo que se reemplazará en el formulario. El docente debe poder
 * ver cada campo antes de confirmar; nada se aplica desde aquí sin su clic.
 */
function ProposalPreview({
  draft,
  onDiscard,
  onApply,
}: {
  draft: GeneratedAssessmentDraft;
  onDiscard: () => void;
  onApply: () => void;
}) {
  return (
    <section className="assessment-ai-proposal" aria-labelledby="assessment-ai-proposal-title">
      <div className="assessment-ai-proposal__header">
        <div>
          <p className="mono-label">Revisión requerida</p>
          <h2 id="assessment-ai-proposal-title">Propuesta de IA</h2>
          <p>
            Esto es todo lo que se reemplazará en el formulario. Revísalo antes de aplicarlo. La
            lectura no se modifica.
          </p>
        </div>
        <div className="assessment-ai-proposal__actions">
          <button type="button" className="button button--quiet" onClick={onDiscard}>
            Descartar propuesta
          </button>
          <button type="button" className="button button--primary" onClick={onApply}>
            Aplicar borrador generado
          </button>
        </div>
      </div>
      <div className="assessment-ai-proposal__body stack">
        <ProposalField label="Título propuesto" value={draft.title} />
        <ProposalField label="Propósito propuesto" value={draft.purpose} />
        <ProposalField
          label="Instrucciones generales propuestas"
          value={draft.generalInstructions || 'Sin instrucciones generales.'}
        />
        <ol className="assessment-ai-proposal__questions">
          {draft.questions.map((question) => (
            <ProposalQuestion key={question.position} question={question} />
          ))}
        </ol>
        <p className="assessment-ai-proposal__note">
          La alineación curricular no la propone la IA: permanece bajo tu decisión docente.
        </p>
      </div>
    </section>
  );
}

export function AssessmentAiAssistant({
  client,
  readingText,
  purpose,
  draftQuestionCount,
  loading,
  onApply,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualCount, setManualCount] = useState<number | null>(null);
  const [generationFocus, setGenerationFocus] = useState<GenerationFocus>('balanced');
  const [staleNotice, setStaleNotice] = useState(false);
  /** Resultado de la última solicitud, atado a la revisión con la que se pidió. */
  const [outcome, setOutcome] = useState<GenerationOutcome | null>(null);

  // La cantidad se deriva del borrador recuperado, así que se sincroniza sola cuando
  // termina la carga; en cuanto el docente elige un valor, esa elección manda siempre.
  const generationCount = manualCount ?? recommendGenerationCount(draftQuestionCount);

  const signature = generationSignature({
    readingText,
    purpose,
    questionCount: generationCount,
    focus: generationFocus,
  });

  // Comparar solo la firma no basta: si el docente cambia un dato y luego lo restaura, la
  // firma vuelve a coincidir y una propuesta ya invalidada podría reaparecer o aplicarse.
  // Por eso se lleva una revisión monótona que registra que hubo un cambio. Cada solicitud
  // queda atada a la revisión con la que salió y una revisión consumida nunca se repite.
  const [tracking, setTracking] = useState(() => ({ signature, revision: 0 }));

  // Ajuste de estado durante el render: patrón de React para reaccionar a un cambio de los
  // datos de entrada sin un efecto adicional. Converge en un solo re-render.
  if (tracking.signature !== signature) {
    setTracking({ signature, revision: tracking.revision + 1 });
    // El resultado se elimina de verdad, no se oculta: restaurar el valor no puede revivirlo.
    if (outcome !== null || isGenerating) setStaleNotice(true);
    setOutcome(null);
  } else if (outcome !== null && outcome.revision !== tracking.revision) {
    // Respuesta tardía de una solicitud ya invalidada, incluso si los datos volvieron a ser
    // iguales mientras estaba en curso.
    setOutcome(null);
    setStaleNotice(true);
  }

  const proposal = outcome?.kind === 'draft' ? outcome.draft : null;
  const generationError = outcome?.kind === 'error' ? outcome.message : null;

  const onGenerate = async () => {
    setStaleNotice(false);
    setOutcome(null);
    setIsGenerating(true);
    const revision = tracking.revision;
    try {
      const draft = await generateAssessmentDraft(client, {
        readingText,
        purpose,
        questionCount: generationCount,
        focus: generationFocus,
      });
      setOutcome({ kind: 'draft', revision, draft });
    } catch (error) {
      console.error(error);
      setOutcome({
        kind: 'error',
        revision,
        message:
          error instanceof AssessmentGenerationError
            ? error.message
            : 'El asistente no está disponible en este momento. Inténtalo nuevamente.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="assessment-ai-assistant" aria-labelledby="assessment-ai-title">
        <div>
          <p className="mono-label">Asistente de preparación</p>
          <h3 id="assessment-ai-title">Generar un borrador con IA</h3>
          <p>
            Usa la lectura como contexto y recibe preguntas abiertas con criterios sugeridos. Nada
            se aplica hasta que lo confirmes.
          </p>
        </div>
        <div className="assessment-ai-assistant__controls">
          <label className="field">
            <span>Preguntas</span>
            <select
              className="select"
              aria-label="Cantidad de preguntas generadas"
              value={generationCount}
              onChange={(event) => setManualCount(Number(event.target.value))}
            >
              {QUESTION_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Foco diagnóstico</span>
            <select
              className="select"
              value={generationFocus}
              onChange={(event) => setGenerationFocus(event.target.value as GenerationFocus)}
            >
              <option value="balanced">Equilibrado</option>
              <option value="reading_comprehension">Comprensión lectora</option>
              <option value="critical_reasoning">Razonamiento crítico</option>
              <option value="writing_conventions">Escritura y convenciones</option>
            </select>
          </label>
          <button
            type="button"
            className="button button--secondary"
            disabled={isGenerating || loading || !readingText.trim()}
            onClick={() => void onGenerate()}
          >
            {isGenerating ? 'Generando…' : 'Generar borrador con IA'}
          </button>
        </div>
      </div>

      {generationError && <Notice tone="error">{generationError}</Notice>}
      {staleNotice && <Notice tone="warning">{STALE_MESSAGE}</Notice>}

      {proposal && (
        <ProposalPreview
          draft={proposal}
          onDiscard={() => setOutcome(null)}
          onApply={() => {
            onApply(proposal);
            setOutcome(null);
          }}
        />
      )}
    </>
  );
}
