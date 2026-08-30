# Fase 0 + Fase 1: scaffold y base segura — spec de alcance

**Fecha:** 28 de agosto de 2026
**Tipo:** recorte arquitectónico dentro de un proyecto mayor
**Documentos fuente (autoridad completa, no se duplican aquí):**
- `../../../DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` v1.3
- `../../../GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` v1.1
- `../../../RUBRICA_DIAGNOSTICA_COMPLETA.md` v1.1

## Por qué este documento existe

El diseño completo de Ychayñan Lite ya está aprobado por el docente responsable en los tres documentos fuente. Este spec no reabre ninguna decisión de arquitectura, pedagogía o datos ya tomada allí. Su único trabajo es acotar el primer recorte de implementación (Fase 0 y Fase 1 de `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` §34) y fijar las decisiones de detalle que la guía deja abiertas a criterio del programador.

## Restricción de entorno que determina el alcance

Este entorno de desarrollo no tiene Docker, por lo que `supabase start` (el stack local completo de Supabase) no puede ejecutarse aquí, y no existe todavía un proyecto Supabase real ni un repositorio GitHub remoto (decisión del docente: construir todo localmente primero). Sin embargo, `@electric-sql/pglite` (Postgres real compilado a WebAssembly, sin Docker) sí está disponible y soporta lo que este recorte necesita: `gen_random_uuid()`, índices únicos parciales, funciones y triggers PL/pgSQL, roles y Row Level Security con `to authenticated`/`to anon`. Esto se comprobó de forma directa antes de escribir el plan. En consecuencia:

- **Dentro de alcance:** estructura del repositorio; migraciones SQL de las 10 tablas, invariantes y RLS, **aplicadas y verificadas contra Postgres real vía PGlite** en una prueba de integración (no contra un mock); módulos puros de dominio (normalización de nombres, importador de nómina); capa de API contra un cliente Supabase simulado (mock, porque `@supabase/supabase-js` sí necesita una API HTTP real, algo que PGlite no expone); esqueleto de rutas y autenticación; un flujo de UI de importación de nómina que no requiere backend vivo para probarse.
- **Sigue fuera de alcance de este recorte:** funciones Edge (necesitan el runtime de Supabase, no solo Postgres), pantallas de creación de evaluación, generación de códigos, sesión estudiantil, IA, dashboard, exportación, y el despliegue real contra un proyecto Supabase con GitHub Pages. Nada de esto se construye todavía.

PGlite no sustituye una verificación final contra un proyecto Supabase real (Supabase añade su propio esquema `auth`, extensiones y configuración de roles que este recorte simula de forma mínima solo para probar las políticas). Esa verificación final queda pendiente para cuando exista un proyecto Supabase real, tal como exige la guía técnica antes de desplegar (§35).

## Alcance de este recorte

1. Estructura de repositorio y herramientas — `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` §5–§6, §27.
2. Flujos de CI (`verify.yml`, `deploy-pages.yml`) — §25, §34 Fase 0.
3. Modelo de datos físico completo como migraciones SQL — §12.
4. Invariantes y RLS — §13, §14.
5. Normalización de nombres — §10 del documento maestro y §10 de la guía técnica.
6. Importador de nómina CSV con detección de codificación y vista previa — maestro §5.1 punto 3 ("Importar una nómina desde CSV, revisar su codificación y confirmar una vista previa").
7. Cliente Supabase, contexto de autenticación docente y enrutador (`HashRouter`) con las rutas de §7, sin lógica de negocio todavía.
8. Capa de API docente para `groups` y `students` (§12.1–12.2), probada con un cliente Supabase simulado.
9. Componente de UI para importar nómina (subir CSV, ver vista previa, confirmar) que ejercita los módulos 5–6 sin depender de una base de datos viva.

## Decisiones de detalle no explícitas en la guía (registradas aquí, no contradicen la guía)

| Decisión | Elección | Motivo |
|---|---|---|
| Parser CSV | Biblioteca `papaparse` | La guía prohíbe dependencias sin necesidad concreta, pero un parser CSV manual no maneja de forma confiable comillas, comas internas ni saltos de línea incrustados; `papaparse` es la elección estándar, pequeña y sin dependencias propias. |
| Detección de codificación | Heurística sin dependencia: decodificar con `TextDecoder('utf-8', {fatal: true})`; si lanza error, decodificar con `TextDecoder('windows-1252')` | Cubre el caso real señalado en la revisión previa (Excel en Windows exporta CSV en Windows-1252 sin BOM, lo que rompe `ñ` y tildes). No requiere biblioteca adicional. |
| Verificación de migraciones | Se escriben con el formato exacto que espera `supabase db push` (numeradas por timestamp) y además se ejecutan de extremo a extremo contra PGlite en una prueba de integración de Vitest, incluyendo un esquema `auth` mínimo y los roles `anon`/`authenticated` | PGlite permite probar constraints, triggers y RLS con Postgres real sin Docker; queda pendiente solo la verificación final contra un proyecto Supabase real, que añade su propio esquema `auth` completo. |
| Alcance de UI | Solo la pantalla de importación de nómina; no se construyen pantallas de paralelos, evaluación ni docente-inicio todavía | Es la única pantalla de Fase 1 que se puede probar de extremo a extremo sin backend vivo (el CSV se procesa en el navegador antes de cualquier llamada a Supabase). |

## Fuera de alcance explícito (recordatorio, no nuevo)

Todo lo listado en `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` §5.2 y `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` §4 sigue excluido. Este recorte no introduce ninguna función nueva; solo construye el cimiento técnico.

## Criterio de aceptación de este recorte

- `npm run verify` (lint + typecheck + test + build) pasa en local.
- La normalización de nombres reproduce exactamente los cuatro ejemplos de la guía técnica §10 y conserva `ñ` distinta de `n`.
- El importador de nómina decodifica correctamente un CSV de prueba guardado en Windows-1252 con `ñ` y tildes, y otro en UTF-8 con BOM.
- Las migraciones SQL cubren las 10 tablas de §12 y las invariantes de §13 como restricciones de base de datos, no solo como reglas de interfaz, y una prueba de integración contra PGlite lo demuestra ejecutando cada invariante.
- Una prueba de integración contra PGlite demuestra que el rol `anon` no puede leer ni escribir en las tablas listadas en §14.1, que una sesión `authenticated` sin el claim docente tampoco puede, y que `authenticated` con `app_metadata.role = teacher` sí puede.
- `npm run dev` levanta la aplicación sin error con variables de entorno de ejemplo (sin necesidad de un proyecto Supabase real).
