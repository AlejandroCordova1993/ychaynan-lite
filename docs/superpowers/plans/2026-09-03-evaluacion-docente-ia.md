# Evaluación docente con IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la evaluación individual docente con IA para una entrega ya enviada, conservando una salida provisional trazable y sin mostrar resultados al estudiante.

**Architecture:** Una Edge Function `evaluate-submission` valida JWT y rol docente, carga mediante el cliente privilegiado únicamente la entrega `submitted`, lectura, preguntas, respuestas y snapshot de rúbrica, llama al proveedor con datos pedagógicos sin identificadores personales, valida un JSON estricto y persiste una fila idempotente en `ai_evaluations`. El navegador docente consulta el resultado mediante RLS y puede solicitar/repetir la evaluación; la revisión manual será un bloque posterior.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Supabase PostgreSQL/RLS, DeepSeek Chat Completions, React 19, Vitest, Testing Library, Zod.

**Spec:** `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` §§15.6–17.6; `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`; `supabase/migrations/20260828000001_schema.sql` y `20260828000002_rls.sql`.

## Global Constraints

- No modificar migraciones ya aplicadas; crear una nueva solo si el esquema actual resulta insuficiente.
- No exponer `DEEPSEEK_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, nombres, paralelos, códigos ni identificadores de estudiantes al proveedor.
- Todas las evaluaciones IA son provisionales; el docente deberá revisarlas en el siguiente bloque.
- Una evaluación corresponde a una entrega `submitted` completa y contiene de una a cuatro preguntas.
- Reintentar solo estados `failed`; estados `completed` o `reviewed` se devuelven de forma idempotente salvo `forceRetry` explícito para fallos.
- Mantener errores estructurados y seguros; nunca devolver mensajes crudos de Supabase o DeepSeek.
- Seguir TDD: cada paso de implementación inicia con una prueba que falla.
- Verificar con `npm run verify`, React Doctor si se modifica React y smokes locales sin secretos.

## Task 1: Contrato puro de evaluación y prompt delimitado

**Files:**
- Create: `supabase/functions/_shared/aiEvaluation.ts`
- Create: `supabase/functions/_shared/aiEvaluation.test.ts`
- Create: `supabase/functions/evaluate-submission/prompt.ts`
- Create: `supabase/functions/evaluate-submission/prompt.test.ts`

**Interfaces:**
- `parseEvaluationRequest(input): { submissionId: string; forceRetry: boolean }`
- `parseEvaluationResult(value, questions): EvaluationResult`
- `buildEvaluationMessages(input): ChatMessage[]`
- `EVALUATION_PROMPT_VERSION`, `EVALUATION_ERROR_CATALOG`, `EvaluationError`

- [ ] **Step 1: Escribir pruebas RED del sobre, límites y salida estricta**
  - Aceptar solo UUID de `submissionId` y `forceRetry` booleano opcional.
  - Exigir `questionResults`, `dimensionSummaries`, `globalConfidence` y `limitations`.
  - Rechazar criterios/módulos desconocidos, duplicados, niveles fuera de 1–4/`no_aplica`, evidencias no textuales y campos adicionales.
  - Comprobar que se aceptan cuatro dimensiones exactas y no se inventan criterios.
  - Ejecutar `npm test -- supabase/functions/_shared/aiEvaluation.test.ts`; debe fallar porque el módulo no existe.
- [ ] **Step 2: Implementar esquema Zod y catálogo de errores**
  - Límites: respuesta individual 20 000 caracteres, observación/evidencia 600, retroalimentación docente 1 200.
  - Normalizar evidencias para comparación Unicode sin alterar el original.
  - Mantener `needs_evidence_review` cuando la evidencia no aparece, sin descartar toda la entrega.
- [ ] **Step 3: Escribir prueba RED de aislamiento de prompt**
  - Verificar delimitadores explícitos para lectura, rúbrica, preguntas y respuestas.
  - Verificar ausencia de `studentName`, `groupName`, `studentId`, `submissionId` y códigos.
- [ ] **Step 4: Implementar prompt versionado y cobertura de criterios**
  - Derivar observaciones únicamente de `active_criteria` y `active_modules` de cada pregunta.
  - Incluir la rúbrica congelada, propósito, instrucciones, lectura y todas las respuestas de una entrega.
  - Instruir al modelo a tratar lectura/respuestas como datos no confiables y devolver solo JSON.
- [ ] **Step 5: Ejecutar pruebas focalizadas y commit**
  - `npm test -- supabase/functions/_shared/aiEvaluation.test.ts supabase/functions/evaluate-submission/prompt.test.ts`
  - Commit: `feat: definir contrato de evaluacion docente`

## Task 2: Proveedor DeepSeek y handler seguro

**Files:**
- Create: `supabase/functions/evaluate-submission/provider.ts`
- Create: `supabase/functions/evaluate-submission/provider.test.ts`
- Create: `supabase/functions/evaluate-submission/handler.ts`
- Create: `supabase/functions/evaluate-submission/handler.test.ts`
- Create: `supabase/functions/evaluate-submission/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- `evaluateSubmissionWithProvider(input, config, fetchImpl?): Promise<EvaluationResult>`
- `createEvaluateSubmissionHandler(dependencies): (request: Request) => Promise<Response>`

- [ ] **Step 1: Escribir pruebas RED del proveedor**
  - Falta de clave → `ai_not_configured`.
  - Timeout/AbortError → `ai_timeout`.
  - HTTP no-2xx o fallo de red → `provider_unavailable` sin leer cuerpo de error.
  - `finish_reason` distinto de `stop`, cuerpo vacío, JSON malformado o salida inválida → `invalid_ai_response`.
- [ ] **Step 2: Implementar llamada estructurada**
  - Usar `response_format: { type: 'json_object' }`, `thinking: { type: 'disabled' }`, temperatura baja y timeout entre 5 y 120 s, predeterminado 90 s.
  - Reutilizar `aiGeneration.ts` para el patrón de errores, sin copiar mensajes del proveedor.
- [ ] **Step 3: Escribir pruebas RED del handler**
  - Método incorrecto, JWT ausente/inválido y rol no docente → códigos correctos.
  - Excepción de `verifyUser`, persistencia o proveedor → sobre seguro.
  - Rechazar solicitud mientras otra evaluación está en `running` salvo reanudación idempotente.
- [ ] **Step 4: Implementar handler y wrapper Deno**
  - `handlePreflight` con `ALLOWED_ORIGINS` exactos.
  - Verificar `Authorization: Bearer` y `app_metadata.role === 'teacher'`.
  - Inyectar `loadSubmission`, `loadExistingEvaluation`, `claimEvaluation` y `persistEvaluation` para que el handler sea testeable.
  - Configurar `verify_jwt = true` y no arrancar con excepción por falta de clave IA; responder `ai_not_configured` por solicitud.
- [ ] **Step 5: Ejecutar pruebas y commit**
  - `npm test -- supabase/functions/evaluate-submission/provider.test.ts supabase/functions/evaluate-submission/handler.test.ts`
  - Commit: `feat: proteger evaluacion individual con IA`

## Task 3: Persistencia idempotente y autorización de datos

**Files:**
- Create via `npx supabase migration new evaluate_submission`
- Create: `supabase/migrations/*_evaluate_submission.sql`
- Create: `src/lib/api/evaluations.ts`
- Create: `src/lib/api/evaluations.test.ts`
- Modify: `src/lib/api/submissions.ts`
- Modify: `supabase/functions/evaluate-submission/index.ts`

**Interfaces:**
- RPC privada o transacción equivalente para reclamar y cerrar una evaluación.
- `requestSubmissionEvaluation(client, submissionId, forceRetry?): Promise<EvaluationJob>`
- `getSubmissionEvaluation(client, submissionId): Promise<EvaluationView | null>`

- [ ] **Step 1: Escribir pruebas RED PGlite de estados e idempotencia**
  - Solo `submitted` puede evaluarse.
  - La fila se crea como `running`, una segunda llamada concurrente no duplica gracias a la unicidad existente.
  - `completed` se devuelve sin llamar otra vez al proveedor.
  - `failed` permite `forceRetry`; cualquier otro estado no se reinicia.
  - Persistencia de `result_json`, `dimension_summary_json`, confianza y timestamps; fallo guarda código seguro.
- [ ] **Step 2: Crear migración solo si hace falta**
  - No agregar otra tabla de resultados; usar `ai_evaluations` existente.
  - Si se requiere función SQL, fijar `search_path`, `SECURITY INVOKER`, revocar a `PUBLIC`/`anon` y conceder mínimo a `service_role`.
  - Conservar trigger que impide pasar de `failed` a `reviewed` sin docente.
- [ ] **Step 3: Implementar carga completa server-side**
  - Consulta conjunta de entrega, evaluación, lectura, preguntas, criterios/módulos y respuestas.
  - Rechazar respuestas faltantes o preguntas de otra evaluación.
  - Tomar `rubric_snapshot`, `rubric_schema_version` y `rubric_hash` de la evaluación congelada.
  - No incluir datos identificatorios en el objeto enviado al proveedor.
- [ ] **Step 4: Implementar adaptadores del cliente docente**
  - `functions.invoke('evaluate-submission')` acepta únicamente el sobre estructurado.
  - Consultas RLS de `ai_evaluations` validan con Zod y exponen solo campos necesarios a la UI.
- [ ] **Step 5: Verificar y commit**
  - `npm test -- src/lib/api/evaluations.test.ts src/test/db/assessment-flow.test.ts supabase/functions/evaluate-submission`
  - `npx supabase migration list --local` si se creó migración.
  - Commit: `feat: persistir evaluaciones IA de forma idempotente`

## Task 4: Pantalla docente de evaluación provisional

**Files:**
- Modify: `src/features/submissions/SubmissionDetailScreen.tsx`
- Modify: `src/features/submissions/SubmissionDetailScreen.test.tsx`
- Modify: `src/features/submissions/submissions.css`
- Modify: `src/lib/api/submissions.ts`

**Interfaces:**
- El detalle muestra estado IA, botón `Evaluar con IA` solo para entregas enviadas, progreso accesible y resultado provisional.
- No mostrar nada de `ai_evaluations` en rutas estudiantiles.

- [ ] **Step 1: Escribir pruebas RED del estado docente**
  - Entrega no enviada no permite solicitar evaluación.
  - Click solicita una vez, deshabilita mientras `running` y muestra error recuperable.
  - `completed` muestra confianza, dimensiones, criterios, evidencias, observaciones, fortalezas, prioridades y limitaciones.
  - Aviso visible: “Resultado provisional; requiere revisión docente”.
- [ ] **Step 2: Implementar consulta y acción con React Query o patrón local existente**
  - Recargar después de cada operación, sin tiempo real.
  - Mantener respuesta original y lectura siempre visibles.
  - No presentar ranking ni puntuación global del curso en este bloque.
- [ ] **Step 3: Validar accesibilidad y estilos existentes**
  - Etiquetas persistentes, foco, `role=status`/`role=alert`, no depender solo de color.
  - Respetar menú lateral e identidad visual vigente.
- [ ] **Step 4: Ejecutar pruebas focalizadas, React Doctor y commit**
  - `npm test -- src/features/submissions/SubmissionDetailScreen.test.tsx src/lib/api/evaluations.test.ts`
  - `npx -y react-doctor@latest . --verbose --diff`
  - Commit: `feat: revisar evaluacion IA desde detalle docente`

## Task 5: Verificación, documentación y límite de alcance

**Files:**
- Modify: `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`
- Modify: `README.md` si aún contradice el despliegue endurecido

- [ ] **Step 1: Ejecutar puerta general**
  - `npm run verify` y registrar número real de pruebas, lint, build y build:check.
- [ ] **Step 2: Smoke local sin secretos**
  - Arrancar funciones con variables de ejemplo; comprobar sobre de errores, rol docente y ausencia de salida de claves.
  - Si existe clave remota configurada, no imprimirla ni copiarla al repo.
- [ ] **Step 3: Actualizar estado real**
  - Registrar la ruta individual implementada y dejar explícitos como pendientes: lote de hasta tres llamadas, revisión/ajustes docentes, dashboard por dimensiones, exportación, control persistente de consumo y E2E remoto.
- [ ] **Step 4: Commit documental**
  - Commit: `docs: registrar evaluacion docente IA provisional`

## Estado de ejecución al 3 de septiembre de 2026

| Bloque | Estado verificado |
| --- | --- |
| Task 1: contrato y prompt | Completado localmente con pruebas. |
| Task 2: proveedor y handler | Completado localmente con errores seguros, autenticación y rol docente. |
| Task 3: persistencia y autorización | Completado localmente sobre `ai_evaluations`; el esquema existente fue suficiente y no se creó migración. |
| Task 4: interfaz docente | Completado localmente; el resultado se presenta como provisional y no aparece en rutas estudiantiles. |
| Task 5: verificación y documentación | Puerta general y documentación completadas. El smoke visual automatizado no pudo realizarse porque el navegador integrado se cerró y Playwright no pertenece al proyecto. |
| Despliegue remoto | No realizado en este bloque; requiere autorización y smoke remoto posteriores. |

Evidencia final local: `npm run verify` con código 0, 68 archivos y 348 pruebas aprobadas, build con 183 módulos transformados; React Doctor 90/100 sin hallazgos. Los checkboxes anteriores conservan el procedimiento TDD originalmente planificado; esta tabla registra el resultado real de su ejecución.

## Criterios de aceptación del bloque

- Una entrega `submitted` puede solicitar una evaluación individual desde el detalle docente.
- La IA recibe solo contexto pedagógico delimitado; nunca identidad estudiantil ni secretos.
- La salida inválida, timeout y proveedor caído se clasifican sin filtrar detalles.
- La evaluación se persiste una sola vez por entrega/rúbrica/versión y puede reintentarse solo si falló.
- La salida muestra criterios y dimensiones con evidencia, confianza y limitaciones, marcada como provisional.
- El estudiante no ve evaluación ni retroalimentación.
- Las pruebas focalizadas, `npm run verify` y React Doctor quedan en verde.
