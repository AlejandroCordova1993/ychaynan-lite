-- Códigos estudiantiles recuperables (docs/superpowers/specs/2026-09-04-codigos-recuperables-design.md).
--
-- El código claro nunca se almacena: el servidor lo deriva con HMAC-SHA-256 a
-- partir de ACCESS_CODE_PEPPER, la evaluación, el estudiante y esta generación.
-- Incrementar la generación produce un código nuevo e invalida el anterior.
--
-- Semántica de code_generation:
--   0  código heredado aleatorio, imposible de reconstruir;
--   >=1 código determinista recuperable por el docente autenticado.
--
-- Ninguna migración ya aplicada se modifica aquí; las funciones anteriores se
-- conservan para que el despliegue no tenga una ventana incompatible.

alter table public.assessment_access
  add column code_generation integer not null default 0;

alter table public.assessment_access
  add constraint assessment_access_code_generation_non_negative
  check (code_generation >= 0);

comment on column public.assessment_access.code_generation is
  'Generación del código derivado. 0 = código heredado aleatorio no recuperable.';

-- Apertura de la evaluación con códigos recuperables desde el primer momento.
create or replace function public.open_assessment_with_recoverable_accesses(
  p_assessment_id uuid,
  p_group_id uuid,
  p_accesses jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_assessment_id uuid;
begin
  v_assessment_id := public.open_assessment_with_accesses(p_assessment_id, p_group_id, p_accesses);

  update public.assessment_access
     set code_generation = 1
   where assessment_id = v_assessment_id;

  return v_assessment_id;
end;
$$;

-- Regeneración individual: invalida el código anterior y cierra sus sesiones,
-- sin tocar submissions ni responses.
create or replace function public.regenerate_assessment_access_code(
  p_access_id uuid,
  p_code_hash text,
  p_code_generation integer
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if nullif(p_code_hash, '') is null then
    raise exception 'code hash is required';
  end if;

  if p_code_generation is null or p_code_generation < 1 then
    raise exception 'recoverable code generation must be positive';
  end if;

  update public.assessment_access
     set code_hash = p_code_hash,
         code_generation = p_code_generation,
         state = 'unused',
         failed_attempts = 0,
         cooldown_until = null,
         generated_at = pg_catalog.clock_timestamp(),
         first_used_at = null
   where id = p_access_id
     and state <> 'submitted'
     and code_generation < p_code_generation;

  if not found then
    if exists (
      select 1 from public.assessment_access where id = p_access_id and state = 'submitted'
    ) then
      raise exception 'submitted access cannot be regenerated';
    end if;
    if exists (select 1 from public.assessment_access where id = p_access_id) then
      raise exception 'stale recoverable code generation';
    end if;
    raise exception 'access not found';
  end if;

  update public.student_sessions
     set revoked_at = pg_catalog.now()
   where assessment_access_id = p_access_id
     and revoked_at is null;
end;
$$;

-- Conversión explícita de los códigos heredados. Una sola transacción gana:
-- la fila de la evaluación se bloquea antes de reescribir los hashes.
create or replace function public.rotate_legacy_assessment_access_codes(
  p_assessment_id uuid,
  p_codes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_rotated uuid[];
  v_revoked integer;
begin
  if jsonb_typeof(p_codes) is distinct from 'array' then
    raise exception 'codes must be a JSON array';
  end if;

  perform 1
    from public.assessments
   where id = p_assessment_id
     and status = 'open'
   for update;

  if not found then
    raise exception 'open assessment not found';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_codes) as code(value)
     where nullif(code.value ->> 'access_id', '') is null
        or nullif(code.value ->> 'code_hash', '') is null
  ) then
    raise exception 'codes must include access_id and code_hash';
  end if;

  if (
    select pg_catalog.count(distinct code.value ->> 'access_id')
      from jsonb_array_elements(p_codes) as code(value)
  ) <> jsonb_array_length(p_codes) then
    raise exception 'codes must not repeat an access';
  end if;

  with rotated as (
    update public.assessment_access access
       set code_hash = code.value ->> 'code_hash',
           code_generation = 1,
           state = 'unused',
           failed_attempts = 0,
           cooldown_until = null,
           generated_at = pg_catalog.clock_timestamp(),
           first_used_at = null
      from jsonb_array_elements(p_codes) as code(value)
     where access.id = (code.value ->> 'access_id')::uuid
       and access.assessment_id = p_assessment_id
       and access.code_generation = 0
       and access.state in ('unused', 'active', 'blocked')
    returning access.id
  )
  select pg_catalog.array_agg(id) into v_rotated from rotated;

  v_rotated := coalesce(v_rotated, '{}'::uuid[]);

  update public.student_sessions
     set revoked_at = pg_catalog.now()
   where assessment_access_id = any(v_rotated)
     and revoked_at is null;
  get diagnostics v_revoked = row_count;

  return pg_catalog.jsonb_build_object(
    'rotated', pg_catalog.cardinality(v_rotated),
    'revokedSessions', v_revoked
  );
end;
$$;

revoke all on function
  public.open_assessment_with_recoverable_accesses(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function
  public.open_assessment_with_recoverable_accesses(uuid, uuid, jsonb)
  to service_role;

revoke all on function public.regenerate_assessment_access_code(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.regenerate_assessment_access_code(uuid, text, integer)
  to service_role;

revoke all on function public.rotate_legacy_assessment_access_codes(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.rotate_legacy_assessment_access_codes(uuid, jsonb)
  to service_role;
