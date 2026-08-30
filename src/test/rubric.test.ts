import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import rubric from '../../rubric-v1.json';
import { describe, expect, it } from 'vitest';
import { parseRubricSource } from '../lib/rubric/parseRubricSource';

describe('contrato operativo de la rúbrica', () => {
  it('contiene exactamente los doce criterios centrales en orden estable', () => {
    expect(rubric.version).toBe('1.1');
    expect(rubric.activeOptionalModules).toEqual([
      'optional.proposito_punto_vista',
      'optional.estructura_argumentativa',
    ]);
    expect(rubric.coreCriteria.map((criterion) => criterion.id)).toEqual([
      'core.pertinencia',
      'core.comprension_explicita',
      'core.comprension_inferencial',
      'core.lectura_critica',
      'core.tesis_posicion',
      'core.evidencia_razonamiento',
      'core.organizacion_coherencia',
      'core.cohesion',
      'core.lexico_registro',
      'core.sintaxis_concordancia',
      'core.ortografia_acentuacion',
      'core.puntuacion_segmentacion',
    ]);
  });

  it('conserva los cuatro niveles de cada criterio y el inventario de 27 observaciones', () => {
    for (const criterion of [...rubric.coreCriteria, ...rubric.optionalModules]) {
      expect(Object.keys(criterion.descriptors)).toEqual([
        'inicial',
        'en_desarrollo',
        'adecuado_banda',
        'consolidado',
      ]);
    }

    expect(rubric.observationCodes).toHaveLength(27);
    expect(rubric.observationCodes).toContain('TIPO');
    expect(rubric.observationCodes).toContain('ORT-A');
    expect(rubric.observationCodes).toContain('FAL');
  });

  it('mantiene alineados el JSON operativo y la rúbrica humana', () => {
    const markdown = readFileSync(
      resolve(process.cwd(), 'RUBRICA_DIAGNOSTICA_COMPLETA.md'),
      'utf8',
    );
    const source = parseRubricSource(markdown);

    const operationalCriterionIds = [
      ...rubric.coreCriteria.map(({ id }) => id),
      ...rubric.activeOptionalModules,
    ];

    expect(source.criterionIds.filter((id) => operationalCriterionIds.includes(id))).toEqual(
      operationalCriterionIds,
    );
    expect(new Set(source.criterionIds).size).toBe(source.criterionIds.length);
    expect(source.observationCodes).toEqual(rubric.observationCodes);

    // Los criterios centrales se comparan en ambas direcciones: un criterio nuevo
    // añadido a la rúbrica humana y olvidado en el JSON operativo debe romper aquí,
    // no pasar en silencio.
    expect(source.criterionIds.filter((id) => id.startsWith('core.'))).toEqual(
      rubric.coreCriteria.map(({ id }) => id),
    );

    // Los módulos opcionales sí son un subconjunto deliberado: la rúbrica humana
    // describe los ocho y el JSON solo declara los que esta versión implementa.
    const sourceOptionalIds = source.criterionIds.filter((id) => id.startsWith('optional.'));
    for (const moduleId of rubric.activeOptionalModules) {
      expect(sourceOptionalIds).toContain(moduleId);
    }
  });
});
