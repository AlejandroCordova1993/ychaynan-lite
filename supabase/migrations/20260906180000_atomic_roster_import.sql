-- Importación de nómina atómica y con privilegio mínimo.
-- El navegador pierde el INSERT directo sobre public.students: el tope de 50
-- por paralelo se evalúa dentro de una sola transacción que bloquea el curso.
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
    values (p_group_id, v_original, public.normalize_lite_identity(v_original), case when v_variant is null then '{}'::text[] else array[public.normalize_lite_identity(v_variant)] end);
    v_inserted := v_inserted + 1;
  end loop;
  return v_inserted;
end;
$$;

revoke insert on table public.students from authenticated;
revoke all on function public.import_students_to_group(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_students_to_group(uuid, jsonb) to authenticated;
