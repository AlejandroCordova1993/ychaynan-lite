import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthProvider } from '../auth/AuthContext';
import { RequireAuth } from '../auth/RequireAuth';
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

  it('señala la entrega con contrato inválido en el aviso y en su fila, sin excluirla en silencio', async () => {
    vi.mocked(loadDiagnosticReport).mockResolvedValue(brokenReport());
    renderScreen();

    const aviso = await screen.findByText(
      /entrega\(s\) con una salida de IA que viola el contrato/i,
    );
    expect(aviso).toHaveTextContent('Ana Ruiz');
    expect(aviso).toHaveTextContent(/reevalúa o descarta cada una desde el detalle de la entrega/i);
    expect(aviso).toHaveTextContent(/no se excluyen en silencio de los promedios/i);

    // La fila sigue ahí, marcada: una exclusión silenciosa sería no verla.
    const table = screen.getByRole('table', { name: 'Resultados por estudiante' });
    const fila = within(table).getByText('Ana Ruiz').closest('tr') as HTMLElement;
    expect(within(fila).getByText(/Entrega con problema de contrato/i)).toBeInTheDocument();
  });

  it('mantiene en cobertura y en la tabla a la entrega sin evaluación, sin dejarla entrar en ningún promedio', async () => {
    renderScreen();

    const cobertura = await screen.findByRole('region', { name: 'Cobertura del paralelo' });
    const esperados = within(cobertura).getByText('Estudiantes esperados').closest('li');
    expect(within(esperados as HTMLElement).getByText('4')).toBeInTheDocument();
    expect(cobertura).toHaveTextContent('Sin evaluación utilizable: 1');

    const table = screen.getByRole('table', { name: 'Resultados por estudiante' });
    const diego = within(table).getByText('Diego Toro').closest('tr') as HTMLElement;
    expect(diego).toHaveTextContent('Esperado · Sin evaluación utilizable');
    // Sus cuatro promedios dimensionales quedan vacíos, nunca en cero.
    expect(within(diego).getAllByText('Sin datos')).toHaveLength(4);
    expect(within(diego).queryByText('0.00')).toBeNull();

    // Y el promedio del paralelo pondera solo a los tres estudiantes medidos.
    const criterios = screen.getByRole('table', { name: 'Criterios de la rúbrica' });
    const pertinencia = within(criterios)
      .getByText('Pertinencia y cumplimiento de la consigna')
      .closest('tr') as HTMLElement;
    // (2 + 3 + 1) / 3 = 2.00, no (2 + 3 + 1 + 0) / 4 = 1.50.
    expect(within(pertinencia).getByText('2.00')).toBeInTheDocument();
    expect(within(pertinencia).queryByText('1.50')).toBeNull();
  });

  it('deja actuar al flujo de sesión inválida ya existente en vez de enmascararlo con un error propio', async () => {
    let emit: ((event: string, session: Session | null) => void) | undefined;
    const client = {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: { session: { user: { id: 'u1', app_metadata: { role: 'teacher' } } } },
          }),
        ),
        onAuthStateChange: vi.fn((callback: (event: string, session: Session | null) => void) => {
          emit = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    } as unknown as SupabaseClient;
    // La sesión caduca en mitad de la carga: el cargador protegido rechaza.
    vi.mocked(loadDiagnosticReport).mockRejectedValue(new Error('JWT expired'));

    render(
      <MemoryRouter initialEntries={['/docente/diagnostico']}>
        <AuthProvider client={client}>
          <Routes>
            <Route path="/docente/ingresar" element={<p>pantalla de ingreso</p>} />
            <Route
              path="/docente/diagnostico"
              element={
                <RequireAuth>
                  <DiagnosticSummaryScreen />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    // La pantalla solo informa de su propia falla de carga; no inventa una
    // pantalla de sesión inválida propia ni retiene la vista.
    expect(
      await screen.findByText(/No pudimos cargar el resumen de este paralelo/i),
    ).toBeInTheDocument();

    await act(async () => {
      emit?.('SIGNED_OUT', null);
    });

    // El mecanismo existente (`AuthProvider` + `RequireAuth`) gana: redirección
    // al ingreso, sin que el mensaje del diagnóstico lo tape.
    expect(await screen.findByText('pantalla de ingreso')).toBeInTheDocument();
    expect(screen.queryByText(/No pudimos cargar el resumen de este paralelo/i)).toBeNull();
  });
});
