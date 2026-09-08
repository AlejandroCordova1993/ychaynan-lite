// @vitest-environment node
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pgliteFixture';
let db: PGlite;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => {
  await db.close();
});

async function seed() {
  const g = (
    await db.query<{ id: string }>(
      "insert into public.groups(name,school_year) values ('A','2026') returning id",
    )
  ).rows[0].id;
  const a = (
    await db.query<{ id: string }>(
      "insert into public.assessments(slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash) values ('test','Test','Test','Text','open','{}','1','hash') returning id",
    )
  ).rows[0].id;
  return { g, a };
}
async function teacher() {
  await db.exec(
    `set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"teacher"}}';`,
  );
}
it('añade una persona sin archivo, normaliza y rechaza el duplicado sin aumentar la nómina', async () => {
  const { g } = await seed();
  await teacher();
  await db.query("select public.add_student_to_group($1,'María Peña')", [g]);
  await expect(
    db.query("select public.add_student_to_group($1,'MARIA PEÑA')", [g]),
  ).rejects.toThrow(/already exists/);
  const rows = await db.query('select full_name_normalized from public.students');
  expect(rows.rows).toEqual([{ full_name_normalized: 'maria peña' }]);
});
it('añade accesos faltantes, es idempotente y conserva código y estado existentes', async () => {
  const { g, a } = await seed();
  await teacher();
  const s = (
    await db.query<{ id: string }>("select public.add_student_to_group($1,'Ana Ruiz') as id", [g])
  ).rows[0].id;
  await db.exec('reset role; set role service_role');
  const call = (hash: string) =>
    db.query('select public.extend_assessment_accesses($1,$2,$3::jsonb)', [
      a,
      g,
      JSON.stringify([{ student_id: s, code_hash: hash }]),
    ]);
  await call('first');
  await db.query("update public.assessment_access set state='blocked', code_generation=3");
  await call('second');
  expect(
    (await db.query('select code_hash,state,code_generation from public.assessment_access')).rows,
  ).toEqual([{ code_hash: 'first', state: 'blocked', code_generation: 3 }]);
  await db.query("update public.assessments set status='closed'");
  await expect(call('third')).rejects.toThrow(/open/);
});
it('rechaza anónimos y cuentas sin rol docente', async () => {
  const { g } = await seed();
  await db.exec('set role anon');
  await expect(
    db.query("select public.add_student_to_group($1,'Ana Ruiz')", [g]),
  ).rejects.toThrow();
  await db.exec('reset role; set role authenticated');
  await expect(
    db.query("select public.add_student_to_group($1,'Ana Ruiz')", [g]),
  ).rejects.toThrow();
});
