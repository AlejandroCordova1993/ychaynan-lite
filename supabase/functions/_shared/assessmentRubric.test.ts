import { describe, expect, it } from 'vitest';
import rubric from '../../../rubric-v1.json';
import { CORE_CRITERIA, OPTIONAL_MODULES } from './assessmentRubric.ts';

describe('assessmentRubric', () => {
  it('mantiene sincronizados los identificadores que la IA puede seleccionar', () => {
    expect(CORE_CRITERIA.map(({ id }) => id)).toEqual(rubric.coreCriteria.map(({ id }) => id));
    expect(OPTIONAL_MODULES.map(({ id }) => id)).toEqual(
      rubric.optionalModules
        .filter(({ id }) => rubric.activeOptionalModules.includes(id))
        .map(({ id }) => id),
    );
  });

  it('mantiene sincronizadas las etiquetas legibles que ve el docente en la vista previa', () => {
    expect(CORE_CRITERIA.map(({ id, label }) => ({ id, label }))).toEqual(
      rubric.coreCriteria.map(({ id, label }) => ({ id, label })),
    );
    expect(OPTIONAL_MODULES.map(({ id, label }) => ({ id, label }))).toEqual(
      rubric.optionalModules
        .filter(({ id }) => rubric.activeOptionalModules.includes(id))
        .map(({ id, label }) => ({ id, label })),
    );
  });
});
