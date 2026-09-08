// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';
import { normalizeStudentName } from '../../../supabase/functions/_shared/normalize';
import { normalizeName } from '../../lib/validation/normalizeName';

let db: PGlite;
let groupId: string;

beforeEach(async () => {
  db = await createTestDatabase();
  groupId = (
    await db.query<{ id: string }>(
      `insert into public.groups(name, school_year) values ('1A', '2026') returning id`,
    )
  ).rows[0].id;
});

afterEach(async () => db.close());

const assumeAuthenticated = async (role: string) => {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000001',
      app_metadata: { role },
    }),
  ]);
  await db.exec('set role authenticated');
};

const assumeTeacher = () => assumeAuthenticated('teacher');

const alphabeticSuffix = (index: number) =>
  String.fromCharCode(65 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));

const alphabeticStudents = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    full_name_original: `Estudiante ${alphabeticSuffix(index)}`,
    authorized_variant: null,
  }));

const importRows = async (
  rows: Array<{ full_name_original: string; authorized_variant: string | null }>,
) => {
  const result = await db.query<{ inserted: number }>(
    `select public.import_students_to_group($1, $2::jsonb) as inserted`,
    [groupId, JSON.stringify(rows)],
  );
  return result.rows[0].inserted;
};

const countStudents = async () =>
  (
    await db.query<{ count: number }>(
      `select count(*)::integer as count from public.students where group_id = $1`,
      [groupId],
    )
  ).rows[0].count;

const storedIdentity = async () =>
  (
    await db.query<{ full_name_normalized: string; authorized_variants: string[] }>(
      `select full_name_normalized, authorized_variants from public.students where group_id = $1`,
      [groupId],
    )
  ).rows[0];

const hasAuthenticatedInsertPrivilege = async () => {
  await db.exec('reset role');
  return (
    await db.query<{ allowed: boolean }>(
      `select has_table_privilege('authenticated', 'public.students', 'insert') as allowed`,
    )
  ).rows[0].allowed;
};

it('inserta exactamente 50', async () => {
  await assumeTeacher();
  expect(await importRows(alphabeticStudents(50))).toBe(50);
  expect(await countStudents()).toBe(50);
});

it('revierte la importación que produciría el estudiante 51', async () => {
  await assumeTeacher();
  await importRows(alphabeticStudents(49));
  await expect(importRows(alphabeticStudents(2))).rejects.toThrow(/maximum 50 students/i);
  expect(await countStudents()).toBe(49);
});

it('normaliza vocales y conserva la ñ', async () => {
  await assumeTeacher();
  await importRows([{ full_name_original: 'María Peña Ñacato', authorized_variant: 'Ma. Peña' }]);
  expect(await storedIdentity()).toEqual({
    full_name_normalized: 'maria peña ñacato',
    authorized_variants: ['ma peña'],
  });
});

it('importa identidades Unicode equivalentes a las del ingreso y del cliente', async () => {
  await assumeTeacher();
  const cases = [
    ['Ana\u00a0María', 'ana maria'],
    ['Franc\u0327ois Muñoz', 'françois muñoz'],
    ["'Ana María'", 'ana maria'],
    ['Ana María\u00a0', 'ana maria'],
    ['Ana\u2007\u202fMaría', 'ana maria'],
    ['\ufeffAna\u3000María\ufeff', 'ana maria'],
    ['MUN\u0303OZ', 'muñoz'],
    ['Pena', 'pena'],
  ];
  for (const [original, expected] of cases) {
    await importRows([{ full_name_original: original, authorized_variant: original }]);
    expect(normalizeStudentName(original)).toBe(expected);
    expect(normalizeName(original)).toBe(expected);
  }
  const { rows } = await db.query<{ full_name_normalized: string; authorized_variants: string[] }>(
    'select full_name_normalized, authorized_variants from public.students where group_id = $1',
    [groupId],
  );
  expect(rows.map((row) => row.full_name_normalized).sort()).toEqual(
    cases.map(([, expected]) => expected).sort(),
  );
  for (const row of rows) expect(row.authorized_variants).toEqual([row.full_name_normalized]);
});

it('usa reglas separadas y equivalentes al cliente para nombres y paralelos', async () => {
  const normalized = await db.query<{ name: string; decomposed: string; group_name: string }>(
    `select
       public.normalize_lite_student_name('Ana.María') as name,
       public.normalize_lite_student_name(U&'Mu\\006E\\0303oz') as decomposed,
       public.normalize_lite_group('3RO B.G.U. A') as group_name`,
  );

  expect(normalized.rows[0]).toEqual({
    name: 'anamaria',
    decomposed: 'muñoz',
    group_name: '3ro b g u a',
  });
});

it('niega anon, cuenta sin rol e INSERT directo', async () => {
  await db.exec('reset role');
  await db.exec('set role anon');
  await expect(
    db.query(`select public.import_students_to_group($1, $2::jsonb)`, [
      groupId,
      JSON.stringify(alphabeticStudents(1)),
    ]),
  ).rejects.toThrow();
  await assumeAuthenticated('student');
  await expect(importRows(alphabeticStudents(1))).rejects.toThrow(/teacher role required/i);
  expect(await hasAuthenticatedInsertPrivilege()).toBe(false);
});
