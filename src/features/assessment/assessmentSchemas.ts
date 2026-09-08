import { z } from 'zod';
import rubric from '../../../rubric-v1.json';
import { INPUT_LIMITS, unicodeLength } from '../../../supabase/functions/_shared/inputLimits';

const CORE_CRITERION_IDS = new Set(rubric.coreCriteria.map(({ id }) => id));
const ACTIVE_MODULE_IDS = new Set(rubric.activeOptionalModules);

export const questionDraftSchema = z
  .object({
    id: z.string().uuid().optional(),
    position: z.number().int().positive(),
    prompt: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.promptChars,
        `La consigna supera ${INPUT_LIMITS.assessment.promptChars} caracteres.`,
      ),
    instructions: z
      .string()
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.questionInstructionsChars,
        `Las instrucciones de la pregunta superan ${INPUT_LIMITS.assessment.questionInstructionsChars} caracteres.`,
      )
      .default(''),
    suggestedMinWords: z.number().int().nonnegative().nullable(),
    suggestedMaxWords: z.number().int().positive().nullable(),
    activeCriteria: z.array(z.string()).min(1),
    activeModules: z.array(z.string()),
    curriculumLinks: z.record(z.unknown()),
  })
  .superRefine((question, context) => {
    if (question.activeCriteria.some((id) => !CORE_CRITERION_IDS.has(id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activeCriteria'],
        message: 'La pregunta contiene un criterio que no existe en la rúbrica activa.',
      });
    }

    if (question.activeModules.some((id) => !ACTIVE_MODULE_IDS.has(id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activeModules'],
        message: 'La pregunta contiene un módulo que no está habilitado en Lite.',
      });
    }

    if (
      question.suggestedMinWords !== null &&
      question.suggestedMaxWords !== null &&
      question.suggestedMinWords > question.suggestedMaxWords
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['suggestedMaxWords'],
        message: 'El máximo de palabras debe ser mayor o igual que el mínimo.',
      });
    }
  });

export const assessmentDraftSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.titleChars,
        `El título supera ${INPUT_LIMITS.assessment.titleChars} caracteres.`,
      ),
    purpose: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.purposeChars,
        `El propósito supera ${INPUT_LIMITS.assessment.purposeChars} caracteres.`,
      ),
    readingText: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.readingChars,
        `La lectura supera ${INPUT_LIMITS.assessment.readingChars} caracteres.`,
      ),
    generalInstructions: z
      .string()
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.generalInstructionsChars,
        `Las instrucciones generales superan ${INPUT_LIMITS.assessment.generalInstructionsChars} caracteres.`,
      ),
    opensAt: z.string().datetime({ offset: true }).nullable(),
    closesAt: z.string().datetime({ offset: true }).nullable(),
    pastePolicy: z.enum(['allow', 'discourage']),
    curriculumVersion: z
      .string()
      .refine(
        (value) => unicodeLength(value) <= INPUT_LIMITS.assessment.curriculumVersionChars,
        `La versión curricular supera ${INPUT_LIMITS.assessment.curriculumVersionChars} caracteres.`,
      )
      .nullable(),
    questions: z
      .array(questionDraftSchema)
      .min(INPUT_LIMITS.assessment.questionsMin)
      .max(INPUT_LIMITS.assessment.questionsMax),
  })
  .superRefine((assessment, context) => {
    assessment.questions.forEach((question, index) => {
      if (question.position !== index + 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', index, 'position'],
          message: 'Las preguntas deben conservar posiciones consecutivas desde 1.',
        });
      }
    });

    if (
      assessment.opensAt !== null &&
      assessment.closesAt !== null &&
      new Date(assessment.closesAt).getTime() <= new Date(assessment.opensAt).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closesAt'],
        message: 'El cierre debe ser posterior a la apertura.',
      });
    }
  });

export type QuestionDraftInput = z.infer<typeof questionDraftSchema>;
export type AssessmentDraftInput = z.infer<typeof assessmentDraftSchema>;
