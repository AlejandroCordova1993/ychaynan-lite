-- Defensa de la ventana de entrega y de los privilegios por defecto de funciones.

-- PUBLIC recibe EXECUTE sobre funciones nuevas en PostgreSQL si no se revoca
-- explícitamente. El cliente no debe poder invocar futuras funciones RPC por
-- herencia accidental de privilegios.
alter default privileges in schema public revoke all on functions from public;
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
revoke all on all functions in schema public from authenticated;

-- Las funciones de trigger no se invocan desde el cliente. La única función
-- auxiliar expuesta por el esquema actual sigue siendo la comprobación de rol.
grant execute on function public.is_teacher() to authenticated;

create or replace function public.guard_submission_window()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  assessment_status text;
  assessment_opens_at timestamptz;
  assessment_closes_at timestamptz;
begin
  -- Los borradores pueden existir antes de la entrega. La transición final a
  -- submitted es la operación que debe quedar dentro de la ventana.
  if new.status <> 'submitted'
     or (tg_op = 'UPDATE' and old.status is not distinct from new.status) then
    return new;
  end if;

  select status, opens_at, closes_at
    into assessment_status, assessment_opens_at, assessment_closes_at
    from public.assessments
   where id = new.assessment_id
   for share;

  if assessment_status is distinct from 'open' then
    raise exception 'assessment must be open to receive a submission';
  end if;

  if assessment_opens_at is not null and now() < assessment_opens_at then
    raise exception 'assessment window has not opened';
  end if;

  if assessment_closes_at is not null and now() >= assessment_closes_at then
    raise exception 'assessment window is closed';
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_window_guard on public.submissions;
create trigger submissions_window_guard
before insert or update on public.submissions
for each row execute function public.guard_submission_window();

-- La revocación anterior cubre las funciones existentes. Esta función se crea
-- después, por lo que se revoca explícitamente también en el mismo paso.
revoke all on function public.guard_submission_window() from public;
revoke all on function public.guard_submission_window() from anon;
revoke all on function public.guard_submission_window() from authenticated;
