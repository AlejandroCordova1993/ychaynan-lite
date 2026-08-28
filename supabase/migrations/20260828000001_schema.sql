-- Diez tablas del modelo de datos físico (guía técnica §12).
-- gen_random_uuid() es nativo desde PostgreSQL 13; no requiere pgcrypto.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_year text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_year, name)
);

-- Se permiten homónimos (guía §12.2): no hay restricción de unicidad sobre el nombre.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete restrict,
  full_name_original text not null check (char_length(full_name_original) <= 160),
  full_name_normalized text not null check (char_length(full_name_normalized) <= 160),
  authorized_variants text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_group_id_idx on public.students (group_id);
create index students_full_name_normalized_idx on public.students (full_name_normalized);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  purpose text not null,
  reading_text text not null,
  general_instructions text not null default '',
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'archived')),
  paste_policy text not null default 'discourage' check (paste_policy in ('allow', 'discourage')),
  curriculum_version text,
  rubric_snapshot jsonb not null,
  rubric_schema_version text not null,
  rubric_hash text not null,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Solo una evaluación puede estar abierta a la vez (guía §12.4 y §35).
create unique index only_one_open_assessment on public.assessments ((status)) where status = 'open';

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  position integer not null,
  prompt text not null,
  instructions text not null default '',
  suggested_min_words integer,
  suggested_max_words integer,
  active_criteria text[] not null default '{}',
  active_modules text[] not null default '{}',
  curriculum_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, position)
);

create table public.assessment_access (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  code_hash text not null,
  state text not null default 'unused' check (state in ('unused', 'active', 'submitted', 'blocked', 'revoked')),
  failed_attempts integer not null default 0,
  cooldown_until timestamptz,
  generated_at timestamptz not null default now(),
  first_used_at timestamptz,
  submitted_at timestamptz,
  unique (assessment_id, student_id)
);
create index assessment_access_code_hash_idx on public.assessment_access (code_hash);

create table public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_access_id uuid not null references public.assessment_access (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.access_rate_limits (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  client_fingerprint_hash text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  blocked_until timestamptz
);
create index access_rate_limits_lookup_idx on public.access_rate_limits (assessment_id, client_fingerprint_hash);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'reopened')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reopened_at timestamptz,
  client_submission_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id),
  unique (assessment_id, client_submission_key)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  original_text text not null,
  word_count integer not null default 0,
  content_hash text,
  draft_saved_at timestamptz,
  submitted_at timestamptz,
  unique (submission_id, question_id)
);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  rubric_schema_version text not null,
  rubric_hash text not null,
  prompt_version text not null,
  provider text not null,
  model text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'reviewed', 'discarded')),
  result_json jsonb,
  dimension_summary_json jsonb,
  confidence numeric,
  error_code text,
  error_message_safe text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  teacher_adjustments jsonb,
  teacher_note text,
  unique (submission_id, rubric_hash, prompt_version)
);

-- Invariantes de guía §13 que no se expresan como constraint de columna.

-- "No editar respuestas de una entrega submitted" / "el original queda inmutable al entregar".
create or replace function public.prevent_response_edit_after_submit()
returns trigger
language plpgsql
as $$
begin
  if old.submitted_at is not null and new.original_text is distinct from old.original_text then
    raise exception 'original_text is immutable once a response has been submitted';
  end if;
  return new;
end;
$$;

create trigger responses_immutable_after_submit
before update on public.responses
for each row execute function public.prevent_response_edit_after_submit();

-- "No cambiar lectura ni rúbrica después de la primera entrega".
create or replace function public.prevent_assessment_content_change_after_submission()
returns trigger
language plpgsql
as $$
declare
  has_submission boolean;
begin
  select exists (
    select 1 from public.submissions where assessment_id = old.id
  ) into has_submission;

  if has_submission and (
    new.reading_text is distinct from old.reading_text
    or new.rubric_snapshot is distinct from old.rubric_snapshot
  ) then
    raise exception 'reading_text and rubric_snapshot are immutable once a submission exists for this assessment';
  end if;

  return new;
end;
$$;

create trigger assessments_content_guard
before update on public.assessments
for each row execute function public.prevent_assessment_content_change_after_submission();

-- "No cambiar preguntas después de la primera entrega".
create or replace function public.prevent_question_change_after_submission()
returns trigger
language plpgsql
as $$
declare
  has_submission boolean;
begin
  select exists (
    select 1 from public.submissions where assessment_id = old.assessment_id
  ) into has_submission;

  if has_submission and (
    new.prompt is distinct from old.prompt
    or new.instructions is distinct from old.instructions
  ) then
    raise exception 'prompt and instructions are immutable once a submission exists for this assessment';
  end if;

  return new;
end;
$$;

create trigger questions_content_guard
before update on public.questions
for each row execute function public.prevent_question_change_after_submission();

-- "No convertir una evaluación failed en reviewed".
create or replace function public.prevent_failed_to_reviewed()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'failed' and new.status = 'reviewed' then
    raise exception 'a failed ai_evaluation cannot transition directly to reviewed';
  end if;
  return new;
end;
$$;

create trigger ai_evaluations_status_guard
before update on public.ai_evaluations
for each row execute function public.prevent_failed_to_reviewed();

-- "No aprobar una evaluación de IA sin usuario docente autenticado" (reviewed_by obligatorio).
create or replace function public.require_reviewer_on_review()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'reviewed' and new.reviewed_by is null then
    raise exception 'reviewed_by is required when status is reviewed';
  end if;
  return new;
end;
$$;

create trigger ai_evaluations_reviewer_guard
before insert or update on public.ai_evaluations
for each row execute function public.require_reviewer_on_review();

-- Notas sobre invariantes que NO se implementan aquí:
-- "No entregar una evaluación que no esté abierta" y "no entregar después de closes_at"
-- dependen de comparar contra la hora actual y el estado de otra tabla en el momento
-- de la escritura; se aplican en la función Edge submit-assessment (Fase 2), no aquí.
-- "No eliminar un estudiante con entrega" ya queda cubierto por
-- "references public.students (id) on delete restrict" en submissions.
-- "No eliminar físicamente una rúbrica utilizada" no aplica: no existe tabla de rúbricas,
-- la rúbrica se congela como rubric_snapshot dentro de assessments.
