-- Late enrollment reuses the canonical importer and its atomic 50-student limit.
-- Pure normalization has no data access; allow the invoker to reuse it.
grant execute on function public.normalize_lite_student_name(text) to authenticated;
create or replace function public.add_student_to_group(p_group_id uuid, p_full_name text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null or not public.is_teacher() then raise exception 'teacher role required'; end if;
  perform 1 from public.groups where id=p_group_id and status='active' for update;
  if not found then raise exception 'active group not found'; end if;
  v_name := public.normalize_lite_student_name(p_full_name);
  if exists(select 1 from public.students where group_id=p_group_id and full_name_normalized=v_name) then
    raise exception 'student already exists' using errcode='23505';
  end if;
  perform public.import_students_to_group(p_group_id, pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('full_name_original',p_full_name)));
  select id into v_id from public.students where group_id=p_group_id and full_name_normalized=v_name;
  return v_id;
end; $$;
revoke all on function public.add_student_to_group(uuid,text) from public, anon, authenticated;
grant execute on function public.add_student_to_group(uuid,text) to authenticated;

-- Service-only operation. Never replaces an existing code, session or submission.
create or replace function public.extend_assessment_accesses(p_assessment_id uuid, p_group_id uuid, p_accesses jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_inserted integer;
begin
  perform 1 from public.assessments where id=p_assessment_id and status='open' for update;
  if not found then raise exception 'open assessment not found'; end if;
  perform 1 from public.groups where id=p_group_id and status='active' for update;
  if not found then raise exception 'active group not found'; end if;
  if pg_catalog.jsonb_typeof(p_accesses) is distinct from 'array' or pg_catalog.jsonb_array_length(p_accesses) not between 1 and 50 then
    raise exception 'invalid accesses';
  end if;
  if exists(select 1 from pg_catalog.jsonb_array_elements(p_accesses) e
    left join public.students s on s.id=(e->>'student_id')::uuid and s.group_id=p_group_id and s.status='active'
    where s.id is null or coalesce(pg_catalog.char_length(e->>'code_hash'),0) not between 1 and 256) then
    raise exception 'invalid student access';
  end if;
  if (select count(distinct e->>'student_id') from pg_catalog.jsonb_array_elements(p_accesses) e) <> pg_catalog.jsonb_array_length(p_accesses) then
    raise exception 'duplicate access';
  end if;
  insert into public.assessment_access(assessment_id,student_id,code_hash,code_generation)
    select p_assessment_id,(e->>'student_id')::uuid,e->>'code_hash',1 from pg_catalog.jsonb_array_elements(p_accesses) e
    on conflict (assessment_id,student_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end; $$;
revoke all on function public.extend_assessment_accesses(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.extend_assessment_accesses(uuid,uuid,jsonb) to service_role;
