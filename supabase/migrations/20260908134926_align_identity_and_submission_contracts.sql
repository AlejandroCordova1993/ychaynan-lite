-- Alinea la normalización persistida de nombres con el cliente y las Edge
-- Functions. No reescribe estudiantes existentes: una corrección de datos debe
-- revisar primero colisiones y hacerse como operación separada.
create or replace function public.normalize_lite_student_name(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  with lowered as (
    select pg_catalog.lower(pg_catalog.normalize(p_value, 'NFC')) as value
  ), folded as (
    select pg_catalog.translate(value, 'áéíóúü', 'aeiouu') as value from lowered
  ), punctuated as (
    select pg_catalog.replace(
      pg_catalog.replace(
        pg_catalog.replace(
          pg_catalog.replace(value, '.', ''),
          ',', ''
        ),
        '-', ' '
      ),
      '''', ' '
    ) as value
    from folded
  )
  -- Lista de espacios de ECMAScript (\s): PostgreSQL no incluye todos los
  -- espacios Unicode en su clase \s, por ejemplo NBSP, U+202F y BOM.
  select pg_catalog.btrim(pg_catalog.regexp_replace(
    value,
    U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+',
    ' ', 'g'
  ))
  from punctuated
$$;

create or replace function public.normalize_lite_group(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select public.normalize_lite_identity(p_value)
$$;

revoke all on function public.normalize_lite_student_name(text) from public, anon, authenticated;
revoke all on function public.normalize_lite_group(text) from public, anon, authenticated;
grant execute on function public.normalize_lite_student_name(text) to service_role;
grant execute on function public.normalize_lite_group(text) to service_role;

create or replace function public.import_students_to_group(p_group_id uuid, p_students jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student jsonb;
  v_original text;
  v_variant text;
  v_current_count integer;
  v_inserted integer := 0;
begin
  if not public.is_teacher() then raise exception 'teacher role required'; end if;
  if pg_catalog.jsonb_typeof(p_students) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_students) not between 1 and 50 then
    raise exception 'students must contain between 1 and 50 rows';
  end if;

  perform 1 from public.groups where id = p_group_id and status = 'active' for update;
  if not found then raise exception 'active group not found'; end if;
  select pg_catalog.count(*)::integer into v_current_count from public.students where group_id = p_group_id;
  if v_current_count + pg_catalog.jsonb_array_length(p_students) > 50 then
    raise exception 'group would exceed maximum 50 students';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_students) item(value)
    where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
       or exists (select 1 from pg_catalog.jsonb_object_keys(item.value) key(name) where key.name not in ('full_name_original', 'authorized_variant'))
       or pg_catalog.jsonb_typeof(item.value -> 'full_name_original') is distinct from 'string'
       or pg_catalog.char_length(pg_catalog.btrim(item.value ->> 'full_name_original')) not between 1 and 160
       or (item.value ->> 'full_name_original') ~ '[0-9[:cntrl:]]'
       or (item.value ? 'authorized_variant' and pg_catalog.jsonb_typeof(item.value -> 'authorized_variant') not in ('string', 'null'))
       or pg_catalog.char_length(pg_catalog.btrim(coalesce(item.value ->> 'authorized_variant', ''))) > 160
       or coalesce(item.value ->> 'authorized_variant', '') ~ '[0-9[:cntrl:]]'
  ) then raise exception 'invalid student rows'; end if;

  for v_student in select value from pg_catalog.jsonb_array_elements(p_students) loop
    v_original := pg_catalog.regexp_replace(pg_catalog.btrim(v_student ->> 'full_name_original'), '\s+', ' ', 'g');
    v_variant := nullif(pg_catalog.regexp_replace(pg_catalog.btrim(v_student ->> 'authorized_variant'), '\s+', ' ', 'g'), '');
    insert into public.students(group_id, full_name_original, full_name_normalized, authorized_variants)
    values (
      p_group_id,
      v_original,
      public.normalize_lite_student_name(v_original),
      case when v_variant is null then '{}'::text[] else array[public.normalize_lite_student_name(v_variant)] end
    );
    v_inserted := v_inserted + 1;
  end loop;
  return v_inserted;
end;
$$;

revoke all on function public.import_students_to_group(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_students_to_group(uuid, jsonb) to authenticated;

comment on function public.normalize_lite_student_name(text) is
  'Normaliza nombres nuevos como cliente/Edge. No usar para reescribir filas existentes sin revisar colisiones.';

alter table public.ai_evaluations
  add column if not exists lease_token uuid;

comment on column public.ai_evaluations.lease_token is
  'Identifica la reserva vigente e impide que una ejecución vencida sobrescriba un reintento.';

-- La evaluación la escribe únicamente la Edge Function con service_role. El
-- docente conserva lectura y revisa mediante la RPC validada, no con UPDATE libre.
revoke insert, update, delete on table public.ai_evaluations from authenticated;
grant select on table public.ai_evaluations to authenticated;

alter function public.review_submission_evaluation(uuid, text, jsonb, text)
  security definer;

create or replace function public.prevent_ai_original_output_edit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Un fallo representa un intento terminado, no una salida pedagógica. El
  -- backend puede limpiarlo y reservar otro intento manteniendo su identidad.
  if old.status = 'failed' and new.status = 'running' then
    if new.submission_id is distinct from old.submission_id
      or new.rubric_schema_version is distinct from old.rubric_schema_version
      or new.rubric_hash is distinct from old.rubric_hash
      or new.prompt_version is distinct from old.prompt_version
      or new.result_json is not null
      or new.dimension_summary_json is not null
      or new.confidence is not null
      or new.completed_at is not null
      or new.teacher_adjustments is distinct from old.teacher_adjustments
      or new.teacher_note is distinct from old.teacher_note
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception 'invalid AI evaluation retry';
    end if;
    return new;
  end if;

  if old.status in ('completed', 'failed', 'reviewed', 'discarded') and (
    new.submission_id is distinct from old.submission_id
    or new.rubric_schema_version is distinct from old.rubric_schema_version
    or new.rubric_hash is distinct from old.rubric_hash
    or new.prompt_version is distinct from old.prompt_version
    or new.provider is distinct from old.provider
    or new.model is distinct from old.model
    or new.result_json is distinct from old.result_json
    or new.dimension_summary_json is distinct from old.dimension_summary_json
    or new.confidence is distinct from old.confidence
    or new.error_code is distinct from old.error_code
    or new.error_message_safe is distinct from old.error_message_safe
    or new.requested_at is distinct from old.requested_at
    or new.completed_at is distinct from old.completed_at
    or new.lease_token is distinct from old.lease_token
  ) then
    raise exception 'original AI output is immutable after evaluation completion';
  end if;

  return new;
end;
$$;
