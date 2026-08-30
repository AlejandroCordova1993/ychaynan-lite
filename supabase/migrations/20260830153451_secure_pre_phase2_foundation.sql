alter table public.submissions
  add column draft_version integer not null default 0
  constraint submissions_draft_version_non_negative
  check (draft_version >= 0);

create index if not exists assessment_access_student_id_idx
  on public.assessment_access (student_id);
create index if not exists student_sessions_assessment_access_id_idx
  on public.student_sessions (assessment_access_id);
create index if not exists submissions_student_id_idx
  on public.submissions (student_id);
create index if not exists responses_question_id_idx
  on public.responses (question_id);

alter function public.is_teacher() set search_path to pg_catalog, public;
alter function public.prevent_response_edit_after_submit() set search_path to pg_catalog, public;
alter function public.prevent_assessment_content_change_after_submission() set search_path to pg_catalog, public;
alter function public.prevent_question_change_after_submission() set search_path to pg_catalog, public;
alter function public.prevent_failed_to_reviewed() set search_path to pg_catalog, public;
alter function public.require_reviewer_on_review() set search_path to pg_catalog, public;
alter function public.validate_response_question_assessment() set search_path to pg_catalog, public;
alter function public.prevent_ai_original_output_edit() set search_path to pg_catalog, public;
alter function public.set_updated_at() set search_path to pg_catalog, public;
alter function public.guard_submission_window() set search_path to pg_catalog, public;
