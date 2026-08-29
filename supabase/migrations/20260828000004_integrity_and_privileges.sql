-- Correcciones de integridad y privilegios Data API.
-- Se genera como migración independiente porque el CLI de Supabase no está instalado
-- en este entorno.

-- La versión lite no reabre una entrega ya enviada. Una nueva oportunidad se crea
-- como una nueva evaluación para conservar el historial sin añadir una tabla de intentos.
alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('in_progress', 'submitted'));

alter table public.submissions
  drop column if exists reopened_at;

-- Congelar contenido y snapshot al abrir la evaluación, no solo después de la primera entrega.
create or replace function public.prevent_assessment_content_change_after_submission()
returns trigger
language plpgsql
as $$
declare
  has_submission boolean;
  is_frozen boolean;
begin
  select exists (
    select 1 from public.submissions where assessment_id = old.id
  ) into has_submission;

  is_frozen :=
    has_submission
    or old.status <> 'draft'
    or new.status <> 'draft'
    or old.opened_at is not null
    or new.opened_at is not null;

  if tg_op = 'DELETE' then
    if has_submission then
      raise exception 'assessment is immutable once a submission exists';
    end if;
    return old;
  end if;

  if is_frozen and (
    new.slug is distinct from old.slug
    or new.title is distinct from old.title
    or new.purpose is distinct from old.purpose
    or new.reading_text is distinct from old.reading_text
    or new.general_instructions is distinct from old.general_instructions
    or new.paste_policy is distinct from old.paste_policy
    or new.curriculum_version is distinct from old.curriculum_version
    or new.rubric_snapshot is distinct from old.rubric_snapshot
    or new.rubric_schema_version is distinct from old.rubric_schema_version
    or new.rubric_hash is distinct from old.rubric_hash
  ) then
    if old.status <> 'draft' or old.opened_at is not null or new.status <> 'draft' or new.opened_at is not null then
      raise exception 'assessment content is immutable once the assessment is open';
    end if;
    raise exception 'assessment content is immutable once a submission exists';
  end if;

  return new;
end;
$$;

drop trigger if exists assessments_content_guard on public.assessments;
create trigger assessments_content_guard
before update or delete on public.assessments
for each row execute function public.prevent_assessment_content_change_after_submission();

-- La salida de IA y sus metadatos de ejecución son una evidencia original.
-- La revisión docente solo puede cambiar teacher_adjustments, teacher_note,
-- reviewed_by, reviewed_at y el estado permitido por el flujo.
create or replace function public.prevent_ai_original_output_edit()
returns trigger
language plpgsql
as $$
begin
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
  ) then
    raise exception 'original AI output is immutable after evaluation completion';
  end if;

  return new;
end;
$$;

drop trigger if exists ai_evaluations_original_guard on public.ai_evaluations;
create trigger ai_evaluations_original_guard
before update on public.ai_evaluations
for each row execute function public.prevent_ai_original_output_edit();

-- La ventana se redondea al minuto para que la unicidad represente un bucket real.
alter table public.access_rate_limits
  alter column window_started_at set default date_trunc('minute', now());

alter table public.access_rate_limits
  add constraint access_rate_limits_minute_bucket
  check (window_started_at = date_trunc('minute', window_started_at));

-- La Data API requiere privilegios SQL explícitos además de RLS.
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.groups,
  public.students,
  public.assessments,
  public.questions,
  public.submissions,
  public.responses,
  public.ai_evaluations
to authenticated;

grant select on table
  public.assessment_access,
  public.student_sessions,
  public.access_rate_limits
to authenticated;

revoke execute on function public.is_teacher() from public;
grant execute on function public.is_teacher() to authenticated;
