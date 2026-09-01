// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './pgliteFixture';

let db: PGlite;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => db.close());

async function seed() {
  const group = await db.query<{ id: string }>(
    `insert into public.groups (name, school_year) values ('3RO B.G.U. A', '2026') returning id`,
  );
  const student = await db.query<{ id: string }>(
    `insert into public.students (group_id, full_name_original, full_name_normalized) values ($1, 'María Peña', 'maria peña') returning id`,
    [group.rows[0].id],
  );
  const assessment = await db.query<{ id: string }>(
    `insert into public.assessments (slug,title,purpose,reading_text,status,rubric_snapshot,rubric_schema_version,rubric_hash,opened_at) values ('diagnostico','Diagnóstico','Base','Lectura','open','{}','1','hash',now()) returning id`,
  );
  const access = await db.query<{ id: string }>(
    `insert into public.assessment_access (assessment_id,student_id,code_hash) values ($1,$2,'code-hash') returning id`,
    [assessment.rows[0].id, student.rows[0].id],
  );
  return { accessId: access.rows[0].id };
}

describe('validate_student_access', () => {
  it('crea una sesión, una entrega y revoca la sesión anterior', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    const first = await db.query<{ result: { ok: boolean; submissionId: string } }>(
      `select public.validate_student_access('diagnostico','maria peña','3ro b g u a','code-hash','fingerprint','token-1','key-1',180) as result`,
    );
    const second = await db.query<{ result: { ok: boolean; submissionId: string } }>(
      `select public.validate_student_access('diagnostico','maria peña','3ro b g u a','code-hash','fingerprint','token-2','key-2',180) as result`,
    );
    expect(first.rows[0].result.ok).toBe(true);
    expect(second.rows[0].result.submissionId).toBe(first.rows[0].result.submissionId);
    const sessions = await db.query<{ token_hash: string; revoked_at: string | null }>(
      `select token_hash, revoked_at from public.student_sessions where assessment_access_id=$1 order by created_at`,
      [seeded.accessId],
    );
    expect(sessions.rows).toHaveLength(2);
    expect(sessions.rows[0].revoked_at).not.toBeNull();
    expect(sessions.rows[1]).toMatchObject({ token_hash: 'token-2', revoked_at: null });
  });

  it('devuelve el mismo error público y aplica espera tras el tercer código incorrecto', async () => {
    const seeded = await seed();
    await db.exec('set role service_role');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await db.query<{ result: { ok: boolean; error: string } }>(
        `select public.validate_student_access('diagnostico','maria peña','3ro b g u a','incorrecto','fp-' || $1,'token-' || $1,'key-' || $1,180) as result`,
        [attempt],
      );
      expect(result.rows[0].result).toEqual({ ok: false, error: 'invalid access' });
    }
    const access = await db.query<{ failed_attempts: number; cooldown_until: string | null }>(
      `select failed_attempts,cooldown_until from public.assessment_access where id=$1`,
      [seeded.accessId],
    );
    expect(access.rows[0].failed_attempts).toBe(3);
    expect(access.rows[0].cooldown_until).not.toBeNull();
  });

  it('no concede ejecución a anon ni authenticated', async () => {
    const privileges = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(
      `select has_function_privilege('anon','public.validate_student_access(text,text,text,text,text,text,text,integer)','EXECUTE') as anon, has_function_privilege('authenticated','public.validate_student_access(text,text,text,text,text,text,text,integer)','EXECUTE') as authenticated, has_function_privilege('service_role','public.validate_student_access(text,text,text,text,text,text,text,integer)','EXECUTE') as service`,
    );
    expect(privileges.rows[0]).toEqual({ anon: false, authenticated: false, service: true });
  });
});
