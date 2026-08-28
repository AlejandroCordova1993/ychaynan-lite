import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();

  // Simula lo mínimo que Supabase ya provee antes de que corran nuestras migraciones:
  // los roles anon/authenticated y un auth.uid() de solo lectura.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users (id) values
      ('00000000-0000-0000-0000-000000000001'),
      ('00000000-0000-0000-0000-000000000002');
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid
    $$;
    create or replace function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
    $$;
  `);

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const fileName of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, fileName), 'utf-8');
    await db.exec(sql);
  }

  // Las migraciones declaran explícitamente los privilegios de la Data API.
  // El fixture no concede permisos implícitos: así detecta regresiones de GRANT/REVOKE.

  await db.exec(`
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant execute on function auth.jwt() to anon, authenticated;
  `);

  return db;
}
