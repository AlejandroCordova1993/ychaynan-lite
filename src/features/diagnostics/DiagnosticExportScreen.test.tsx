import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVALUATION_DIMENSIONS,
  type CriterionEvaluation,
  type EvaluationLevel,
  type EvaluationResult,
  type QuestionEvaluation,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type { SubmissionEvaluationStatus } from '../../lib/api/evaluations';
import {
  listDiagnosticAssessments,
  listGroupsForAssessment,
  loadDiagnosticReport,
} from '../../lib/api/diagnosticReport';
import type {
  DiagnosticEvaluation,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticResponse,
  DiagnosticStudentEntry,
} from './diagnosticModel';
import { buildDiagnosticWorkbook } from './diagnosticWorkbook';
import { DiagnosticExportScreen } from './DiagnosticExportScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/diagnosticReport');
// El libro de Excel se prueba en `diagnosticWorkbook.test.ts`. Aquí interesa
// **cuándo** se invoca: nunca al cargar el informe, solo al pulsar su botón.
vi.mock('./diagnosticWorkbook', () => ({ buildDiagnosticWorkbook: vi.fn() }));

/* ------------------------------------------------------------------ *
 * Fixtures — mismo patrón que DiagnosticSummaryScreen.test.tsx
 * ------------------------------------------------------------------ */

const QUESTION: DiagnosticQuestion = {
  questionId: 'q1',
  position: 1,
  prompt: 'Consigna 1',
  instructions: 'Instrucciones 1',
  activeCriteria: ['core.pertinencia', 'core.comprension_explicita'],
  activeModules: [],
  suggestedMinWords: null,
  suggestedMaxWords: null,
};

function responses(omitted = false): DiagnosticResponse[] {
  return [
    {
      questionId: 'q1',
      position: 1,
      originalText: omitted ? null : 'Respuesta con ñ y tildes.',
      wordCount: omitted ? 0 : 5,
      omitted,
      submittedAt: '2026-09-01T09:00:00.000Z',
    },
  ];
}

function criterion(criterionId: string, level: EvaluationLevel): CriterionEvaluation {
  return {
    criterionId,
    level,
    reason: `Razón de ${criterionId}`,
    evidences: [],
    confidence: 0.8,
    review: 'none',
  };
}

function result(criteria: CriterionEvaluation[]): EvaluationResult {
  const questionResults: QuestionEvaluation[] = [
    { position: 1, criteria, modules: [], observations: [], strengths: [], priorities: [] },
  ];
  return {
    questionResults,
    dimensionSummaries: EVALUATION_DIMENSIONS.map((dimension) => ({
      dimension,
      applicableCriteria: 0,
      scoredCriteria: 0,
      averageLevel: null,
      confidence: 0,
      strengths: [],
      priorities: [],
    })),
    globalConfidence: 0.8,
    limitations: [],
  };
}

function evaluation(
  id: string,
  status: SubmissionEvaluationStatus,
  criteria: CriterionEvaluation[],
  overrides: Partial<DiagnosticEvaluation> = {},
): DiagnosticEvaluation {
  return {
    id,
    status,
    result: result(criteria),
    confidence: 0.8,
    requestedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:02:00.000Z',
    errorCode: null,
    teacherAdjustments: null,
    teacherNote: null,
    reviewedAt: status === 'reviewed' ? '2026-09-02T08:00:00.000Z' : null,
    contractViolation: null,
    ...overrides,
  };
}

function student(
  studentId: string,
  studentName: string,
  overrides: Partial<DiagnosticStudentEntry> = {},
): DiagnosticStudentEntry {
  return {
    studentId,
    studentName,
    accessState: 'submitted',
    status: 'entregado',
    submissionId: `sub-${studentId}`,
    startedAt: '2026-09-01T08:00:00.000Z',
    submittedAt: '2026-09-01T09:00:00.000Z',
    responses: responses(),
    evaluation: null,
    ...overrides,
  };
}

/** Ana revisada, Bruno y Carla provisionales, Diego sin entrega: 4 esperados. */
function mixedReport(overrides: Partial<DiagnosticReport> = {}): DiagnosticReport {
  return {
    assessment: {
      id: 'a1',
      title: 'Diagnóstico inicial',
      status: 'closed',
      openedAt: '2026-08-30T12:00:00.000Z',
    },
    group: { id: 'g1', name: '3ro BGU A', schoolYear: '2026-2027' },
    questions: [QUESTION],
    students: [
      student('a', 'Ana Ruiz', {
        evaluation: evaluation('e-a', 'reviewed', [
          criterion('core.pertinencia', 2),
          criterion('core.comprension_explicita', 4),
        ]),
      }),
      student('b', 'Bruno Paz', {
        evaluation: evaluation('e-b', 'completed', [
          criterion('core.pertinencia', 3),
          criterion('core.comprension_explicita', 4),
        ]),
      }),
      student('c', 'Carla Mena', {
        evaluation: evaluation('e-c', 'completed', [
          criterion('core.pertinencia', 1),
          criterion('core.comprension_explicita', 3),
        ]),
      }),
      student('d', 'Diego Toro', {
        accessState: 'issued',
        status: 'esperado',
        submissionId: null,
        startedAt: null,
        submittedAt: null,
        responses: responses(true),
      }),
    ],
    loadedAt: '2026-09-08T12:00:00.000Z',
    ...overrides,
  };
}

/** Mismo informe, pero la salida de IA de Ana viola el contrato (§9). */
function brokenReport(): DiagnosticReport {
  const report = mixedReport();
  return {
    ...report,
    students: report.students.map((entry) =>
      entry.studentId === 'a'
        ? {
            ...entry,
            evaluation: evaluation('e-a', 'completed', [criterion('core.pertinencia', 2)], {
              contractViolation: 'result_json no valida contra las preguntas congeladas',
            }),
          }
        : entry,
    ),
  };
}

/**
 * Paralelo con estudiantes pero sin ninguna revisión docente: elegir
 * «Solo revisados» deja la selección vacía sin que el paralelo lo esté.
 */
function provisionalOnlyReport(): DiagnosticReport {
  const report = mixedReport();
  return {
    ...report,
    students: report.students.map((entry) =>
      entry.studentId === 'a'
        ? {
            ...entry,
            evaluation: evaluation('e-a', 'completed', [
              criterion('core.pertinencia', 2),
              criterion('core.comprension_explicita', 4),
            ]),
          }
        : entry,
    ),
  };
}

/**
 * Ana con contrato roto (provisional, luego fuera de «Solo revisados») y Bruno
 * revisado y limpio (dentro de esa fuente): el bloqueo debe leer el informe
 * completo, no el filtrado.
 */
function brokenOutsideSourceReport(): DiagnosticReport {
  const report = brokenReport();
  return {
    ...report,
    students: report.students.map((entry) =>
      entry.studentId === 'b'
        ? {
            ...entry,
            evaluation: evaluation('e-b', 'reviewed', [
              criterion('core.pertinencia', 3),
              criterion('core.comprension_explicita', 4),
            ]),
          }
        : entry,
    ),
  };
}

const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:descarga');
const revokeObjectURL = vi.fn();

/** jsdom no implementa descargas: se captura el enlace en lugar de navegar. */
function captureDownloads(): HTMLAnchorElement[] {
  const anchors: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    anchors.push(this);
  });
  return anchors;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });
  vi.mocked(listDiagnosticAssessments).mockResolvedValue([
    { id: 'a1', title: 'Diagnóstico inicial', status: 'closed', opened_at: '2026-08-30' },
  ]);
  vi.mocked(listGroupsForAssessment).mockResolvedValue([
    { id: 'g1', name: '3ro BGU A', schoolYear: '2026-2027', status: 'active' },
    { id: 'g2', name: '3ro BGU B', schoolYear: '2026-2027', status: 'active' },
  ]);
  vi.mocked(loadDiagnosticReport).mockResolvedValue(mixedReport());
  vi.mocked(buildDiagnosticWorkbook).mockResolvedValue(new ArrayBuffer(64));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <DiagnosticExportScreen />
    </MemoryRouter>,
  );
}

const csvButton = () => screen.getByRole('button', { name: 'Descargar CSV' });
const excelButton = () => screen.getByRole('button', { name: 'Descargar Excel' });

describe('DiagnosticExportScreen', () => {
  it('mantiene ambas descargas deshabilitadas mientras no hay una selección válida', async () => {
    vi.mocked(listDiagnosticAssessments).mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('Todavía no hay una evaluación aplicada.')).toBeInTheDocument();
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
    expect(loadDiagnosticReport).not.toHaveBeenCalled();
  });

  it('habilita ambas descargas y resume el corte con las cifras del informe cargado', async () => {
    renderScreen();

    const resumen = await screen.findByRole('group', { name: 'Resumen del archivo' });
    expect(within(resumen).getByText('Diagnóstico inicial')).toBeInTheDocument();
    expect(within(resumen).getByText('3ro BGU A')).toBeInTheDocument();

    const value = (label: string) =>
      within(resumen).getByText(label).closest('div')?.querySelector('dd')?.textContent;
    expect(value('Estudiantes incluidos')).toBe('4');
    expect(value('Resultados revisados incluidos')).toBe('1');
    expect(value('Resultados provisionales incluidos')).toBe('2');
    // El corte es el `loadedAt` con el que se cargó el informe, no un `new Date()`.
    expect(value('Fecha y hora del corte')).toBe(
      new Date('2026-09-08T12:00:00.000Z').toLocaleString('es-EC'),
    );

    expect(
      screen.getByText(/contiene datos personales de las y los estudiantes/i),
    ).toBeInTheDocument();
    expect(csvButton()).toBeEnabled();
    expect(excelButton()).toBeEnabled();
  });

  it('descarga el CSV con el nombre documentado y el contenido del motor compartido', async () => {
    const user = userEvent.setup();
    const anchors = captureDownloads();
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    await user.click(csvButton());

    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe(
      'yachaynan-diagnostico_diagnostico-inicial_3ro-bgu-a_2026-09-08.csv',
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    await expect(blob.text()).resolves.toContain('Ana Ruiz');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:descarga');
  });

  it('genera el libro de Excel solo al pulsar su botón, nunca al cargar el informe', async () => {
    const user = userEvent.setup();
    const anchors = captureDownloads();
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    // El import diferido de `exceljs` no puede dispararse por estar en pantalla.
    expect(buildDiagnosticWorkbook).not.toHaveBeenCalled();

    await user.click(excelButton());

    await waitFor(() => expect(buildDiagnosticWorkbook).toHaveBeenCalledTimes(1));
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe(
      'yachaynan-diagnostico_diagnostico-inicial_3ro-bgu-a_2026-09-08.xlsx',
    );
  });

  it('anuncia el trabajo en curso mientras se construye el libro de Excel', async () => {
    const user = userEvent.setup();
    captureDownloads();
    let resolveWorkbook: ((buffer: ArrayBuffer) => void) | undefined;
    vi.mocked(buildDiagnosticWorkbook).mockReturnValue(
      new Promise<ArrayBuffer>((resolve) => {
        resolveWorkbook = resolve;
      }),
    );
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    await user.click(excelButton());

    const busy = await screen.findByRole('button', { name: 'Generando el archivo de Excel…' });
    expect(busy).toBeDisabled();
    expect(csvButton()).toBeDisabled();

    resolveWorkbook?.(new ArrayBuffer(64));

    expect(await screen.findByRole('button', { name: 'Descargar Excel' })).toBeEnabled();
  });

  it('bloquea ambas descargas y cita las entregas con contrato inválido', async () => {
    vi.mocked(loadDiagnosticReport).mockResolvedValue(brokenReport());
    renderScreen();

    const aviso = await screen.findByRole('alert');
    expect(within(aviso).getByText(/Ana Ruiz/)).toBeInTheDocument();
    expect(aviso).toHaveTextContent(/salida de IA no cumple el contrato/i);
    expect(aviso).toHaveTextContent(/reevalúa o descarta/i);
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
    expect(buildDiagnosticWorkbook).not.toHaveBeenCalled();
  });

  it('no ofrece un archivo vacío cuando el paralelo no tiene estudiantes con acceso', async () => {
    vi.mocked(loadDiagnosticReport).mockResolvedValue(mixedReport({ students: [] }));
    renderScreen();

    expect(
      await screen.findByText(/no tiene estudiantes con acceso a la evaluación seleccionada/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Resumen del archivo' })).toBeNull();
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
  });

  it('avisa y vuelve a habilitar los botones si la construcción del Excel falla', async () => {
    const user = userEvent.setup();
    captureDownloads();
    vi.mocked(buildDiagnosticWorkbook).mockRejectedValue(new Error('import fallido'));
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    await user.click(excelButton());

    expect(await screen.findByText(/No pudimos generar el archivo/i)).toBeInTheDocument();
    expect(excelButton()).toBeEnabled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('no acusa al paralelo de estar vacío cuando es la fuente elegida la que no incluye a nadie', async () => {
    const user = userEvent.setup();
    vi.mocked(loadDiagnosticReport).mockResolvedValue(provisionalOnlyReport());
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    await user.selectOptions(screen.getByLabelText('Fuente de resultados'), 'revisados');

    // El paralelo sí tiene estudiantes con acceso: decir lo contrario manda a la
    // docente a revisar una nómina que está bien.
    expect(
      screen.queryByText(/no tiene estudiantes con acceso a la evaluación seleccionada/i),
    ).toBeNull();
    expect(screen.getByText(/no incluye ningún resultado de este paralelo/i)).toBeInTheDocument();
    expect(screen.getByText(/4 estudiante\(s\) con acceso/i)).toBeInTheDocument();
    // Bloquear sigue siendo correcto: lo que estaba mal era el motivo.
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
  });

  it('bloquea la descarga con los errores de contrato del informe completo aunque la fuente los deje fuera', async () => {
    const user = userEvent.setup();
    vi.mocked(loadDiagnosticReport).mockResolvedValue(brokenOutsideSourceReport());
    renderScreen();
    await screen.findByRole('alert');

    // «Solo revisados» deja fuera a Ana (provisional rota) y conserva a Bruno.
    await user.selectOptions(screen.getByLabelText('Fuente de resultados'), 'revisados');

    const aviso = await screen.findByRole('alert');
    expect(within(aviso).getByText(/Ana Ruiz/)).toBeInTheDocument();
    expect(aviso).toHaveTextContent(/salida de IA no cumple el contrato/i);
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
    expect(buildDiagnosticWorkbook).not.toHaveBeenCalled();
  });

  it('invalida el resumen anterior antes de mostrar el paralelo nuevo', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('group', { name: 'Resumen del archivo' });

    vi.mocked(loadDiagnosticReport).mockReturnValueOnce(new Promise<DiagnosticReport>(() => {}));
    await user.selectOptions(screen.getByLabelText('Paralelo'), 'g2');

    expect(screen.queryByRole('group', { name: 'Resumen del archivo' })).toBeNull();
    expect(csvButton()).toBeDisabled();
    expect(excelButton()).toBeDisabled();
    await waitFor(() =>
      expect(loadDiagnosticReport).toHaveBeenLastCalledWith(expect.anything(), 'a1', 'g2'),
    );
  });
});
