import { describe, expect, it } from 'vitest';
import { buildEvaluationMessages, type EvaluationPromptInput } from './prompt.ts';
import { parseEvaluationResult } from '../_shared/aiEvaluation.ts';

const input: EvaluationPromptInput = {
  readingText: 'La lectura dice que la comunidad aprende cuando conversa.',
  purpose: 'Observar comprensión y razonamiento.',
  generalInstructions: 'Responde con tus palabras.',
  rubricSnapshot: { version: '1.1', descriptors: 'privados del diagnóstico' },
  questions: [
    {
      position: 1,
      prompt: '¿Qué sostiene la lectura?',
      instructions: 'Explica tu respuesta.',
      responseText: 'La comunidad aprende cuando conversa.',
      omitted: false,
      wordCount: 7,
      activeCriteria: ['core.pertinencia', 'core.comprension_explicita'],
      activeModules: [],
    },
  ],
};

describe('buildEvaluationMessages', () => {
  it('produce una plantilla válida con criterios distintos por pregunta y una omisión', () => {
    const questions = [
      { ...input.questions[0], activeCriteria: ['core.pertinencia'] },
      { ...input.questions[0], position: 2, activeCriteria: ['core.ortografia_acentuacion'] },
      { ...input.questions[0], position: 3, omitted: true, responseText: null, wordCount: 0 },
    ];
    const content = buildEvaluationMessages({ ...input, questions })[0].content;
    const template = JSON.parse(content.split('conserva posiciones y dimensiones:\n')[1]);
    const result = parseEvaluationResult(template, questions);
    expect(result.questionResults[0].observations[0].code).toBe('PERT');
    expect(result.questionResults[1].observations[0].code).toBe('TIPO');
    expect(result.questionResults[2].observations).toEqual([]);
  });
  it('delimita los datos no confiables y exige JSON provisional', () => {
    const messages = buildEvaluationMessages(input);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('solo JSON');
    expect(messages[1].content).toContain('<READING>');
    expect(messages[1].content).toContain('<RESPONSES>');
    expect(messages[1].content).toContain('La lectura dice');
    expect(messages[1].content).toContain('La comunidad aprende');
    expect(messages[1].content).not.toContain('studentId');
    expect(messages[1].content).not.toContain('submissionId');
  });

  it('incluye solo los criterios activos declarados por la pregunta', () => {
    const content = buildEvaluationMessages(input)[0].content;
    expect(content).toContain('core.pertinencia');
    expect(content).toContain('core.comprension_explicita');
    expect(content).not.toContain('core.lectura_critica:');
    expect(content).toContain('Códigos de observación permitidos: PERT');
    expect(content).not.toContain('ORT-L,');
  });

  it('entrega una plantilla exacta por criterio, observación y dimensión', () => {
    const content = buildEvaluationMessages(input)[0].content;
    expect(content).toContain('"criterionId": "core.pertinencia"');
    expect(content).toContain('"criterionId": "core.comprension_explicita"');
    expect(content).toContain('"observations"');
    expect(content).toContain('"severity": "low"');
    expect(content).toContain('"dimension": "convenciones_escritura"');
    expect(content).toContain('"globalConfidence"');
  });
});
