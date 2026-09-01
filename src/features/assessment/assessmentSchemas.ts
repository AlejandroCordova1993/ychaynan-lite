import { z } from 'zod';
import rubric from '../../../rubric-v1.json';

const CORE_CRITERION_IDS = new Set(rubric.coreCriteria.map(({ id }) => id));
const ACTIVE_MODULE_IDS = new Set(rubric.activeOptionalModules);

export const questionDraftSchema = z
  .object({
    id: z.string().uuid().optional(),
    position: z.number().int().positive(),
    prompt: z.string().trim().min(1).max(2000),
    instructions: z.string().max(4000).default(''),
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
    title: z.string().trim().min(1).max(160),
    purpose: z.string().trim().min(1).max(1000),
    readingText: z.string().trim().min(1).max(30000),
    generalInstructions: z.string().max(6000),
    opensAt: z.string().datetime().nullable(),
    closesAt: z.string().datetime().nullable(),
    pastePolicy: z.enum(['allow', 'discourage']),
    curriculumVersion: z.string().max(80).nullable(),
    questions: z.array(questionDraftSchema).min(1).max(4),
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
