import { useState } from 'react';
import './assessmentAiAssistant.css';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Notice } from '../../components/layout/Notice';
import {
  generateAssessmentDraft,
  type GeneratedAssessmentDraft,
} from '../../lib/api/assessmentGeneration';

type GenerationFocus =
  'balanced' | 'reading_comprehension' | 'critical_reasoning' | 'writing_conventions';

interface Props {
  client: SupabaseClient;
  readingText: string;
  purpose: string;
  currentQuestionCount: number;
  loading: boolean;
  onApply: (draft: GeneratedAssessmentDraft) => void;
}

export function AssessmentAiAssistant({
  client,
  readingText,
  purpose,
  currentQuestionCount,
  loading,
  onApply,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedAssessmentDraft | null>(null);
  const [generationCount, setGenerationCount] = useState(
    Math.min(4, Math.max(1, currentQuestionCount || 3)),
  );
  const [generationFocus, setGenerationFocus] = useState<GenerationFocus>('balanced');

  const onGenerate = async () => {
    setGenerationError(false);
    setGeneratedDraft(null);
    setIsGenerating(true);
    try {
      const draft = await generateAssessmentDraft(client, {
        readingText,
        purpose,
        questionCount: generationCount,
        focus: generationFocus,
      });
      setGeneratedDraft(draft);
    } catch (error) {
      console.error(error);
      setGenerationError(true);
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
              onChange={(event) => setGenerationCount(Number(event.target.value))}
            >
              {[1, 2, 3, 4].map((count) => (
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

      {generationError && (
        <Notice tone="error">No pudimos generar una propuesta. Inténtalo nuevamente.</Notice>
      )}

      {generatedDraft && (
        <section className="assessment-ai-proposal" aria-labelledby="assessment-ai-proposal-title">
          <div className="assessment-ai-proposal__header">
            <div>
              <p className="mono-label">Revisión requerida</p>
              <h2 id="assessment-ai-proposal-title">Propuesta de IA</h2>
              <p>Revísala antes de aplicarla al formulario. La lectura no se modifica.</p>
            </div>
            <div className="assessment-ai-proposal__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setGeneratedDraft(null)}
              >
                Descartar propuesta
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  onApply(generatedDraft);
                  setGeneratedDraft(null);
                }}
              >
                Aplicar borrador generado
              </button>
            </div>
          </div>
          <div className="assessment-ai-proposal__body stack">
            <div>
              <p className="mono-label">Título propuesto</p>
              <p>{generatedDraft.title}</p>
            </div>
            <div>
              <p className="mono-label">Propósito</p>
              <p>{generatedDraft.purpose}</p>
            </div>
            <ol className="assessment-ai-proposal__questions">
              {generatedDraft.questions.map((question) => (
                <li key={question.position}>
                  <strong>{question.prompt}</strong>
                  {question.instructions && <span>{question.instructions}</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
