-- Datos ficticios para ensayo (guía §29): tildes, ñ, nombres compuestos y homónimos
-- entre dos paralelos distintos. Nunca usar en un proyecto con datos reales.

insert into public.groups (id, name, school_year, status) values
  ('00000000-0000-0000-0000-000000000001', '3ro BGU A (ficticio)', '2026-2027', 'active'),
  ('00000000-0000-0000-0000-000000000002', '3ro BGU B (ficticio)', '2026-2027', 'active');

insert into public.students (group_id, full_name_original, full_name_normalized, authorized_variants, status) values
  ('00000000-0000-0000-0000-000000000001', 'María José Peña Ñacato', 'maria jose peña ñacato', '{}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'José Andrés Muñoz', 'jose andres muñoz', '{}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Ana Ruiz', 'ana ruiz', '{}', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Ana Ruiz', 'ana ruiz', '{}', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Maria Fernanda De la Cruz', 'maria fernanda de la cruz', array['maria fernanda de-la-cruz'], 'active');
