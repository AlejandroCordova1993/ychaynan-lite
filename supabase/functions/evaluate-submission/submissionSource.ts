import { ACTIVE_CRITERIA_IDS, ACTIVE_MODULE_IDS } from '../_shared/assessmentRubric.ts';
import { EVALUATION_LIMITS, EvaluationError } from '../_shared/aiEvaluation.ts';
import type { SubmissionEvaluationSource } from './handler.ts';

interface SubmissionRow {
  id: unknown;
  assessment_id: unknown;
  status: unknown;
}

interface AssessmentRow {
  id: unknown;
  purpose: unknown;
  reading_text: unknown;
  general_instructions: unknown;
  rubric_snapshot: unknown;
  rubric_schema_version: unknown;
  rubric_hash: unknown;
}

interface QuestionRow {
  id: unknown;
  assessment_id: unknown;
  position: unknown;
  prompt: unknown;
  instructions: unknown;
  suggested_min_words: unknown;
  suggested_max_words: unknown;
  active_criteria: unknown;
  active_modules: unknown;
}

interface ResponseRow {
  question_id: unknown;
  original_text: unknown;
  word_count: unknown;
}

export interface SubmissionSourceRows {
  submission: SubmissionRow;
  assessment: AssessmentRow;
  questions: QuestionRow[];
  responses: ResponseRow[];
}

function fail(detail: string): never {
  throw new EvaluationError('persist_failed', detail);
}

function requiredText(value: unknown, detail: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(detail);
  return value;
}

function optionalText(value: unknown, detail: string): string {
  if (typeof value !== 'string') fail(detail);
  return value;
}

function idList(
  value: unknown,
  allowed: ReadonlySet<string>,
  detail: string,
  requireOne: boolean,
): string[] {
  if (!Array.isArray(value)) fail(detail);
  const result: string[] = [];
  for (const id of value) {
    if (typeof id !== 'string' || !allowed.has(id) || result.includes(id)) fail(detail);
    result.push(id);
  }
  if (requireOne && result.length === 0) fail(detail);
  return result;
}

function nullableInteger(value: unknown, detail: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) fail(detail);
  return value;
}

export function buildSubmissionEvaluationSource(
  rows: SubmissionSourceRows,
): SubmissionEvaluationSource {
  const submissionId = requiredText(rows.submission.id, 'submission_id');
  const assessmentId = requiredText(rows.submission.assessment_id, 'assessment_id');
  if (rows.assessment.id !== assessmentId) fail('assessment_mismatch');
  if (rows.questions.length < 1 || rows.questions.length > 4) fail('question_count');
  if (rows.responses.length !== rows.questions.length) fail('missing_response');

  const responseByQuestion = new Map<string, ResponseRow>();
  for (const response of rows.responses) {
    const questionId = requiredText(response.question_id, 'response_question_id');
    if (responseByQuestion.has(questionId)) fail('duplicate_response');
    responseByQuestion.set(questionId, response);
  }

  const questions = [...rows.questions]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((question, index) => {
      if (question.assessment_id !== assessmentId) fail('question_assessment');
      if (question.position !== index + 1) fail('question_position');
      const questionId = requiredText(question.id, 'question_id');
      const response = responseByQuestion.get(questionId);
      if (!response) fail('missing_response');
      const responseText = requiredText(response.original_text, 'response_empty');
      if (responseText.length > EVALUATION_LIMITS.responseMaxChars) fail('response_too_long');
      if (
        typeof response.word_count !== 'number' ||
        !Number.isInteger(response.word_count) ||
        response.word_count < 0
      ) {
        fail('word_count');
      }
      return {
        position: index + 1,
        prompt: requiredText(question.prompt, 'prompt'),
        instructions: optionalText(question.instructions, 'instructions'),
        responseText,
        wordCount: response.word_count,
        activeCriteria: idList(
          question.active_criteria,
          ACTIVE_CRITERIA_IDS,
          'active_criteria',
          true,
        ),
        activeModules: idList(question.active_modules, ACTIVE_MODULE_IDS, 'active_modules', false),
        suggestedMinWords: nullableInteger(question.suggested_min_words, 'suggested_min_words'),
        suggestedMaxWords: nullableInteger(question.suggested_max_words, 'suggested_max_words'),
      };
    });

  return {
    submissionId,
    status: requiredText(rows.submission.status, 'submission_status'),
    readingText: requiredText(rows.assessment.reading_text, 'reading_text'),
    purpose: requiredText(rows.assessment.purpose, 'purpose'),
    generalInstructions: optionalText(rows.assessment.general_instructions, 'general_instructions'),
    rubricSnapshot: rows.assessment.rubric_snapshot,
    rubricSchemaVersion: requiredText(
      rows.assessment.rubric_schema_version,
      'rubric_schema_version',
    ),
    rubricHash: requiredText(rows.assessment.rubric_hash, 'rubric_hash'),
    questions,
  };
}
