// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deriveRecoverableAccessCode,
  hashAccessCode,
} from '../../../supabase/functions/_shared/crypto.ts';
import { createTestDatabase } from './pgliteFixture';

const PEPPER = 'pepper-de-integracion';

let db: PGlite;

beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

interface Seeded {
  assessmentId: string;
  studentId: string;
  accessId: string;
}

async function seed(): Promise<Seeded> {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3RO B.G.U. A', '2026') returning id`,
  );
  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized)
     values ($1, 'María Peña', public.normalize_lite_identity('María Peña')) returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments
       (slug, title, purpose, reading_text, status, rubric_snapshot, rubric_schema_version,
        rubric_hash, opened_at)
     values ('diagnostico', 'Diagnóstico', 'Base', 'Lectura', 'open', '{}', '1', 'hash', now())
     returning id`,
  );
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access (assessment_id, student_id, code_hash, code_generation)
     values ($1, $2, 'hash-heredado', 0) returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  return {
    assessmentId: assessment.rows[0].id,
    studentId: student.rows[0].id,
    accessId: access.rows[0].id,
  };
}

async function login(codeHash: string, token: string): Promise<{ ok: boolean }> {
  const result = await db.query<{ result: { ok: boolean } }>(
    `select public.validate_student_access(
       'diagnostico',
       public.normalize_lite_identity('María Peña'),
       public.normalize_lite_identity('3RO B.G.U. A'),
       $1, 'fingerprint-' || $2, $2, 'key-' || $2, 180
     ) as result`,
    [codeHash, token],
  );
  return result.rows[0].result;
}

describe('ingreso estudiantil con un código derivado', () => {
  it('permite entrar con el código que el docente puede volver a consultar', async () => {
    const seeded = await seed();
    const code = await deriveRecoverableAccessCode(
      PEPPER,
      seeded.assessmentId,
      seeded.studentId,
      1,
    );
    await db.exec('set role service_role');
    await db.query(`select public.rotate_legacy_assessment_access_codes($1, $2::jsonb)`, [
      seeded.assessmentId,
      JSON.stringify([
        { access_id: seeded.accessId, code_hash: await hashAccessCode(code, PEPPER) },
      ]),
    ]);

    await expect(login(await hashAccessCode(code, PEPPER), 'token-1')).resolves.toMatchObject({
      ok: true,
    });
    await expect(login('hash-heredado', 'token-2')).resolves.toEqual({
      ok: false,
      error: 'invalid access',
    });
  });

  it('invalida el código anterior en cuanto el docente regenera el acceso', async () => {
    const seeded = await seed();
    const primero = await deriveRecoverableAccessCode(
      PEPPER,
      seeded.assessmentId,
      seeded.studentId,
      1,
    );
    const segundo = await deriveRecoverableAccessCode(
      PEPPER,
      seeded.assessmentId,
      seeded.studentId,
      2,
    );
    expect(segundo).not.toBe(primero);

    await db.exec('set role service_role');
    await db.query(`select public.regenerate_assessment_access_code($1, $2, 1)`, [
      seeded.accessId,
      await hashAccessCode(primero, PEPPER),
    ]);
    await expect(login(await hashAccessCode(primero, PEPPER), 'token-1')).resolves.toMatchObject({
      ok: true,
    });

    await db.query(`select public.regenerate_assessment_access_code($1, $2, 2)`, [
      seeded.accessId,
      await hashAccessCode(segundo, PEPPER),
    ]);

    await expect(login(await hashAccessCode(primero, PEPPER), 'token-2')).resolves.toEqual({
      ok: false,
      error: 'invalid access',
    });
    await expect(login(await hashAccessCode(segundo, PEPPER), 'token-3')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('nunca guarda el código claro en la base', async () => {
    const seeded = await seed();
    const code = await deriveRecoverableAccessCode(
      PEPPER,
      seeded.assessmentId,
      seeded.studentId,
      1,
    );
    await db.exec('set role service_role');
    await db.query(`select public.regenerate_assessment_access_code($1, $2, 1)`, [
      seeded.accessId,
      await hashAccessCode(code, PEPPER),
    ]);

    const almacenado = await db.query<{ fila: string }>(
      `select acceso::text as fila from public.assessment_access as acceso`,
    );
    expect(almacenado.rows[0].fila).not.toContain(code);
  });
});
