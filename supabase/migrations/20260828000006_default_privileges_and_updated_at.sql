-- Corrige dos vacios detectados en la revision final del branch:
-- 1) los privilegios explicitos de la migracion 4 solo cubrian las tablas existentes
--    en ese momento; una tabla nueva de una fase futura volveria a heredar los
--    privilegios por defecto de un proyecto Supabase (grant a anon/authenticated).
-- 2) updated_at se declaraba en el esquema pero nada lo mantenia al dia.

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on sequences from authenticated;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on functions from authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

drop trigger if exists ai_evaluations_set_updated_at on public.ai_evaluations;
create trigger ai_evaluations_set_updated_at
before update on public.ai_evaluations
for each row execute function public.set_updated_at();
