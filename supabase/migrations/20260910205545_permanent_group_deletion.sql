-- Permiso efímero interno: no es un ajuste de sesión que el cliente pueda falsificar.
create schema if not exists lite_private;
revoke all on schema lite_private from public, anon, authenticated;
create table lite_private.group_deletion_scope (
  transaction_id bigint not null,
  submission_id uuid not null,
  primary key (transaction_id, submission_id)
);
alter table lite_private.group_deletion_scope enable row level security;
revoke all on lite_private.group_deletion_scope from public, anon, authenticated, service_role;

create function lite_private.response_deletion_allowed(p_submission_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  select public.is_teacher() and auth.uid() is not null and exists (
    select 1 from lite_private.group_deletion_scope
    where transaction_id = pg_catalog.txid_current() and submission_id = p_submission_id
  )
$$;
revoke all on function lite_private.response_deletion_allowed(uuid) from public, anon;
grant usage on schema lite_private to authenticated, service_role;
grant execute on function lite_private.response_deletion_allowed(uuid) to authenticated, service_role;

create or replace function public.prevent_response_edit_after_submit()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare submission_status text;
begin
  select status into submission_status from public.submissions
    where id = case when tg_op = 'DELETE' then old.submission_id else new.submission_id end;
  if tg_op = 'DELETE' then
    if lite_private.response_deletion_allowed(old.submission_id) then return old; end if;
    if old.submitted_at is not null or submission_status = 'submitted' then
      raise exception 'response is immutable once submitted';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if submission_status = 'submitted' then raise exception 'cannot add a response to a submitted submission'; end if;
    return new;
  end if;
  if old.submitted_at is not null or submission_status = 'submitted' then
    if new.submission_id is distinct from old.submission_id
      or new.question_id is distinct from old.question_id
      or new.original_text is distinct from old.original_text
      or new.word_count is distinct from old.word_count
      or new.content_hash is distinct from old.content_hash
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'response is immutable once submitted';
    end if;
  end if;
  return new;
end;
$$;

-- La función privilegiada vive fuera de los esquemas expuestos. Solo admite
-- docentes, verifica el nombre exacto y no permite identificadores de estudiante libres.
create function lite_private.delete_group_permanently(p_group_id uuid, p_confirmation text, p_preview boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_name text; v_counts jsonb;
begin
  if auth.uid() is null or not public.is_teacher() then
    raise exception 'teacher required' using errcode = '42501';
  end if;
  select name into v_name from public.groups where id = p_group_id for update;
  if not found then raise exception 'group not found'; end if;
  if not coalesce(p_preview, false) and p_confirmation is distinct from v_name then
    raise exception 'group name confirmation required' using errcode = 'PGL02';
  end if;
  -- Las FK y los bloqueos impiden nuevas matrículas, accesos, entregas o
  -- respuestas concurrentes durante el borrado; toda la operación es atómica.
  perform 1 from public.students where group_id = p_group_id order by id for update;
  perform 1 from public.assessment_access where student_id in (select id from public.students where group_id = p_group_id) order by id for update;
  perform 1 from public.submissions where student_id in (select id from public.students where group_id = p_group_id) order by id for update;
  select pg_catalog.jsonb_build_object(
    'students', (select count(*) from public.students where group_id = p_group_id),
    'accesses', (select count(*) from public.assessment_access where student_id in (select id from public.students where group_id = p_group_id)),
    'submissions', (select count(*) from public.submissions where student_id in (select id from public.students where group_id = p_group_id)),
    'responses', (select count(*) from public.responses where submission_id in (select sub.id from public.submissions sub join public.students s on s.id = sub.student_id where s.group_id = p_group_id)),
    'evaluations', (select count(*) from public.ai_evaluations where submission_id in (select sub.id from public.submissions sub join public.students s on s.id = sub.student_id where s.group_id = p_group_id))
  ) into v_counts;
  if p_preview then return v_counts; end if;
  insert into lite_private.group_deletion_scope
    select pg_catalog.txid_current(), sub.id from public.submissions sub
    join public.students s on s.id = sub.student_id where s.group_id = p_group_id;
  delete from public.submissions where student_id in (select id from public.students where group_id = p_group_id);
  delete from public.assessment_access where student_id in (select id from public.students where group_id = p_group_id);
  delete from public.students where group_id = p_group_id;
  delete from public.groups where id = p_group_id;
  delete from lite_private.group_deletion_scope where transaction_id = pg_catalog.txid_current();
  return v_counts;
end;
$$;
revoke all on function lite_private.delete_group_permanently(uuid,text,boolean) from public, anon;
grant execute on function lite_private.delete_group_permanently(uuid,text,boolean) to authenticated;

create function public.delete_group_permanently(p_group_id uuid, p_confirmation text default null, p_preview boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$
  select lite_private.delete_group_permanently(p_group_id, p_confirmation, p_preview)
$$;
revoke all on function public.delete_group_permanently(uuid,text,boolean) from public, anon;
grant execute on function public.delete_group_permanently(uuid,text,boolean) to authenticated;
