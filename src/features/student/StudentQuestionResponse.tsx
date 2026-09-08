import { useState, type ClipboardEvent } from 'react';
import type { StudentAssessment } from '../../lib/api/studentAssessment';
import { INPUT_LIMITS, unicodeLength } from '../../../supabase/functions/_shared/inputLimits';
import { prepareReadingPaste } from './readingPaste';

interface StudentQuestionResponseProps {
  question: StudentAssessment['questions'][number];
  response: string;
  readingText: string;
  pastePolicy: StudentAssessment['pastePolicy'];
  onChange: (text: string) => void;
  onBlur: () => void;
  disabled?: boolean;
}

export function StudentQuestionResponse({
  question,
  response,
  readingText,
  pastePolicy,
  onChange,
  onBlur,
  disabled = false,
}: StudentQuestionResponseProps) {
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [lengthNotice, setLengthNotice] = useState<string | null>(null);

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (pastePolicy === 'allow') return;

    event.preventDefault();
    const result = prepareReadingPaste(event.clipboardData.getData('text/plain'), readingText);
    if (!result.ok) {
      setPasteNotice(
        result.reason === 'too_long'
          ? 'El fragmento supera el máximo de 40 palabras. Selecciona una cita más breve de la lectura.'
          : 'Solo puedes pegar fragmentos que aparezcan en la lectura. Escribe el resto con tus propias palabras.',
      );
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const candidate = `${response.slice(0, selectionStart)}${result.text}${response.slice(selectionEnd)}`;
    if (unicodeLength(candidate) > INPUT_LIMITS.responseChars) {
      setPasteNotice(
        `Pegar esta cita superaría ${INPUT_LIMITS.responseChars.toLocaleString('es-EC')} caracteres. Acorta tu respuesta antes de pegarla.`,
      );
      return;
    }
    onChange(candidate);
    setPasteNotice(null);

    const nextCursorPosition = selectionStart + result.text.length;
    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const characterCount = unicodeLength(response);
  const counterId = `response-${question.id}-character-count`;
  const pasteHelpId = `response-${question.id}-paste-help`;
  const pasteNoticeId = `response-${question.id}-paste-notice`;
  const lengthNoticeId = `response-${question.id}-length-notice`;
  const lengthHelpId = `response-${question.id}-length-help`;
  const lengthHelp =
    question.suggestedMinWords !== null && question.suggestedMaxWords !== null
      ? `Extensión sugerida: entre ${question.suggestedMinWords} y ${question.suggestedMaxWords} palabras.`
      : question.suggestedMinWords !== null
        ? `Extensión sugerida: al menos ${question.suggestedMinWords} palabras.`
        : question.suggestedMaxWords !== null
          ? `Extensión sugerida: hasta ${question.suggestedMaxWords} palabras.`
          : null;
  const describedBy = [
    counterId,
    lengthHelp ? lengthHelpId : null,
    pastePolicy === 'discourage' ? pasteHelpId : null,
    pasteNotice ? pasteNoticeId : null,
    lengthNotice ? lengthNoticeId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="panel response-question stack">
      <p className="mono-label">Pregunta {question.position}</p>
      <h2>{question.prompt}</h2>
      {question.instructions && <p>{question.instructions}</p>}
      <label htmlFor={`response-${question.id}`}>Respuesta a la pregunta {question.position}</label>
      <textarea
        id={`response-${question.id}`}
        className="textarea"
        rows={10}
        value={response}
        disabled={disabled}
        aria-describedby={describedBy || undefined}
        onChange={(event) => {
          if (unicodeLength(event.target.value) > INPUT_LIMITS.responseChars) {
            setLengthNotice(
              `Alcanzaste el máximo de ${INPUT_LIMITS.responseChars.toLocaleString('es-EC')} caracteres. El texto que ya escribiste se conserva.`,
            );
            return;
          }
          onChange(event.target.value);
          setLengthNotice(null);
          setPasteNotice(null);
        }}
        onBlur={onBlur}
        onPaste={handlePaste}
      />
      <p id={counterId} className="field-hint" aria-live="polite">
        {`${characterCount.toLocaleString('es-EC')} de ${INPUT_LIMITS.responseChars.toLocaleString('es-EC')} caracteres`}
      </p>
      {lengthHelp && (
        <p id={lengthHelpId} className="field-hint">
          {lengthHelp}
        </p>
      )}
      {pastePolicy === 'discourage' && (
        <p id={pasteHelpId} className="field-hint">
          Puedes pegar citas de hasta 40 palabras tomadas de la lectura. Las añadiremos entre
          comillas automáticamente.
        </p>
      )}
      {pasteNotice && (
        <p id={pasteNoticeId} className="notice-inline" role="alert">
          {pasteNotice}
        </p>
      )}
      {lengthNotice && (
        <p id={lengthNoticeId} className="notice-inline" role="alert">
          {lengthNotice}
        </p>
      )}
    </section>
  );
}
