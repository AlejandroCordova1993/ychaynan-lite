create or replace function public.get_student_assessment(p_token_hash text, p_client_submission_key text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_context record;
  v_questions jsonb;
  v_responses jsonb;
begin
  select sub.id as submission_id, sub.draft_version, a.id as assessment_id, a.slug, a.title, a.reading_text, a.general_instructions, a.paste_policy, a.closes_at into v_context
    from public.student_sessions ss
    join public.assessment_access aa on aa.id = ss.assessment_access_id
    join public.assessments a on a.id = aa.assessment_id
    join public.submissions sub on sub.assessment_id = a.id and sub.student_id = aa.student_id
   where ss.token_hash = p_token_hash and ss.revoked_at is null and ss.expires_at > pg_catalog.now()
     and sub.client_submission_key = p_client_submission_key and sub.status = 'in_progress'
     and a.status = 'open' and (a.closes_at is null or a.closes_at > pg_catalog.now());
  if not found then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid session'); end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', q.id, 'position', q.position, 'prompt', q.prompt, 'instructions', q.instructions,
    'suggestedMinWords', q.suggested_min_words, 'suggestedMaxWords', q.suggested_max_words
  ) order by q.position), '[]'::jsonb) into v_questions
  from public.questions q where q.assessment_id = v_context.assessment_id;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'questionId', r.question_id, 'text', r.original_text
  )), '[]'::jsonb) into v_responses
  from public.responses r where r.submission_id = v_context.submission_id;

  update public.student_sessions set last_seen_at = pg_catalog.now() where token_hash = p_token_hash;
  return pg_catalog.jsonb_build_object('ok', true, 'assessment', pg_catalog.jsonb_build_object(
    'slug', v_context.slug, 'title', v_context.title, 'readingText', v_context.reading_text,
    'generalInstructions', v_context.general_instructions, 'pastePolicy', v_context.paste_policy,
    'closesAt', v_context.closes_at, 'questions', v_questions
  ), 'responses', v_responses, 'draftVersion', v_context.draft_version);
end;
$$;

create or replace function public.save_student_draft(
  p_token_hash text, p_client_submission_key text, p_expected_version integer, p_responses jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.submissions%rowtype;
  v_item jsonb;
  v_current jsonb;
begin
  select sub.* into v_submission
    from public.student_sessions ss
    join public.assessment_access aa on aa.id = ss.assessment_access_id
    join public.assessments a on a.id = aa.assessment_id
    join public.submissions sub on sub.assessment_id = a.id and sub.student_id = aa.student_id
   where ss.token_hash = p_token_hash and ss.revoked_at is null and ss.expires_at > pg_catalog.now()
     and sub.client_submission_key = p_client_submission_key and sub.status = 'in_progress'
     and a.status = 'open' and (a.closes_at is null or a.closes_at > pg_catalog.now())
   for update of sub;
  if not found then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid session'); end if;

  if v_submission.draft_version <> p_expected_version then
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('questionId',question_id,'text',original_text)), '[]'::jsonb)
      into v_current from public.responses where submission_id = v_submission.id;
    return pg_catalog.jsonb_build_object('ok', false, 'conflict', true, 'draftVersion', v_submission.draft_version, 'responses', v_current);
  end if;
  if pg_catalog.jsonb_typeof(p_responses) <> 'array' then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses');
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_responses) item
    where not exists (select 1 from public.questions q where q.id = (item->>'questionId')::uuid and q.assessment_id = v_submission.assessment_id)
  ) then return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid responses'); end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_responses) loop
    insert into public.responses (submission_id, question_id, original_text, word_count, draft_saved_at)
    values (v_submission.id, (v_item->>'questionId')::uuid, v_item->>'text',
      case when pg_catalog.btrim(v_item->>'text') = '' then 0 else pg_catalog.cardinality(pg_catalog.regexp_split_to_array(pg_catalog.btrim(v_item->>'text'), '\s+')) end,
      pg_catalog.now())
    on conflict (submission_id, question_id) do update set
      original_text = excluded.original_text, word_count = excluded.word_count, draft_saved_at = excluded.draft_saved_at;
  end loop;

  delete from public.responses r where r.submission_id = v_submission.id
    and not exists (select 1 from pg_catalog.jsonb_array_elements(p_responses) item where (item->>'questionId')::uuid = r.question_id);
  update public.submissions set draft_version = draft_version + 1, updated_at = pg_catalog.now()
   where id = v_submission.id returning * into v_submission;
  update public.student_sessions set last_seen_at = pg_catalog.now() where token_hash = p_token_hash;
  return pg_catalog.jsonb_build_object('ok', true, 'draftVersion', v_submission.draft_version);
end;
$$;

revoke all on function public.get_student_assessment(text,text) from public, anon, authenticated;
grant execute on function public.get_student_assessment(text,text) to service_role;
revoke all on function public.save_student_draft(text,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.save_student_draft(text,text,integer,jsonb) to service_role;




