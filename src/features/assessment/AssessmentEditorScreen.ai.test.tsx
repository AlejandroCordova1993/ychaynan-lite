import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDraftAssessment } from '../../lib/api/assessments';
import {
  AssessmentGenerationError,
  generateAssessmentDraft,
  type GeneratedAssessmentDraft,
} from '../../lib/api/assessmentGeneration';
import type { AssessmentDraftInput } from './assessmentSchemas';
import { AssessmentEditorScreen } from './AssessmentEditorScreen';

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ kind: 'fake-client' }),
}));

vi.mock('../../lib/api/assessments', () => ({
  getDraftAssessment: vi.fn(),
  saveAssessmentDraft: vi.fn(),
}));

vi.mock('../../lib/api/assessmentGeneration', async () => {
  const real = await vi.importActual<typeof import('../../lib/api/assessmentGeneration')>(
    '../../lib/api/assessmentGeneration',
  );
  return { ...real, generateAssessmentDraft: vi.fn() };
});

const getDraftMock = vi.mocked(getDraftAssessment);
const generateDraftMock = vi.mocked(generateAssessmentDraft);

const generatedDraft: GeneratedAssessmentDraft = {
  title: 'El agua y la comunidad',
  purpose: 'Observar comprensión y razonamiento escrito.',
  generalInstructions: 'Responde con tus propias palabras y apóyate en la lectura.',
  questions: [
    {
      position: 1,
      prompt: '¿Cuál es la idea central de la lectura?',
      instructions: 'Explica tu respuesta con información del texto.',
      suggestedMinWords: 35,
      suggestedMaxWords: 80,
      activeCriteria: ['core.comprension_inferencial'],
      activeModules: ['optional.estructura_argumentativa'],
      curriculumLinks: {},
    },
  ],
};

function draftWithQuestions(count: number): AssessmentDraftInput {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Diagnóstico recuperado',
    purpose: 'Observar comprensión y escritura.',
    readingText: 'Lectura ya guardada.',
    generalInstructions: '',
    opensAt: null,
    closesAt: null,
    pastePolicy: 'discourage',
    curriculumVersion: null,
    questions: Array.from({ length: count }, (_, index) => ({
      position: index + 1,
      prompt: `Pregunta recuperada ${index + 1}.`,
      instructions: '',
      suggestedMinWords: 40,
      suggestedMaxWords: 100,
      activeCriteria: ['core.comprension_explicita'],
      activeModules: [],
      curriculumLinks: {},
    })),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  getDraftMock.mockReset().mockResolvedValue(null);
  generateDraftMock.mockReset();
});

async function completeMinimumForm() {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Crear evaluación' });
  await user.type(screen.getByLabelText('Lectura'), 'Texto de lectura para analizar.');
  await user.type(screen.getByRole('textbox', { name: 'Pregunta 1' }), '¿Qué sostiene el autor?');
  return user;
}

function proposalRegion() {
  return screen.getByRole('region', { name: 'Propuesta de IA' });
}

describe('AssessmentEditorScreen · asistente IA', () => {
  it('genera una propuesta sin modificar el formulario hasta que el docente la aplique', async () => {
    generateDraftMock.mockResolvedValue(generatedDraft);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.selectOptions(screen.getByLabelText('Foco diagnóstico'), 'reading_comprehension');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    expect(await screen.findByRole('heading', { name: 'Propuesta de IA' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Qué sostiene el autor?',
    );
    expect(generateDraftMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        readingText: 'Texto de lectura para analizar.',
        questionCount: 1,
        focus: 'reading_comprehension',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Aplicar borrador generado' }));

    expect(screen.getByLabelText('Título')).toHaveValue('El agua y la comunidad');
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Cuál es la idea central de la lectura?',
    );
  });

  it('muestra en la vista previa todo lo que será reemplazado antes de aplicarlo', async () => {
    generateDraftMock.mockResolvedValue(generatedDraft);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    await screen.findByRole('heading', { name: 'Propuesta de IA' });

    const preview = proposalRegion();
    const visible = preview.textContent ?? '';

    // Cada dato que el docente terminará aplicando debe estar visible antes de confirmar.
    for (const esperado of [
      'El agua y la comunidad',
      'Observar comprensión y razonamiento escrito.',
      'Responde con tus propias palabras y apóyate en la lectura.',
      '¿Cuál es la idea central de la lectura?',
      'Explica tu respuesta con información del texto.',
      '35',
      '80',
      'Comprensión inferencial',
      'Estructura del texto argumentativo',
    ]) {
      expect(visible, esperado).toContain(esperado);
    }
    expect(within(preview).getByText(/alineación curricular/i)).toBeInTheDocument();

    await user.click(within(preview).getByRole('button', { name: 'Aplicar borrador generado' }));

    expect(screen.getByLabelText('Título')).toHaveValue('El agua y la comunidad');
    expect(screen.getByLabelText('Propósito diagnóstico')).toHaveValue(
      'Observar comprensión y razonamiento escrito.',
    );
    expect(screen.getByLabelText('Instrucciones generales')).toHaveValue(
      'Responde con tus propias palabras y apóyate en la lectura.',
    );
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Cuál es la idea central de la lectura?',
    );
    expect(screen.getByLabelText('Indicaciones específicas')).toHaveValue(
      'Explica tu respuesta con información del texto.',
    );
    expect(screen.getByLabelText('Mínimo sugerido')).toHaveValue(35);
    expect(screen.getByLabelText('Máximo sugerido')).toHaveValue(80);
    expect(screen.getByRole('checkbox', { name: 'Comprensión inferencial' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Pertinencia y cumplimiento de la consigna' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Estructura del texto argumentativo' }),
    ).toBeChecked();
    // La lectura nunca se reemplaza.
    expect(screen.getByLabelText('Lectura')).toHaveValue('Texto de lectura para analizar.');
  });

  it('invalida la propuesta si la lectura cambia después de generarla', async () => {
    generateDraftMock.mockResolvedValue(generatedDraft);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    await screen.findByRole('heading', { name: 'Propuesta de IA' });

    await user.type(screen.getByLabelText('Lectura'), ' Un párrafo añadido.');

    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aplicar borrador generado' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'La propuesta dejó de corresponder a los datos actuales. Genera una nueva.',
    );
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('descarta una propuesta que llega después de cambiar la lectura', async () => {
    const pending = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    // El docente edita la lectura mientras la solicitud sigue en curso.
    await user.type(screen.getByLabelText('Lectura'), ' Un párrafo añadido.');
    pending.resolve(generatedDraft);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'La propuesta dejó de corresponder a los datos actuales. Genera una nueva.',
    );
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aplicar borrador generado' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('conserva el formulario y muestra un error seguro si falla la IA', async () => {
    generateDraftMock.mockRejectedValue(new Error('proveedor caído'));
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El asistente no está disponible en este momento. Inténtalo nuevamente.',
    );
    expect(screen.getByRole('textbox', { name: 'Pregunta 1' })).toHaveValue(
      '¿Qué sostiene el autor?',
    );
  });

  it('muestra un mensaje comprensible cuando la lectura supera el límite del contrato', async () => {
    generateDraftMock.mockRejectedValue(
      new AssessmentGenerationError(
        'reading_too_long',
        'La lectura supera los 30 000 caracteres permitidos. Recórtala antes de generar.',
      ),
    );
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('La lectura supera los 30 000 caracteres permitidos.');
    expect(alerta).not.toHaveTextContent('no está disponible');
  });

  it('no llama al asistente mientras la lectura esté vacía', async () => {
    render(<AssessmentEditorScreen />);
    await screen.findByRole('heading', { name: 'Crear evaluación' });

    expect(screen.getByRole('button', { name: 'Generar borrador con IA' })).toBeDisabled();
    expect(generateDraftMock).not.toHaveBeenCalled();
  });
});

describe('AssessmentEditorScreen · cantidad sugerida', () => {
  it('recomienda tres preguntas cuando el formulario no tiene una cantidad significativa', async () => {
    render(<AssessmentEditorScreen />);
    await screen.findByRole('heading', { name: 'Crear evaluación' });

    expect(screen.getByLabelText('Cantidad de preguntas generadas')).toHaveValue('3');
  });

  it('se sincroniza con la cantidad de preguntas de un borrador recuperado', async () => {
    getDraftMock.mockResolvedValue(draftWithQuestions(2));
    render(<AssessmentEditorScreen />);

    expect(await screen.findByDisplayValue('Diagnóstico recuperado')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Cantidad de preguntas generadas')).toHaveValue('2'),
    );
  });

  it('no sobrescribe la selección manual del docente al recuperar el borrador', async () => {
    const pending = deferred<AssessmentDraftInput | null>();
    getDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);

    const selector = await screen.findByLabelText('Cantidad de preguntas generadas');
    fireEvent.change(selector, { target: { value: '4' } });
    expect(selector).toHaveValue('4');

    pending.resolve(draftWithQuestions(2));

    expect(await screen.findByDisplayValue('Diagnóstico recuperado')).toBeInTheDocument();
    expect(selector).toHaveValue('4');
  });
});

describe('AssessmentEditorScreen · invalidación de propuestas', () => {
  const LECTURA_BASE = 'Texto de lectura para analizar.';
  const AVISO_OBSOLETA =
    'La propuesta dejó de corresponder a los datos actuales. Genera una nueva.';

  function setReading(value: string) {
    fireEvent.change(screen.getByLabelText('Lectura'), { target: { value } });
  }

  function applyButton() {
    return screen.queryByRole('button', { name: 'Aplicar borrador generado' });
  }

  it('no revive una propuesta cuando la lectura cambia y se restaura', async () => {
    generateDraftMock.mockResolvedValue(generatedDraft);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    await screen.findByRole('heading', { name: 'Propuesta de IA' });

    setReading(`${LECTURA_BASE} Un párrafo añadido.`);
    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(applyButton()).not.toBeInTheDocument();

    // Restaurar el valor original no puede resucitar la propuesta descartada.
    setReading(LECTURA_BASE);

    expect(screen.getByLabelText('Lectura')).toHaveValue(LECTURA_BASE);
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(applyButton()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('descarta una respuesta tardía aunque la lectura vuelva a su valor original', async () => {
    const pending = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    // Cambia y restaura mientras la solicitud sigue en curso: la firma final coincide.
    setReading(`${LECTURA_BASE} Un párrafo añadido.`);
    setReading(LECTURA_BASE);
    pending.resolve(generatedDraft);

    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(applyButton()).not.toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('descarta una respuesta tardía aunque el foco diagnóstico vuelva a su valor original', async () => {
    const pending = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    const foco = screen.getByLabelText('Foco diagnóstico');
    await user.selectOptions(foco, 'critical_reasoning');
    await user.selectOptions(foco, 'balanced');
    pending.resolve(generatedDraft);

    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(foco).toHaveValue('balanced');
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(applyButton()).not.toBeInTheDocument();
  });

  it('descarta una respuesta tardía aunque la cantidad vuelva a su valor original', async () => {
    const pending = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    const cantidad = screen.getByLabelText('Cantidad de preguntas generadas');
    await user.selectOptions(cantidad, '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    await user.selectOptions(cantidad, '2');
    await user.selectOptions(cantidad, '1');
    pending.resolve(generatedDraft);

    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(cantidad).toHaveValue('1');
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    expect(applyButton()).not.toBeInTheDocument();
  });

  it('conserva aplicable una propuesta sin cambios posteriores', async () => {
    const pending = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValue(pending.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.selectOptions(screen.getByLabelText('Cantidad de preguntas generadas'), '1');
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    pending.resolve(generatedDraft);

    await screen.findByRole('heading', { name: 'Propuesta de IA' });
    expect(screen.queryByText(AVISO_OBSOLETA)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aplicar borrador generado' }));

    expect(screen.getByLabelText('Título')).toHaveValue('El agua y la comunidad');
    expect(applyButton()).not.toBeInTheDocument();
    expect(screen.queryByText(AVISO_OBSOLETA)).not.toBeInTheDocument();
  });
});

describe('AssessmentEditorScreen · generar de nuevo sin esperar una solicitud obsoleta', () => {
  const LECTURA_BASE = 'Texto de lectura para analizar.';
  const AVISO_OBSOLETA =
    'La propuesta dejó de corresponder a los datos actuales. Genera una nueva.';

  it('permite iniciar una nueva generación de inmediato tras cambiar la lectura, sin esperar a la anterior', async () => {
    const pendingA = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValueOnce(pendingA.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Lectura'), {
      target: { value: `${LECTURA_BASE} Un párrafo añadido.` },
    });

    expect(screen.getByRole('button', { name: 'Generar borrador con IA' })).toBeEnabled();

    pendingA.resolve(generatedDraft);
  });

  it('una resolución tardía de la solicitud anterior no oculta la carga ni la propuesta de la vigente', async () => {
    const pendingA = deferred<GeneratedAssessmentDraft>();
    const pendingB = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    fireEvent.change(screen.getByLabelText('Lectura'), {
      target: { value: `${LECTURA_BASE} Un párrafo añadido.` },
    });
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();

    pendingA.resolve(generatedDraft);
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent(AVISO_OBSOLETA);
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
    // La resolución de A (obsoleta) no debe haber apagado el indicador de carga de B.
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();

    pendingB.resolve(generatedDraft);
    expect(await screen.findByRole('heading', { name: 'Propuesta de IA' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aplicar borrador generado' }));
    expect(screen.getByLabelText('Título')).toHaveValue('El agua y la comunidad');
  });

  it('un fallo tardío de la solicitud anterior no muestra su error ni interrumpe la carga de la vigente', async () => {
    const pendingA = deferred<GeneratedAssessmentDraft>();
    const pendingB = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    fireEvent.change(screen.getByLabelText('Lectura'), {
      target: { value: `${LECTURA_BASE} Un párrafo añadido.` },
    });
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    pendingA.reject(new Error('proveedor caído'));
    await Promise.resolve().then(() => Promise.resolve());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // El fallo de A (obsoleta) no debe haber apagado el indicador de carga de B.
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();

    pendingB.resolve(generatedDraft);
    expect(await screen.findByRole('heading', { name: 'Propuesta de IA' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un resultado vigente reemplaza el aviso de propuesta obsoleta en lugar de convivir con él', async () => {
    const pendingA = deferred<GeneratedAssessmentDraft>();
    const pendingB = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValueOnce(pendingA.promise).mockReturnValueOnce(pendingB.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));
    fireEvent.change(screen.getByLabelText('Lectura'), {
      target: { value: `${LECTURA_BASE} Un párrafo añadido.` },
    });
    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    // La solicitud obsoleta llega primero y deja el aviso en pantalla.
    pendingA.resolve(generatedDraft);
    expect(await screen.findByRole('status')).toHaveTextContent(AVISO_OBSOLETA);

    // Cuando llega la propuesta vigente, el aviso ya no describe lo que se ve: pedir
    // "genera una nueva" junto a una propuesta aplicable es una contradicción.
    pendingB.resolve(generatedDraft);
    await screen.findByRole('heading', { name: 'Propuesta de IA' });
    expect(screen.queryByText(AVISO_OBSOLETA)).not.toBeInTheDocument();

    // Descartar la propuesta vigente tampoco puede resucitar el aviso.
    await user.click(screen.getByRole('button', { name: 'Descartar propuesta' }));
    expect(screen.queryByText(AVISO_OBSOLETA)).not.toBeInTheDocument();
  });

  it('cambiar y restaurar la lectura mientras se genera no revive la solicitud original ni dificulta generar de nuevo', async () => {
    const pendingA = deferred<GeneratedAssessmentDraft>();
    generateDraftMock.mockReturnValueOnce(pendingA.promise);
    render(<AssessmentEditorScreen />);
    const user = await completeMinimumForm();

    await user.click(screen.getByRole('button', { name: 'Generar borrador con IA' }));

    fireEvent.change(screen.getByLabelText('Lectura'), {
      target: { value: `${LECTURA_BASE} Un párrafo añadido.` },
    });
    fireEvent.change(screen.getByLabelText('Lectura'), { target: { value: LECTURA_BASE } });

    expect(screen.getByRole('button', { name: 'Generar borrador con IA' })).toBeEnabled();

    pendingA.resolve(generatedDraft);
    await screen.findByRole('status');
    expect(screen.queryByRole('heading', { name: 'Propuesta de IA' })).not.toBeInTheDocument();
  });
});
