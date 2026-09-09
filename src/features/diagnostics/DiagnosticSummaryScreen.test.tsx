import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { DiagnosticSummaryScreen } from './DiagnosticSummaryScreen';

vi.mock('../../lib/supabase/client', () => ({ getSupabaseClient: () => ({}) }));
vi.mock('../../lib/api/diagnosticReport');

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

/**
 * Ana revisada, Bruno y Carla provisionales, Diego sin entrega.
 * `core.pertinencia` queda medido por tres estudiantes; `core.lectura_critica`
 * solo por dos (Carla lo trae como `no_aplica`), que es el caso de muestra
 * insuficiente del §5.6.
 */
function mixedReport(groupName = '3ro BGU A', groupId = 'g1'): DiagnosticReport {
  return {
    assessment: {
      id: 'a1',
      title: 'Diagnóstico inicial',
      status: 'closed',
      openedAt: '2026-08-30T12:00:00.000Z',
    },
    group: { id: groupId, name: groupName, schoolYear: '2026-2027' },
    questions: [QUESTION],
    students: [
      student('a', 'Ana Ruiz', {
        evaluation: evaluation('e-a', 'reviewed', [
          criterion('core.pertinencia', 2),
          criterion('core.comprension_explicita', 4),
          criterion('core.lectura_critica', 1),
        ]),
      }),
      student('b', 'Bruno Paz', {
        evaluation: evaluation('e-b', 'completed', [
          criterion('core.pertinencia', 3),
          criterion('core.comprension_explicita', 4),
          criterion('core.lectura_critica', 2),
        ]),
      }),
      student('c', 'Carla Mena', {
        evaluation: evaluation('e-c', 'completed', [
          criterion('core.pertinencia', 1),
          criterion('core.comprension_explicita', 3),
          criterion('core.lectura_critica', 'no_aplica'),
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
  };
}

beforeEach(() => {
  vi.mocked(listDiagnosticAssessments).mockResolvedValue([
    { id: 'a1', title: 'Diagnóstico inicial', status: 'closed', opened_at: '2026-08-30' },
    { id: 'a0', title: 'Diagnóstico anterior', status: 'archived', opened_at: '2026-05-02' },
  ]);
  vi.mocked(listGroupsForAssessment).mockResolvedValue([
    { id: 'g1', name: '3ro BGU A', schoolYear: '2026-2027', status: 'active' },
    { id: 'g2', name: '3ro BGU B', schoolYear: '2026-2027', status: 'active' },
  ]);
  vi.mocked(loadDiagnosticReport).mockResolvedValue(mixedReport());
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <DiagnosticSummaryScreen />
    </MemoryRouter>,
  );
}

describe('DiagnosticSummaryScreen', () => {
  it('etiqueta la selección como mixta cuando incluye evaluación provisional de IA', async () => {
    renderScreen();

    expect(
      await screen.findByText('Resultados mixtos: contienen evaluación provisional de IA'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen diagnóstico' })).toBeInTheDocument();
    expect(screen.getByText('3ro BGU A')).toBeInTheDocument();
  });

  it('muestra "Muestra insuficiente" cuando un criterio tiene menos de tres estudiantes medidos', async () => {
    renderScreen();

    const falencias = await screen.findByRole('table', { name: 'Falencias frecuentes' });
    const insuficiente = within(falencias)
      .getByText('Lectura crítica y valoración')
      .closest('tr') as HTMLElement;
    expect(within(insuficiente).getByText('Muestra insuficiente')).toBeInTheDocument();
    expect(within(insuficiente).queryByText('1.50')).not.toBeInTheDocument();

    const medido = within(falencias)
      .getByText('Pertinencia y cumplimiento de la consigna')
      .closest('tr') as HTMLElement;
    expect(within(medido).getByText('2.00')).toBeInTheDocument();

    const fortalezas = screen.getByRole('table', { name: 'Fortalezas' });
    const fortalezaInsuficiente = within(fortalezas)
      .getByText('Lectura crítica y valoración')
      .closest('tr') as HTMLElement;
    expect(within(fortalezaInsuficiente).getByText('Muestra insuficiente')).toBeInTheDocument();
  });

  it('limpia el reporte anterior antes de mostrar el paralelo nuevo', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Ana Ruiz');

    vi.mocked(loadDiagnosticReport).mockReturnValueOnce(new Promise<DiagnosticReport>(() => {}));
    await user.selectOptions(screen.getByLabelText('Paralelo'), 'g2');

    expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Resultados por estudiante' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el resumen diagnóstico…');
    await waitFor(() =>
      expect(loadDiagnosticReport).toHaveBeenLastCalledWith(expect.anything(), 'a1', 'g2'),
    );
  });

  it('reordena las filas desde el encabezado sin alterar los valores calculados', async () => {
    const user = userEvent.setup();
    renderScreen();
    const table = await screen.findByRole('table', { name: 'Resultados por estudiante' });
    const names = () =>
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent);
    const anaCells = () => {
      const row = within(table).getByText('Ana Ruiz').closest('tr') as HTMLElement;
      return within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent);
    };

    expect(names()).toEqual(['Ana Ruiz', 'Bruno Paz', 'Carla Mena', 'Diego Toro']);
    const before = anaCells();

    await user.click(within(table).getByRole('button', { name: 'Estudiante' }));

    expect(names()).toEqual(['Diego Toro', 'Carla Mena', 'Bruno Paz', 'Ana Ruiz']);
    expect(anaCells()).toEqual(before);
  });

  it('enlaza al detalle existente solo cuando la entrega existe', async () => {
    renderScreen();
    const table = await screen.findByRole('table', { name: 'Resultados por estudiante' });

    expect(within(table).getByRole('link', { name: 'Ver la entrega de Ana Ruiz' })).toHaveAttribute(
      'href',
      '/docente/respuestas/sub-a',
    );
    expect(within(table).queryByRole('link', { name: /Diego Toro/ })).toBeNull();
  });
});
