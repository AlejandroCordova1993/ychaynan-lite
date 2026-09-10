/**
 * Cargador protegido del resumen diagnóstico (spec §4).
 *
 * Lee con la sesión docente y las políticas RLS vigentes, con consultas
 * acotadas y en paralelo, y devuelve el `DiagnosticReport` normalizado que
 * consume el motor puro de `src/features/diagnostics`. No introduce una segunda
 * fuente de datos, no persiste copia alguna del informe y nunca usa
 * `service_role`: este módulo corre en el navegador.
 *
 * Reutiliza, sin reimplementarlos: `listAppliedAssessments` y `mapAccessState`
 * de `./submissions`, `listGroups` de `./groups`, `parseEvaluationResult` de
 * `supabase/functions/_shared/aiEvaluation.ts` y `adjustmentsSchema` de
 * `./evaluationReview`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  EvaluationError,
  parseEvaluationResult,
  type EvaluationQuestion,
  type EvaluationResult,
} from '../../../supabase/functions/_shared/aiEvaluation.ts';
import type {
  DiagnosticEvaluation,
  DiagnosticQuestion,
  DiagnosticReport,
  DiagnosticResponse,
  DiagnosticStudentEntry,
} from '../../features/diagnostics/diagnosticModel';
import type { Group } from '../validation/schemas';
import { adjustmentsSchema, type TeacherAdjustment } from './evaluationReview';
import { listGroups } from './groups';
import { listAppliedAssessments, mapAccessState } from './submissions';

/**
 * Evaluaciones aplicadas (`open`/`closed`/`archived`) para el selector del
 * §3. Es exactamente `listAppliedAssessments`: no hay una segunda consulta.
 */
export const listDiagnosticAssessments = listAppliedAssessments;

/** Fila mínima para deducir el `group_id` de cada acceso; nada sensible. */
const groupAccessRowSchema = z.object({
  students: z.object({ group_id: z.string() }),
});

/**
 * Paralelos participantes de una evaluación, para el selector del §3
 * ("paralelo participante"): solo los que tienen al menos un estudiante con
 * `assessment_access` a `assessmentId`. La consulta a `assessment_access` va
 * acotada por evaluación (mismo patrón que `listSubmissionOverview`) y solo
 * pide el `group_id` embebido en `students!inner`, sin duplicar el esquema ni
 * la consulta de `Group`: la lista final sale de `listGroups`, filtrada a los
 * ids obtenidos. Si la evaluación no tiene paralelos participantes, devuelve
 * `[]` en vez de lanzar.
 */
export async function listGroupsForAssessment(
  client: SupabaseClient,
  assessmentId: string,
): Promise<Group[]> {
  const { data, error } = await client
    .from('assessment_access')
    .select('students!inner(group_id)')
    .eq('assessment_id', assessmentId);

  if (error) throw new Error(`No se pudieron cargar los accesos: ${error.message}`);

  const participatingGroupIds = new Set(
    groupAccessRowSchema
      .array()
      .parse(data ?? [])
      .map((row) => row.students.group_id),
  );
  if (participatingGroupIds.size === 0) return [];

  const groups = await listGroups(client);
  return groups.filter((group) => participatingGroupIds.has(group.id));
}

/* ------------------------------------------------------------------ *
 * Esquemas estrictos de cada respuesta de Supabase
 * ------------------------------------------------------------------ */

const assessmentRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  opened_at: z.string().nullable(),
});

const groupRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  school_year: z.string(),
});

const questionRowSchema = z.object({
  id: z.string(),
  position: z.number(),
  prompt: z.string(),
  instructions: z.string(),
  suggested_min_words: z.number().nullable(),
  suggested_max_words: z.number().nullable(),
  active_criteria: z.array(z.string()),
  active_modules: z.array(z.string()),
});

/** Sin `code_hash` ni ningún otro campo sensible: solo lo que el informe usa. */
const accessRowSchema = z.object({
  student_id: z.string(),
  state: z.string(),
  students: z.object({ full_name_original: z.string(), group_id: z.string() }),
});

const submissionRowSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  status: z.string(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
});

const responseRowSchema = z.object({
  submission_id: z.string(),
  question_id: z.string(),
  original_text: z.string(),
  word_count: z.number(),
  submitted_at: z.string().nullable(),
});

const evaluationRowSchema = z.object({
  id: z.string(),
  submission_id: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'reviewed', 'discarded']),
  result_json: z.unknown().nullable(),
  confidence: z.number().nullable(),
  requested_at: z.string(),
  completed_at: z.string().nullable(),
  error_code: z.string().nullable(),
  teacher_adjustments: z.unknown().nullable(),
  teacher_note: z.string().nullable(),
  reviewed_at: z.string().nullable(),
});
type EvaluationRow = z.infer<typeof evaluationRowSchema>;

const EVALUATION_COLUMNS =
  'id,submission_id,status,result_json,confidence,requested_at,completed_at,error_code,teacher_adjustments,teacher_note,reviewed_at';

/** Estados en los que se espera un `result_json` interpretable. */
const RESULT_STATUSES: ReadonlySet<EvaluationRow['status']> = new Set([
  'completed',
  'reviewed',
  'discarded',
]);

const CHUNK_SIZE = 100;

function chunk(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let offset = 0; offset < ids.length; offset += CHUNK_SIZE) {
    chunks.push(ids.slice(offset, offset + CHUNK_SIZE));
  }
  return chunks;
}

function requestedTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/** Detalle corto y sin datos personales de una violación de contrato. */
function violationDetail(error: unknown): string {
  if (error instanceof EvaluationError) return error.detail;
  return error instanceof Error ? error.message : 'inválido';
}

/**
 * Preguntas congeladas con la omisión real del estudiante, tal como las exige
 * `parseEvaluationResult` (valida `result_json` contra ellas y sustituye por
 * `no_aplica` los criterios/módulos de una pregunta omitida).
 */
function toEvaluationQuestions(
  questions: DiagnosticQuestion[],
  responses: DiagnosticResponse[],
): EvaluationQuestion[] {
  const byQuestion = new Map(responses.map((response) => [response.questionId, response]));
  return questions.map((question) => {
    const response = byQuestion.get(question.questionId);
    return {
      position: question.position,
      prompt: question.prompt,
      instructions: question.instructions,
      responseText: response?.originalText ?? null,
      wordCount: response?.wordCount ?? 0,
      omitted: response?.omitted ?? true,
      activeCriteria: question.activeCriteria,
      activeModules: question.activeModules,
      suggestedMinWords: question.suggestedMinWords,
      suggestedMaxWords: question.suggestedMaxWords,
    };
  });
}

/**
 * Normaliza una fila de `ai_evaluations`. Un `result_json` o unos
 * `teacher_adjustments` que no validan no lanzan: quedan registrados en
 * `contractViolation` para que el informe señale la entrega y la Task 7 bloquee
 * la exportación citándola (§9), en vez de excluirla en silencio.
 */
function toDiagnosticEvaluation(
  row: EvaluationRow,
  questions: DiagnosticQuestion[],
  responses: DiagnosticResponse[],
): DiagnosticEvaluation {
  let result: EvaluationResult | null = null;
  let contractViolation: string | null = null;

  if (RESULT_STATUSES.has(row.status)) {
    if (row.result_json === null) {
      if (row.status !== 'discarded') contractViolation = 'result_json: ausente';
    } else {
      try {
        result = parseEvaluationResult(
          row.result_json,
          toEvaluationQuestions(questions, responses),
        );
      } catch (error) {
        contractViolation = `result_json: ${violationDetail(error)}`;
      }
    }
  }

  let teacherAdjustments: TeacherAdjustment[] | null = null;
  if (row.teacher_adjustments !== null && row.teacher_adjustments !== undefined) {
    const parsed = adjustmentsSchema.safeParse(row.teacher_adjustments);
    if (parsed.success) {
      teacherAdjustments = parsed.data;
    } else {
      const detail = parsed.error.issues[0]?.message ?? 'inválido';
      contractViolation = contractViolation ?? `teacher_adjustments: ${detail}`;
    }
  }

  return {
    id: row.id,
    status: row.status,
    result,
    confidence: row.confidence,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
    teacherAdjustments,
    teacherNote: row.teacher_note,
    reviewedAt: row.reviewed_at,
    contractViolation,
  };
}

/* ------------------------------------------------------------------ *
 * Carga del reporte
 * ------------------------------------------------------------------ */

export async function loadDiagnosticReport(
  client: SupabaseClient,
  assessmentId: string,
  groupId: string,
): Promise<DiagnosticReport> {
  const [assessmentResult, groupResult, questionResult, accessResult, submissionResult] =
    await Promise.all([
      client
        .from('assessments')
        .select('id,title,status,opened_at')
        .eq('id', assessmentId)
        .in('status', ['open', 'closed', 'archived'])
        .maybeSingle(),
      client.from('groups').select('id,name,school_year').eq('id', groupId).maybeSingle(),
      client
        .from('questions')
        .select(
          'id,position,prompt,instructions,suggested_min_words,suggested_max_words,active_criteria,active_modules',
        )
        .eq('assessment_id', assessmentId)
        .order('position', { ascending: true }),
      client
        .from('assessment_access')
        .select('student_id,state,students!inner(full_name_original,group_id)')
        .eq('assessment_id', assessmentId),
      client
        .from('submissions')
        .select('id,student_id,status,started_at,submitted_at')
        .eq('assessment_id', assessmentId),
    ]);

  if (assessmentResult.error)
    throw new Error(`No se pudo cargar la evaluación: ${assessmentResult.error.message}`);
  if (groupResult.error)
    throw new Error(`No se pudo cargar el paralelo: ${groupResult.error.message}`);
  if (questionResult.error)
    throw new Error(`No se pudieron cargar las preguntas: ${questionResult.error.message}`);
  if (accessResult.error)
    throw new Error(`No se pudieron cargar los accesos: ${accessResult.error.message}`);
  if (submissionResult.error)
    throw new Error(`No se pudieron cargar las entregas: ${submissionResult.error.message}`);
  if (!assessmentResult.data) throw new Error('No encontramos esa evaluación aplicada.');
  if (!groupResult.data) throw new Error('No encontramos ese paralelo.');

  const assessmentRow = assessmentRowSchema.parse(assessmentResult.data);
  const groupRow = groupRowSchema.parse(groupResult.data);

  const questions: DiagnosticQuestion[] = questionRowSchema
    .array()
    .parse(questionResult.data ?? [])
    .map((row) => ({
      questionId: row.id,
      position: row.position,
      prompt: row.prompt,
      instructions: row.instructions,
      activeCriteria: row.active_criteria,
      activeModules: row.active_modules,
      suggestedMinWords: row.suggested_min_words,
      suggestedMaxWords: row.suggested_max_words,
    }))
    .sort((a, b) => a.position - b.position);

  // El paralelo acota el informe: la consulta va acotada por evaluación (patrón
  // ya probado de `listSubmissionOverview`) y el filtro por `group_id` se
  // aplica sobre el embebido `students!inner`, sin depender de un filtro
  // anidado de PostgREST que este cliente no usa en ninguna otra consulta.
  const accesses = accessRowSchema
    .array()
    .parse(accessResult.data ?? [])
    .filter((access) => access.students.group_id === groupId);
  const studentIds = new Set(accesses.map((access) => access.student_id));

  const submissions = new Map(
    submissionRowSchema
      .array()
      .parse(submissionResult.data ?? [])
      .filter((row) => studentIds.has(row.student_id))
      .map((row) => [row.student_id, row]),
  );
  const submissionIds = [...submissions.values()].map((row) => row.id);

  const [responseResults, evaluationResults] = await Promise.all([
    Promise.all(
      chunk(submissionIds).map((ids) =>
        client
          .from('responses')
          .select('submission_id,question_id,original_text,word_count,submitted_at')
          .in('submission_id', ids),
      ),
    ),
    Promise.all(
      chunk(submissionIds).map((ids) =>
        client
          .from('ai_evaluations')
          .select(EVALUATION_COLUMNS)
          .in('submission_id', ids)
          .order('requested_at', { ascending: false })
          .order('id', { ascending: false }),
      ),
    ),
  ]);

  const responsesBySubmission = new Map<string, Map<string, z.infer<typeof responseRowSchema>>>();
  for (const { data, error } of responseResults) {
    if (error) throw new Error(`No se pudieron cargar las respuestas: ${error.message}`);
    for (const row of responseRowSchema.array().parse(data ?? [])) {
      const bySubmission = responsesBySubmission.get(row.submission_id) ?? new Map();
      bySubmission.set(row.question_id, row);
      responsesBySubmission.set(row.submission_id, bySubmission);
    }
  }

  // Misma selección que `listSubmissionOverview`: una sola fila de
  // `ai_evaluations` por entrega, la de `requested_at` más reciente. La consulta
  // ya llega ordenada de forma descendente y la guarda por `submission_id`
  // compara la marca de tiempo, de modo que la elección es determinista aunque
  // el transporte devuelva las filas en otro orden (§10.5).
  const latestEvaluations = new Map<string, EvaluationRow>();
  for (const { data, error } of evaluationResults) {
    if (error) throw new Error('No pudimos cargar las evaluaciones IA de este paralelo.');
    for (const row of evaluationRowSchema.array().parse(data ?? [])) {
      const previous = latestEvaluations.get(row.submission_id);
      const rowTime = requestedTime(row.requested_at);
      const previousTime = previous
        ? requestedTime(previous.requested_at)
        : Number.NEGATIVE_INFINITY;
      if (
        !previous ||
        rowTime > previousTime ||
        (rowTime === previousTime && row.id > previous.id)
      ) {
        latestEvaluations.set(row.submission_id, row);
      }
    }
  }

  const students: DiagnosticStudentEntry[] = accesses.map((access) => {
    const submission = submissions.get(access.student_id);
    const responseRows = submission ? responsesBySubmission.get(submission.id) : undefined;
    const responses: DiagnosticResponse[] = submission
      ? questions.map((question) => {
          const response = responseRows?.get(question.questionId);
          return {
            questionId: question.questionId,
            position: question.position,
            // La respuesta original nunca se recorta ni se sintetiza.
            originalText: response?.original_text ?? null,
            wordCount: response?.word_count ?? 0,
            // Misma regla exacta que `getSubmissionDetail` en `./submissions`.
            omitted: !response || response.original_text.trim().length === 0,
            submittedAt: response?.submitted_at ?? submission.submitted_at,
          };
        })
      : [];
    const evaluationRow = submission ? latestEvaluations.get(submission.id) : undefined;
    return {
      studentId: access.student_id,
      studentName: access.students.full_name_original,
      accessState: access.state,
      status: mapAccessState({ access: access.state, submission: submission?.status ?? null }),
      submissionId: submission?.id ?? null,
      startedAt: submission?.started_at ?? null,
      submittedAt: submission?.submitted_at ?? null,
      responses,
      evaluation: evaluationRow
        ? toDiagnosticEvaluation(evaluationRow, questions, responses)
        : null,
    };
  });
  students.sort((a, b) => a.studentName.localeCompare(b.studentName, 'es'));

  return {
    assessment: {
      id: assessmentRow.id,
      title: assessmentRow.title,
      status: assessmentRow.status,
      openedAt: assessmentRow.opened_at,
    },
    group: { id: groupRow.id, name: groupRow.name, schoolYear: groupRow.school_year },
    questions,
    students,
    loadedAt: new Date().toISOString(),
  };
}
