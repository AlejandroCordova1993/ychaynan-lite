import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { StudentAssessment } from '../../lib/api/studentAssessment';
import { StudentQuestionResponse } from './StudentQuestionResponse';

const baseQuestion: StudentAssessment['questions'][number] = {
  id: 'q1',
  position: 1,
  prompt: '¿Qué piensas?',
  instructions: '',
  suggestedMinWords: null,
  suggestedMaxWords: null,
};

function renderQuestion(
  overrides: {
    response?: string;
    readingText?: string;
    pastePolicy?: StudentAssessment['pastePolicy'];
    onChange?: (text: string) => void;
  } = {},
) {
  const {
    response = '',
    readingText = '',
    pastePolicy = 'discourage',
    onChange = vi.fn(),
  } = overrides;
  render(
    <StudentQuestionResponse
      question={baseQuestion}
      response={response}
      readingText={readingText}
      pastePolicy={pastePolicy}
      onChange={onChange}
      onBlur={() => {}}
    />,
  );
}

function paste(element: HTMLElement, text: string) {
  fireEvent.paste(element, {
    clipboardData: { getData: () => text },
  });
}

it('muestra el contador para 5.000 puntos Unicode', () => {
  renderQuestion({ response: '😀'.repeat(5_000) });
  expect(screen.getByText('5.000 de 5.000 caracteres')).toBeInTheDocument();
});

it('conserva la respuesta anterior si una inserción superaría 5.000 caracteres', () => {
  const onChange = vi.fn();
  const response = `${'a'.repeat(4_999)}Z`;
  renderQuestion({ response, onChange });

  fireEvent.change(screen.getByRole('textbox'), { target: { value: `X${response}` } });

  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox')).toHaveValue(response);
  expect(screen.getByRole('alert')).toHaveTextContent(/alcanzaste el máximo de 5\.000/i);
});

it('rechaza una cita si el resultado superaría 5.000', () => {
  const onChange = vi.fn();
  renderQuestion({ response: 'a'.repeat(4_995), readingText: 'evidencia textual', onChange });
  paste(screen.getByRole('textbox'), 'evidencia textual');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/superaría 5.000 caracteres/i);
});
