alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.assessment_access enable row level security;
alter table public.student_sessions enable row level security;
alter table public.access_rate_limits enable row level security;
alter table public.submissions enable row level security;
alter table public.responses enable row level security;
alter table public.ai_evaluations enable row level security;

-- El rol docente se representa mediante app_metadata administrado por Supabase.
-- Los metadatos de la aplicación no pueden ser modificados por el usuario desde el cliente.
create or replace function public.is_teacher()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false);
$$;

create policy "teacher full access" on public.groups
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.students
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.assessments
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.questions
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.submissions
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.responses
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "teacher full access" on public.ai_evaluations
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Estas tres tablas las escriben únicamente las Edge Functions con la service role
-- (que ignora RLS por diseño de Supabase); el docente solo necesita lectura.
create policy "teacher read access" on public.assessment_access
  for select to authenticated using (public.is_teacher());
create policy "teacher read access" on public.student_sessions
  for select to authenticated using (public.is_teacher());
create policy "teacher read access" on public.access_rate_limits
  for select to authenticated using (public.is_teacher());

-- No se crea ninguna política para "anon": con RLS activo y sin política que lo permita,
-- el rol anon queda sin acceso de lectura ni escritura por defecto (comportamiento
-- estándar de PostgreSQL, verificado en la prueba de integración de este mismo task).
