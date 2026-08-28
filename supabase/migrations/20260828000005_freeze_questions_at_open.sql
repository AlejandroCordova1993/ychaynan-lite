-- Congela las preguntas desde que la evaluación se abre, no solo desde la primera
-- entrega, para ser consistente con el mismo estándar que ya aplica a assessments
-- (migración 20260828000004_integrity_and_privileges.sql).

create or replace function public.prevent_question_change_after_submission()
returns trigger
language plpgsql
as $$
declare
  is_frozen boolean;
begin
  if tg_op = 'DELETE' then
    select
      exists (select 1 from public.submissions where assessment_id = old.assessment_id)
      or exists (
        select 1 from public.assessments
         where id = old.assessment_id and (status <> 'draft' or opened_at is not null)
      )
    into is_frozen;

    if is_frozen then
      raise exception 'question is immutable once the assessment is open';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    select
      exists (select 1 from public.submissions where assessment_id = new.assessment_id)
      or exists (
        select 1 from public.assessments
         where id = new.assessment_id and (status <> 'draft' or opened_at is not null)
      )
    into is_frozen;

    if is_frozen then
      raise exception 'question is immutable once the assessment is open';
    end if;
    return new;
  end if;

  select
    exists (
      select 1 from public.submissions
       where assessment_id in (old.assessment_id, new.assessment_id)
    )
    or exists (
      select 1 from public.assessments
       where id in (old.assessment_id, new.assessment_id)
         and (status <> 'draft' or opened_at is not null)
    )
  into is_frozen;

  if is_frozen and (
    new.assessment_id is distinct from old.assessment_id
    or new.position is distinct from old.position
    or new.prompt is distinct from old.prompt
    or new.instructions is distinct from old.instructions
    or new.suggested_min_words is distinct from old.suggested_min_words
    or new.suggested_max_words is distinct from old.suggested_max_words
    or new.active_criteria is distinct from old.active_criteria
    or new.active_modules is distinct from old.active_modules
    or new.allowed_observation_codes is distinct from old.allowed_observation_codes
    or new.curriculum_links is distinct from old.curriculum_links
  ) then
    raise exception 'question is immutable once the assessment is open';
  end if;

  return new;
end;
$$;

drop trigger if exists questions_content_guard on public.questions;
create trigger questions_content_guard
before insert or update or delete on public.questions
for each row execute function public.prevent_question_change_after_submission();
