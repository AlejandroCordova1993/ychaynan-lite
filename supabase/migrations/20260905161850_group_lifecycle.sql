-- RPC docente transaccional. No elimina respuestas ni desactiva triggers.
create or replace function public.manage_group(p_group_id uuid, p_action text)
returns void language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if not public.is_teacher() or auth.uid() is null then
    raise exception 'teacher required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('archive','restore','delete') then
    raise exception 'invalid group action';
  end if;
  perform 1 from public.groups where id = p_group_id for update;
  if not found then raise exception 'group not found'; end if;

  if p_action = 'delete' then
    -- Bloquea matrículas y referencias concurrentes mediante las FK y estos locks.
    perform 1 from public.students where group_id = p_group_id order by id for update;
    if exists (
      select 1 from public.assessment_access a join public.students s on s.id=a.student_id
      where s.group_id=p_group_id
    ) or exists (
      select 1 from public.submissions a join public.students s on s.id=a.student_id
      where s.group_id=p_group_id
    ) then
      raise exception 'group has activity' using errcode = 'PGL01';
    end if;
    delete from public.students where group_id=p_group_id;
    delete from public.groups where id=p_group_id;
  else
    update public.groups set status = case when p_action='archive' then 'archived' else 'active' end
    where id=p_group_id;
  end if;
end;
$$;
revoke all on function public.manage_group(uuid,text) from public, anon;
grant execute on function public.manage_group(uuid,text) to authenticated;

-- Protege también una pestaña que aún permita importar en un curso archivado.
create or replace function public.require_active_student_group()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  perform 1 from public.groups where id=new.group_id and status='active' for share;
  if not found then raise exception 'group is not active'; end if;
  return new;
end;
$$;
create trigger students_active_group_guard
before insert or update of group_id on public.students
for each row execute function public.require_active_student_group();
revoke all on function public.require_active_student_group() from public, anon, authenticated;

-- Serializa nuevas asignaciones con el archivo del curso.
create or replace function public.require_active_access_group()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  perform 1 from public.groups g join public.students s on s.group_id=g.id
  where s.id=new.student_id and g.status='active' for share of g;
  if not found then raise exception 'group is not active'; end if;
  return new;
end;
$$;
create trigger assessment_access_active_group_guard
before insert or update of student_id on public.assessment_access
for each row execute function public.require_active_access_group();
revoke all on function public.require_active_access_group() from public, anon, authenticated;
