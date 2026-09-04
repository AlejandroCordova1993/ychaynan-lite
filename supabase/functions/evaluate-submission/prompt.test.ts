import { describe, expect, it } from 'vitest';
import { buildEvaluationMessages, type EvaluationPromptInput } from './prompt.ts';

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
      wordCount: 7,
      activeCriteria: ['core.pertinencia', 'core.comprension_explicita'],
      activeModules: [],
    },
  ],
};

describe('buildEvaluationMessages', () => {
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
