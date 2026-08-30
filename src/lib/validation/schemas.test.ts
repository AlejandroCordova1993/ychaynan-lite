import { describe, expect, it } from 'vitest';
import { createGroupInputSchema, groupSchema, studentSchema } from './schemas';

describe('groupSchema', () => {
  it('acepta un paralelo válido', () => {
    const result = groupSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      name: '3ro BGU A',
      schoolYear: '2026-2027',
      status: 'active',
    });
    expect(result.status).toBe('active');
  });

  it('rechaza un estado que no sea active o archived', () => {
    expect(() =>
      groupSchema.parse({
        id: '11111111-1111-1111-1111-111111111111',
        name: '3ro BGU A',
        schoolYear: '2026-2027',
        status: 'borrado',
      }),
    ).toThrow();
  });
});

describe('createGroupInputSchema', () => {
  it('rechaza un nombre vacío', () => {
    expect(() => createGroupInputSchema.parse({ name: '', schoolYear: '2026-2027' })).toThrow();
  });

  it('rechaza un nombre compuesto únicamente por espacios', () => {
    expect(() => createGroupInputSchema.parse({ name: '   ', schoolYear: '2026-2027' })).toThrow();
  });

  it('recorta los campos antes de validarlos', () => {
    expect(
      createGroupInputSchema.parse({ name: ' 3ro BGU A ', schoolYear: ' 2026-2027 ' }),
    ).toEqual({ name: '3ro BGU A', schoolYear: '2026-2027' });
  });

  it('rechaza un nombre de más de 160 caracteres', () => {
    expect(() =>
      createGroupInputSchema.parse({ name: 'a'.repeat(161), schoolYear: '2026-2027' }),
    ).toThrow();
  });
});

describe('studentSchema', () => {
  it('acepta un estudiante válido con variantes autorizadas', () => {
    const result = studentSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      groupId: '22222222-2222-2222-2222-222222222222',
      fullNameOriginal: 'María José Peña Ñacato',
      fullNameNormalized: 'maria jose peña ñacato',
      authorizedVariants: [],
      status: 'active',
    });
    expect(result.fullNameOriginal).toBe('María José Peña Ñacato');
  });
});
