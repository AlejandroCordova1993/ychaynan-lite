create or replace function public.save_assessment_draft(
  p_assessment jsonb,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_assessment_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
begin
  if not public.is_teacher() then
    raise exception 'teacher role required';
  end if;

  if jsonb_typeof(p_assessment) is distinct from 'object' then
    raise exception 'assessment must be a JSON object';
  end if;

  if jsonb_typeof(p_questions) is distinct from 'array'
     or jsonb_array_length(p_questions) not between 1 and 4 then
    raise exception 'assessment must contain between 1 and 4 questions';
  end if;

  if nullif(pg_catalog.btrim(p_assessment ->> 'title'), '') is null
     or nullif(pg_catalog.btrim(p_assessment ->> 'purpose'), '') is null
     or nullif(pg_catalog.btrim(p_assessment ->> 'reading_text'), '') is null then
    raise exception 'title, purpose and reading_text are required';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_questions) with ordinality as question(value, position)
     where jsonb_typeof(question.value) is distinct from 'object'
        or nullif(question.value ->> 'position', '') is null
        or (question.value ->> 'position')::integer <> question.position
  ) then
    raise exception 'question positions must be consecutive from 1';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_questions) as question(value)
     where nullif(pg_catalog.btrim(question.value ->> 'prompt'), '') is null
        or jsonb_typeof(coalesce(question.value -> 'active_criteria', '[]'::jsonb))
           is distinct from 'array'
        or jsonb_array_length(
             coalesce(question.value -> 'active_criteria', '[]'::jsonb)
           ) = 0
  ) then
    raise exception 'each question requires a prompt and at least one active criterion';
  end if;

  v_opens_at := nullif(p_assessment ->> 'opens_at', '')::timestamptz;
  v_closes_at := nullif(p_assessment ->> 'closes_at', '')::timestamptz;
  if v_opens_at is not null and v_closes_at is not null and v_closes_at <= v_opens_at then
    raise exception 'closes_at must be after opens_at';
  end if;

  v_assessment_id := nullif(p_assessment ->> 'id', '')::uuid;

  if v_assessment_id is null then
    v_assessment_id := gen_random_uuid();
    insert into public.assessments (
      id, slug, title, purpose, reading_text, general_instructions, opens_at, closes_at,
      paste_policy, curriculum_version, rubric_snapshot, rubric_schema_version, rubric_hash
    ) values (
      v_assessment_id,
      'evaluacion-' || pg_catalog.substr(v_assessment_id::text, 1, 8),
      pg_catalog.btrim(p_assessment ->> 'title'),
      pg_catalog.btrim(p_assessment ->> 'purpose'),
      pg_catalog.btrim(p_assessment ->> 'reading_text'),
      coalesce(p_assessment ->> 'general_instructions', ''),
      v_opens_at,
      v_closes_at,
      coalesce(nullif(p_assessment ->> 'paste_policy', ''), 'discourage'),
      nullif(p_assessment ->> 'curriculum_version', ''),
      p_assessment -> 'rubric_snapshot',
      p_assessment ->> 'rubric_schema_version',
      p_assessment ->> 'rubric_hash'
    );
  else
    update public.assessments
       set title = pg_catalog.btrim(p_assessment ->> 'title'),
           purpose = pg_catalog.btrim(p_assessment ->> 'purpose'),
           reading_text = pg_catalog.btrim(p_assessment ->> 'reading_text'),
           general_instructions = coalesce(p_assessment ->> 'general_instructions', ''),
           opens_at = v_opens_at,
           closes_at = v_closes_at,
           paste_policy = coalesce(nullif(p_assessment ->> 'paste_policy', ''), 'discourage'),
           curriculum_version = nullif(p_assessment ->> 'curriculum_version', ''),
           rubric_snapshot = p_assessment -> 'rubric_snapshot',
           rubric_schema_version = p_assessment ->> 'rubric_schema_version',
           rubric_hash = p_assessment ->> 'rubric_hash'
     where id = v_assessment_id
       and status = 'draft';

    if not found then
      raise exception 'draft assessment not found or no longer editable';
    end if;

    delete from public.questions where assessment_id = v_assessment_id;
  end if;

  for v_question in
    select value from jsonb_array_elements(p_questions) with ordinality order by ordinality
  loop
    v_question_id := coalesce(nullif(v_question ->> 'id', '')::uuid, gen_random_uuid());

    insert into public.questions (
      id, assessment_id, position, prompt, instructions, suggested_min_words,
      suggested_max_words, active_criteria, active_modules, curriculum_links
    ) values (
      v_question_id,
      v_assessment_id,
      (v_question ->> 'position')::integer,
      pg_catalog.btrim(v_question ->> 'prompt'),
      coalesce(v_question ->> 'instructions', ''),
      nullif(v_question ->> 'suggested_min_words', '')::integer,
      nullif(v_question ->> 'suggested_max_words', '')::integer,
      array(
        select jsonb_array_elements_text(
          coalesce(v_question -> 'active_criteria', '[]'::jsonb)
        )
      ),
      array(
        select jsonb_array_elements_text(
          coalesce(v_question -> 'active_modules', '[]'::jsonb)
        )
      ),
      coalesce(v_question -> 'curriculum_links', '{}'::jsonb)
    );
  end loop;

  return v_assessment_id;
end;
$$;

revoke all on function public.save_assessment_draft(jsonb, jsonb) from public;
revoke all on function public.save_assessment_draft(jsonb, jsonb) from anon;
grant execute on function public.save_assessment_draft(jsonb, jsonb) to authenticated;
