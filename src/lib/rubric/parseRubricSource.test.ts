import { describe, expect, it } from 'vitest';
import { parseRubricSource } from './parseRubricSource';

describe('parseRubricSource', () => {
  it('extrae identificadores y códigos en el orden del documento', () => {
    const markdown = `
### C1. Primer criterio
**Identificador:** \`core.primero\`

### C2. Segundo criterio
**Identificador:** \`optional.segundo\`

## Inventario de errores
| Código | Categoría |
|---|---|
| \`ORT-A\` | Acentuación |
| \`RAZ\` | Razonamiento |
`;

    expect(parseRubricSource(markdown)).toEqual({
      criterionIds: ['core.primero', 'optional.segundo'],
      observationCodes: ['ORT-A', 'RAZ'],
    });
  });

  it('acota el inventario a su propia sección y no captura tablas posteriores', () => {
    const markdown = `
## 9. Inventario de errores y observaciones
| Código | Categoría |
|---|---|
| \`ORT-A\` | Acentuación |

### 9.1. Datos obligatorios

## 10. Perfil diagnóstico
| Campo | Detalle |
|---|---|
| \`nivel\` | de 1 a 4 |
`;

    expect(parseRubricSource(markdown).observationCodes).toEqual(['ORT-A']);
  });
});
