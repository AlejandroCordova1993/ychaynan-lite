import { useState, type ClipboardEvent } from 'react';
import type { StudentAssessment } from '../../lib/api/studentAssessment';
import { prepareReadingPaste } from './readingPaste';

interface StudentQuestionResponseProps {
  question: StudentAssessment['questions'][number];
  response: string;
  readingText: string;
  pastePolicy: StudentAssessment['pastePolicy'];
  onChange: (text: string) => void;
  onBlur: () => void;
}

export function StudentQuestionResponse({
  question,
  response,
  readingText,
  pastePolicy,
  onChange,
  onBlur,
}: StudentQuestionResponseProps) {
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

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
    onChange(`${response.slice(0, selectionStart)}${result.text}${response.slice(selectionEnd)}`);
    setPasteNotice(null);

    const nextCursorPosition = selectionStart + result.text.length;
    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const pasteHelpId = `response-${question.id}-paste-help`;
  const pasteNoticeId = `response-${question.id}-paste-notice`;

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
        aria-describedby={
          pastePolicy === 'discourage'
            ? `${pasteHelpId}${pasteNotice ? ` ${pasteNoticeId}` : ''}`
            : undefined
        }
        onChange={(event) => {
          onChange(event.target.value);
          setPasteNotice(null);
        }}
        onBlur={onBlur}
        onPaste={handlePaste}
      />
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
    </section>
  );
}
