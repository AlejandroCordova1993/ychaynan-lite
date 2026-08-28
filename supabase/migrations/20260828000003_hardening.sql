-- Endurecimiento de invariantes detectadas durante la revisión del MVP.

alter table public.questions
  add column allowed_observation_codes text[] not null default '{}';

alter table public.assessment_access
  add constraint assessment_access_assessment_code_hash_key
  unique (assessment_id, code_hash);

alter table public.access_rate_limits
  add constraint access_rate_limits_assessment_fingerprint_window_key
  unique (assessment_id, client_fingerprint_hash, window_started_at);

alter table public.ai_evaluations
  add constraint ai_evaluations_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users (id);

alter table public.assessments
  add constraint assessments_valid_schedule
  check (opens_at is null or closes_at is null or opens_at < closes_at);

alter table public.questions
  add constraint questions_positive_position
  check (position > 0);

alter table public.questions
  add constraint questions_valid_word_range
  check (
    (suggested_min_words is null or suggested_min_words >= 0)
    and (suggested_max_words is null or suggested_max_words >= 0)
    and (
      suggested_min_words is null
      or suggested_max_words is null
      or suggested_min_words <= suggested_max_words
    )
  );

alter table public.responses
  add constraint responses_non_negative_word_count
  check (word_count >= 0);

alter table public.ai_evaluations
  add constraint ai_evaluations_confidence_range
  check (confidence is null or (confidence >= 0 and confidence <= 1));

create or replace function public.prevent_response_edit_after_submit()
returns trigger
language plpgsql
as $$
declare
  submission_status text;
begin
  select status
    into submission_status
    from public.submissions
   where id = case when tg_op = 'DELETE' then old.submission_id else new.submission_id end;

  if tg_op = 'DELETE' then
    if old.submitted_at is not null or submission_status = 'submitted' then
      raise exception 'response is immutable once submitted';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if submission_status = 'submitted' then
      raise exception 'cannot add a response to a submitted submission';
    end if;
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

drop trigger if exists responses_immutable_after_submit on public.responses;
create trigger responses_immutable_after_submit
before insert or update or delete on public.responses
for each row execute function public.prevent_response_edit_after_submit();

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

  if tg_op = 'DELETE' then
    if has_submission then
      raise exception 'assessment is immutable once a submission exists';
    end if;
    return old;
  end if;

  if has_submission and (
    new.purpose is distinct from old.purpose
    or new.reading_text is distinct from old.reading_text
    or new.general_instructions is distinct from old.general_instructions
    or new.rubric_snapshot is distinct from old.rubric_snapshot
    or new.rubric_schema_version is distinct from old.rubric_schema_version
    or new.rubric_hash is distinct from old.rubric_hash
    or new.curriculum_version is distinct from old.curriculum_version
  ) then
    raise exception 'assessment content is immutable once a submission exists';
  end if;

  return new;
end;
$$;

drop trigger if exists assessments_content_guard on public.assessments;
create trigger assessments_content_guard
before update or delete on public.assessments
for each row execute function public.prevent_assessment_content_change_after_submission();

create or replace function public.prevent_question_change_after_submission()
returns trigger
language plpgsql
as $$
declare
  has_submission boolean;
begin
  if tg_op = 'DELETE' then
    select exists (
      select 1 from public.submissions where assessment_id = old.assessment_id
    ) into has_submission;

    if has_submission then
      raise exception 'question is immutable once a submission exists';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    select exists (
      select 1 from public.submissions where assessment_id = new.assessment_id
    ) into has_submission;

    if has_submission then
      raise exception 'question is immutable once a submission exists';
    end if;
    return new;
  end if;

  select exists (
    select 1
      from public.submissions
     where assessment_id in (old.assessment_id, new.assessment_id)
  ) into has_submission;

  if has_submission and (
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
    raise exception 'question content is immutable once a submission exists';
  end if;

  return new;
end;
$$;

drop trigger if exists questions_content_guard on public.questions;
create trigger questions_content_guard
before insert or update or delete on public.questions
for each row execute function public.prevent_question_change_after_submission();

create or replace function public.validate_response_question_assessment()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
      from public.submissions s
      join public.questions q on q.id = new.question_id
     where s.id = new.submission_id
       and s.assessment_id = q.assessment_id
  ) then
    raise exception 'submission and question must belong to the same assessment';
  end if;

  return new;
end;
$$;

drop trigger if exists responses_assessment_match_guard on public.responses;
create trigger responses_assessment_match_guard
before insert or update on public.responses
for each row execute function public.validate_response_question_assessment();

create or replace function public.require_reviewer_on_review()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'reviewed' then
    if new.reviewed_by is null then
      raise exception 'reviewed_by is required when status is reviewed';
    end if;

    if auth.uid() is null or new.reviewed_by is distinct from auth.uid() then
      raise exception 'reviewed_by must match the authenticated user';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ai_evaluations_reviewer_guard on public.ai_evaluations;
create trigger ai_evaluations_reviewer_guard
before insert or update on public.ai_evaluations
for each row execute function public.require_reviewer_on_review();
