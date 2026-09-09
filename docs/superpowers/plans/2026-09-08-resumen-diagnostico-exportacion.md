# Resumen diagnóstico y exportación — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir las pantallas provisionales `Resumen diagnóstico` y `Exportar` por un circuito real: el docente entiende los resultados de una evaluación aplicada por paralelo y por estudiante, y descarga la misma información en Excel o CSV, sin ampliar el alcance de Yachayñan Lite más allá de eso.

**Architecture:** Un motor puro y determinista (sin React, sin Supabase, sin Excel) recibe un reporte ya cargado y validado y produce las métricas del §4.2 del spec. Un único cargador protegido en `src/lib/api/diagnosticReport.ts` obtiene ese reporte con la sesión docente, reutilizando las funciones y esquemas ya existentes en `src/lib/api/submissions.ts` y `supabase/functions/_shared/aiEvaluation.ts` en vez de duplicarlos. El dashboard, el CSV y el Excel consumen la misma estructura de métricas; ninguno recalcula reglas por separado. No se agrega ninguna migración: las políticas RLS vigentes (`teacher full access` sobre `groups`, `students`, `assessments`, `questions`, `submissions`, `responses`, `ai_evaluations`; `teacher read access` sobre `assessment_access`) ya cubren todas las lecturas que este bloque necesita.

**Tech Stack:** React 18, TypeScript, Zod, Vitest, Testing Library, Supabase (Data API bajo RLS, sin `service_role` en el navegador), una librería de escritura de Excel cargada de forma diferida.

**Spec:** `docs/superpowers/specs/2026-09-08-resumen-diagnostico-exportacion-design.md`

## Contexto ya verificado en el código (no volver a descubrirlo)

- `src/lib/api/submissions.ts` ya expone `listAppliedAssessments(client)` (evaluaciones `open`/`closed`/`archived`, ordenadas por `opened_at`), `mapAccessState({access, submission})` (deriva `esperado`/`iniciado`/`entregado`/`bloqueado`/`revocado`) y `getSubmissionDetail(client, submissionId)` (preguntas congeladas + respuestas + `omitted: !response || response.original_text.trim().length === 0`). El nuevo cargador reutiliza las tres cosas; no las reimplementa.
- `listSubmissionOverview` ya muestra el patrón correcto para "última evaluación IA por entrega según `requested_at`": trae todas las filas de `ai_evaluations` para los `submission_id` del paralelo ordenadas descendente y se queda con la primera por `submission_id` vista (`Map.has` como guarda). El cargador de este bloque debe seguir exactamente ese patrón, ampliado con las columnas que aquí faltan (`result_json`, `confidence`, `teacher_adjustments`, `teacher_note`, `reviewed_at`).
- `supabase/functions/_shared/aiEvaluation.ts` ya define `EVALUATION_DIMENSIONS`, `CRITERIA_BY_DIMENSION`, `OBSERVATION_CODES_BY_RUBRIC_ID`, los tipos `EvaluationResult`/`QuestionEvaluation`/`CriterionEvaluation`/`ModuleEvaluation`/`EvaluationObservation`/`DimensionSummary`/`EvaluationLevel` (`1|2|3|4|'no_aplica'`) y la función `parseEvaluationResult(json, questions)` que valida `result_json` de forma estricta contra las preguntas congeladas. Esto ES el "código determinista compartido" del spec §9 — el motor de métricas de este bloque importa desde aquí, no redefine dimensiones ni criterios.
- `src/lib/api/evaluationReview.ts` ya define `adjustmentsSchema`/`TeacherAdjustment = {position: 1-4, id: string, level: EvaluationLevel, reason: string}` — es el contrato exacto de `teacher_adjustments` que el spec §4.1 pide superponer por posición e identificador.
- `src/features/assessment/accessCodesCsv.ts` ya tiene el patrón exacto de CSV que pide el spec §6.2: BOM, RFC 4180, neutralización de fórmulas (`=`, `+`, `-`, `@`). Extraer sus dos helpers puros (`neutralizeFormula`, `escapeField`) a un módulo compartido en vez de copiarlos.
- No existe hoy ninguna librería de escritura de Excel en `package.json` (`read-excel-file` solo lee). Se añade `exceljs` como dependencia nueva, cargada con `await import('exceljs')` únicamente dentro del flujo de exportación — nunca en el bundle inicial. Verificar con `npm run build` que no aparece en el chunk principal.
- `src/app/router.tsx` ya tiene las rutas `/docente/diagnostico` y `/docente/exportar` apuntando a `<PlaceholderScreen title="…" />`, cargadas de forma diferida (`React.lazy`) igual que el resto de pantallas docentes. Este bloque reemplaza esos dos usos, no las rutas ni el mecanismo de carga diferida.

## Global Constraints

- La respuesta original nunca se modifica, recorta ni reemplaza por una síntesis, en ninguna capa (dashboard, CSV, Excel).
- `no_aplica` y las preguntas omitidas nunca son cero; se excluyen de promedios y distribuciones de nivel, y se muestran aparte como cobertura.
- Una evaluación `discarded` no aporta niveles, promedios, fortalezas ni falencias — solo cuenta en cobertura/estado. `pending`/`running`/`failed` tampoco aportan niveles.
- `completed` es siempre provisional de IA; `reviewed` usa el resultado original con los ajustes docentes superpuestos por posición + identificador de criterio/módulo. Un ajuste duplicado, desconocido o mal formado bloquea el informe completo (nunca se aplica parcialmente ni se descarta en silencio).
- No se presenta una nota global única del estudiante ni del curso.
- Todo cálculo agregado vive en el motor puro (`diagnosticMetrics.ts`); ni la IA ni la pantalla ni los exportadores recalculan una regla por su cuenta.
- Solo lee una sesión con `app_metadata.role=teacher` bajo las políticas RLS vigentes. Nunca se usa `service_role` en el navegador. No se añade una segunda fuente de datos ni se persiste una copia del informe en Supabase.
- La exportación se genera en memoria en el cliente; no sube a Supabase ni a terceros. No se envía información adicional al proveedor de IA.
- No se incluyen códigos de acceso, hashes, tokens, huellas, claves, ni texto completo de rúbrica en ninguna salida.
- Nada de esto es de escritura: no modifica entregas, evaluaciones ni revisiones existentes.
- No se amplía el alcance con gestión individual de estudiantes, seguimiento longitudinal, detección de autoría IA, telemetría de escritura, gráficos históricos, retroalimentación estudiantil, PDF, envío a Drive ni exportación programada.
- No se añaden migraciones ni RPC nuevas para este bloque (ver "Contexto ya verificado").
- Cada tarea sigue RED–GREEN y termina con `npm run verify` y React Doctor antes de darse por completa. No se despliega ni publica sin autorización separada.

---

### Task 1: Modelo normalizado y motor de métricas puro

**Files:**
- Create: `src/features/diagnostics/diagnosticModel.ts`
- Create: `src/features/diagnostics/diagnosticModel.test.ts`
- Create: `src/features/diagnostics/diagnosticMetrics.ts`
- Create: `src/features/diagnostics/diagnosticMetrics.test.ts`

**Interfaces:**
- Consumes: tipos de `supabase/functions/_shared/aiEvaluation.ts` (`EvaluationResult`, `EvaluationLevel`, `EvaluationDimension`, `CRITERIA_BY_DIMENSION`, `EVALUATION_DIMENSIONS`) y `TeacherAdjustment` de `src/lib/api/evaluationReview.ts`. No importa nada de Supabase, React ni de una librería de Excel/CSV.
- Produces: un tipo `DiagnosticReport` (entrada normalizada: evaluación, paralelo, estudiantes con su entrega/evaluación cruda) y `applyEffectiveResult(evaluation) → EffectiveResult | ContractError` (§4.1) más `computeDiagnosticMetrics(report) → DiagnosticMetrics` (§4.2), ambas funciones puras y deterministas.

Este módulo es el corazón algorítmico del bloque y el que más criterios de aceptación concentra (spec §10, puntos 1–5, 8, 10). Constrúyelo y pruébalo primero, sin esperar al cargador de datos ni a la pantalla.

**§4.1 — Resultado efectivo, por implementar exactamente así:**
- `completed`: nivel y razón de cada criterio/módulo salen de `result_json` sin tocar; fuente `provisional_ia`.
- `reviewed`: para cada criterio/módulo, si existe en `teacher_adjustments` un ajuste con la misma `position` (pregunta) e `id` (criterio o módulo), su `level`/`reason` reemplazan al de `result_json`; si no existe ese ajuste, se conserva el valor original de `result_json`. Fuente `revisado_docente`. Un ajuste cuyo `position`+`id` no corresponde a ningún criterio/módulo activo de esa pregunta, o dos ajustes con el mismo `position`+`id`, o un ajuste con forma inválida (fuera de lo que ya valida `adjustmentsSchema`) → la función devuelve un error de contrato identificando la entrega afectada; nunca aplica el resto de los ajustes de esa entrega.
- Cualquier otro estado (`pending`, `running`, `failed`, `discarded`): no hay resultado utilizable para esa entrega; se conserva solo para cobertura.

**§4.2 — Agregados, por implementar exactamente así:**
- **Cobertura:** conteos de estudiantes esperados (con acceso), iniciados, entregados, sin evaluación utilizable, con evaluación provisional, con evaluación revisada, descartados, fallidos y en curso. Un estudiante cuenta en exactamente una de las últimas seis categorías de evaluación, derivadas del `status` de la última fila de `ai_evaluations` (o de su ausencia).
- **Dimensión por estudiante:** media de todos los niveles numéricos efectivos (1–4) de esa dimensión para ese estudiante, usando `CRITERIA_BY_DIMENSION` para saber qué criterios pertenecen a cada una de las cuatro dimensiones. Se acompaña de la cantidad de juicios aplicables (no solo el promedio) para no ocultar baja cobertura.
- **Criterio por estudiante:** media de los niveles efectivos de ese estudiante para ese criterio, entre las preguntas donde el criterio estaba activo.
- **Criterio del paralelo:** media de los promedios por estudiante (no media directa de todos los juicios) — así cada estudiante pesa una sola vez aunque el criterio aparezca en varias preguntas.
- **Distribución 1–4:** conteo de juicios efectivos individuales por nivel, junto con el número de estudiantes evaluados y el número de juicios (dos cifras distintas, ambas expuestas).
- **Omisiones:** estudiantes y respuestas omitidas, contadas aparte del desempeño medido.
- **Observaciones frecuentes:** frecuencia por `code` y `severity`; las que traen `review: 'needs_evidence_review'` se cuentan aparte, nunca mezcladas con las confirmadas.
- Si no existe ningún nivel numérico para un promedio dado, el resultado es `null` (vacío), nunca `0`.
- Todos los promedios se redondean a dos decimales solo en la capa de presentación; el motor devuelve el número sin redondear ni convertir a texto localizado (eso es trabajo del componente/exportador que lo consuma, no de este módulo).

- [x] Escribir pruebas RED que cubran, como mínimo: ajuste docente sustituyendo exactamente el criterio indicado sin mutar el original; ajuste duplicado/desconocido/inválido bloqueando el informe completo; `no_aplica`/omitida/`discarded`/`failed` sin afectar promedios; promedio del paralelo ponderando una vez por estudiante y criterio; promedio vacío cuando no hay ningún nivel numérico; distribución 1–4 con conteo de estudiantes Y de juicios por separado; observaciones `needs_evidence_review` contadas aparte.
- [x] Confirmar el fallo esperado (los módulos no existen todavía).
- [x] Implementar `diagnosticModel.ts` (tipos + `applyEffectiveResult`) y `diagnosticMetrics.ts` (`computeDiagnosticMetrics` y los agregados anteriores) hasta poner las pruebas en verde.
- [x] Ejecutar `npx vitest run src/features/diagnostics/diagnosticModel.test.ts src/features/diagnostics/diagnosticMetrics.test.ts`.

### Task 2: Cargador de datos protegido

**Files:**
- Create: `src/lib/api/diagnosticReport.ts`
- Create: `src/lib/api/diagnosticReport.test.ts`

**Interfaces:**
- Consumes: `listAppliedAssessments` y `mapAccessState` de `src/lib/api/submissions.ts`; `parseEvaluationResult` de `supabase/functions/_shared/aiEvaluation.ts`; `adjustmentsSchema` de `src/lib/api/evaluationReview.ts`; el tipo `DiagnosticReport` de la Task 1.
- Produces: `listDiagnosticAssessments(client)` (reexporta/reutiliza `listAppliedAssessments` — no una copia), `listGroupsForAssessment(client)` (reutiliza `listGroups` de `src/lib/api/groups.ts`), y `loadDiagnosticReport(client, assessmentId, groupId) → Promise<DiagnosticReport>`.

`loadDiagnosticReport` obtiene, para la evaluación y el paralelo dados: metadatos de evaluación y paralelo; estudiantes con acceso a esa evaluación filtrados por `group_id` (máximo 50); entrega y `submitted_at` de cada uno; preguntas congeladas con `active_criteria`/`active_modules`; respuesta original, `word_count` y omisión (misma regla que `getSubmissionDetail`); y, por entrega, la última fila de `ai_evaluations` por `requested_at` con `result_json`, `confidence`, `status`, `teacher_adjustments`, `teacher_note`, `reviewed_at` — siguiendo el mismo patrón de consultas acotadas y en paralelo (`Promise.all` + `.in()` troceado si aplica) que ya usa `listSubmissionOverview`, sin agregar un JOIN nuevo que RLS no soporte. Cada respuesta de Supabase se valida con un esquema Zod estricto (ya existen los de `submissions.ts`/`aiEvaluation.ts` como referencia; reutilizar donde el shape coincide) antes de pasar el resultado a `parseEvaluationResult`. Un `result_json` que no valide, o un `teacher_adjustments` que no valide contra `adjustmentsSchema`, se reporta como una entrega con contrato inválido en el reporte (no lanza una excepción no controlada) para que la Task 7 pueda bloquear la exportación citando esa entrega.

- [x] Escribir pruebas RED con un cliente Supabase simulado: evaluación+paralelo válidos producen un `DiagnosticReport` completo; un paralelo sin estudiantes produce cobertura vacía sin error; una fila de `ai_evaluations` con `result_json` inválido se marca como contrato inválido en vez de lanzar; se toma la última evaluación por `requested_at` cuando hay varias filas para la misma entrega; los estudiantes que no iniciaron entrega igual aparecen en el reporte con `submissionId: null`.
- [x] Confirmar el fallo esperado.
- [x] Implementar `diagnosticReport.ts` hasta poner las pruebas en verde, reutilizando explícitamente `listAppliedAssessments`, `mapAccessState`, `parseEvaluationResult` y `adjustmentsSchema` en vez de reimplementarlos.
- [x] Ejecutar `npx vitest run src/lib/api/diagnosticReport.test.ts src/lib/api/submissions.test.ts` (el segundo confirma que no se rompió nada reutilizado).

### Task 3: Pantalla Resumen diagnóstico

**Files:**
- Create: `src/features/diagnostics/DiagnosticSummaryScreen.tsx`
- Create: `src/features/diagnostics/DiagnosticSummaryScreen.test.tsx`
- Create: `src/features/diagnostics/DiagnosticFilters.tsx` (selección de evaluación/paralelo/fuente, compartido con la Task 6)
- Create: `src/features/diagnostics/CoverageCards.tsx`, `DimensionTable.tsx`, `CriteriaTable.tsx`, `ObservationsTable.tsx`, `StudentsTable.tsx` (componentes pequeños de presentación, cada uno recibe métricas ya calculadas, sin lógica de agregación propia)
- Modify: `src/app/router.tsx` (reemplaza `<PlaceholderScreen title="Resumen diagnóstico" />` por `<DiagnosticSummaryScreen />`, manteniendo la carga diferida existente)

**Interfaces:**
- Consumes: `loadDiagnosticReport`/`listDiagnosticAssessments`/`listGroupsForAssessment` de la Task 2; `computeDiagnosticMetrics` de la Task 1.
- Produces: la pantalla completa del spec §5, con `DiagnosticFilters` como pieza reutilizable por la Task 6.

`DiagnosticFilters` gestiona evaluación (por defecto la aplicada más reciente), paralelo (obligatorio, sin curso mixto por defecto) y fuente (`Todos los utilizables` / `Solo revisados` / `Solo provisionales`) — filtra sobre el reporte ya cargado sin volver a golpear la base para cambiar de fuente. Si hay al menos un resultado provisional en la selección vigente, se etiqueta "Resultados mixtos: contienen evaluación provisional de IA".

Orden de lectura de la pantalla (§5): encabezado con evaluación/paralelo/estado/fecha de corte → aviso de procedencia → tarjetas de cobertura → tabla de cuatro dimensiones (promedio, estudiantes medidos, juicios aplicables, cobertura) → tabla de criterios (etiqueta, promedio, niveles 1–4, `no_aplica`, estudiantes medidos, evidencia pendiente) → falencias frecuentes (promedio ascendente; empate por más niveles 1–2; `Muestra insuficiente` si menos de tres estudiantes medidos) → fortalezas (regla simétrica) → observaciones IA frecuentes (código, etiqueta legible, frecuencia, severidad, cantidad pendiente de comprobar) → tabla por estudiante (estado, preguntas respondidas/omitidas, cuatro promedios dimensionales, enlace al detalle existente de `SubmissionDetailScreen`).

Las tablas son ordenables sin alterar los cálculos subyacentes. Estados de carga, vacío, error y "sin resultados utilizables" cubiertos explícitamente. Navegable por teclado; encabezados y descripciones en las tablas; ningún estado depende solo del color (usar texto/ícono además de color para severidad/procedencia).

- [x] Escribir pruebas RED: paralelo con datos mixtos muestra el aviso "Resultados mixtos"; una falencia con solo dos estudiantes medidos muestra "Muestra insuficiente" en vez de una cifra; cambiar de paralelo limpia la tabla anterior antes de mostrar la nueva (adelanta la Task 7, pero verificarlo aquí es más barato); la tabla por estudiante enlaza al detalle existente.
- [x] Confirmar el fallo esperado.
- [x] Implementar la pantalla y sus subcomponentes hasta poner las pruebas en verde.
- [x] Ejecutar `npx vitest run src/features/diagnostics`.

### Task 4: Serialización CSV

**Files:**
- Modify: `src/features/assessment/accessCodesCsv.ts` (extraer `neutralizeFormula`/`escapeField` a un módulo compartido)
- Create: `src/lib/csv/csvEscaping.ts` (los dos helpers extraídos, con sus pruebas movidas)
- Create: `src/features/diagnostics/diagnosticCsv.ts`
- Create: `src/features/diagnostics/diagnosticCsv.test.ts`

**Interfaces:**
- Consumes: `neutralizeFormula`/`escapeField` de `src/lib/csv/csvEscaping.ts`; la estructura de métricas/reporte de la Task 1.
- Produces: `buildDiagnosticCsv(report, metrics) → string` (tabla larga: una fila por estudiante, pregunta y criterio/módulo) y `diagnosticFileName(assessmentSlug, groupName, cutoffDate, extension)`.

CSV codificado en UTF-8 con BOM, coma como separador, comillas RFC 4180, fórmulas neutralizadas, tildes/ñ conservadas, columnas: metadatos de evaluación/paralelo, respuesta original, omisión, identificador y etiqueta del criterio/módulo, nivel original, nivel efectivo, fuente, razón, confianza, códigos de observación de esa pregunta. Nombre de archivo: `yachaynan-diagnostico_<evaluacion>_<paralelo>_<fecha>.csv`, con segmentos saneados (sin espacios ni caracteres que rompan un nombre de archivo).

- [x] Escribir pruebas RED: fila con tildes/comillas/salto de línea se escapa correctamente; celda que empieza por `=`/`+`/`-`/`@` queda neutralizada; el archivo conserva BOM; el conteo de filas coincide con estudiantes × preguntas × (criterios activos + módulos activos) menos las combinaciones sin resultado utilizable, que igual aparecen con nivel vacío.
- [x] Confirmar el fallo esperado.
- [x] Extraer los helpers de `accessCodesCsv.ts` (sin cambiar su comportamiento; su propia prueba existente debe seguir en verde) e implementar `diagnosticCsv.ts`.
- [x] Ejecutar `npx vitest run src/features/diagnostics/diagnosticCsv.test.ts src/features/assessment/accessCodesCsv.test.ts src/lib/csv`.

### Task 5: Libro de Excel

**Files:**
- Modify: `package.json` / `package-lock.json` (añadir `exceljs` como dependencia; instalar con `npm install`)
- Create: `src/features/diagnostics/diagnosticWorkbook.ts`
- Create: `src/features/diagnostics/diagnosticWorkbook.test.ts`

**Interfaces:**
- Consumes: la estructura de métricas/reporte de la Task 1; `exceljs` vía `await import('exceljs')` dentro de la función, nunca en un `import` estático de nivel de módulo.
- Produces: `buildDiagnosticWorkbook(report, metrics) → Promise<ArrayBuffer>` y `diagnosticFileName(...)` (reutilizada de la Task 4).

Cinco hojas en este orden — `Resumen` (metadatos, aviso de procedencia, cobertura, dimensiones), `Estudiantes` (una fila por estudiante: estado, fechas, cobertura, cuatro dimensiones), `Criterios` (una fila por estudiante+pregunta+criterio/módulo: nivel original, nivel efectivo, fuente, razón efectiva, confianza, revisión de evidencia pendiente), `Respuestas` (una fila por estudiante+pregunta: consigna, respuesta original, palabras, omisión, fecha), `Observaciones` (una fila por observación IA: estudiante, pregunta, código, fragmento, explicación, severidad, revisión pendiente). Encabezados congelados (`worksheet.views = [{ state: 'frozen', ySplit: 1 }]`), filtro automático habilitado, fechas como `Date` reales (no texto), promedios como números (no texto localizado), sin fórmulas dependientes de Excel (todo llega ya calculado desde `diagnosticMetrics`), sin hojas ocultas, formato sobrio.

- [x] Escribir pruebas RED que abran el `ArrayBuffer` resultante con `exceljs` (leer lo que se acaba de escribir) y verifiquen: las cinco hojas existen en ese orden; los encabezados quedan en la fila congelada; una fecha llega como objeto `Date`; un promedio llega como `number`; ninguna hoja está oculta.
- [x] Confirmar el fallo esperado.
- [x] Añadir `exceljs`, implementar `diagnosticWorkbook.ts`.
- [x] Ejecutar `npx vitest run src/features/diagnostics/diagnosticWorkbook.test.ts`, luego `npm run build` y confirmar (por tamaño de chunk o por el reporte de `vite build`) que `exceljs` no aparece en el bundle que carga `/docente` de entrada — debe quedar en un chunk separado, cargado solo al pedir el Excel. Si esto no se puede lograr de forma razonable con `exceljs` en este stack, reportarlo antes de continuar en vez de aceptar en silencio una regresión de carga inicial.

### Task 6: Pantalla Exportar

**Files:**
- Create: `src/features/diagnostics/DiagnosticExportScreen.tsx`
- Create: `src/features/diagnostics/DiagnosticExportScreen.test.tsx`
- Modify: `src/app/router.tsx` (reemplaza `<PlaceholderScreen title="Exportar" />` por `<DiagnosticExportScreen />`)

**Interfaces:**
- Consumes: `DiagnosticFilters` de la Task 3 (mismo componente, mismos filtros); `loadDiagnosticReport`/`computeDiagnosticMetrics` de las Tasks 1–2; `buildDiagnosticCsv`/`diagnosticFileName` de la Task 4; `buildDiagnosticWorkbook` de la Task 5.

Antes de descargar, la pantalla muestra: evaluación y paralelo; estudiantes incluidos; conteo de resultados revisados y provisionales incluidos; advertencia de que el archivo contiene datos personales y debe guardarse en un lugar autorizado; fecha y hora exactas del corte (el mismo timestamp con el que se cargó el reporte, no uno recalculado al momento de la descarga). Dos botones — CSV y Excel — deshabilitados hasta que exista una carga válida. El Excel se genera solo al pulsar su botón (import diferido real, no precargado al entrar a la pantalla).

- [x] Escribir pruebas RED: sin selección válida, ambos botones están deshabilitados; tras una carga válida, ambos quedan habilitados y muestran el resumen previo con las cifras correctas; el nombre de archivo generado sigue el patrón `yachaynan-diagnostico_<evaluacion>_<paralelo>_<fecha>.<ext>`.
- [x] Confirmar el fallo esperado.
- [x] Implementar la pantalla.
- [x] Ejecutar `npx vitest run src/features/diagnostics/DiagnosticExportScreen.test.tsx`.
- [x] Comprobar en un navegador real (no jsdom) que el botón de Excel dispara el `await import('exceljs')` solo al pulsarlo y produce un `.xlsx` válido, en el servidor de desarrollo y en el bundle de producción.

### Task 7: Coherencia y errores entre pantallas

**Files:**
- Modify: `src/features/diagnostics/DiagnosticSummaryScreen.tsx`, `DiagnosticExportScreen.tsx`, `DiagnosticFilters.tsx` según lo que exija cada prueba nueva.
- Modify/Create: pruebas correspondientes en los mismos archivos `.test.tsx`.
- Modify: `src/components/layout/TeacherLayout.tsx` (+ `TeacherLayout.test.tsx`): enlazar `/docente/diagnostico` y `/docente/exportar` en vez de anunciarlas como «Próximamente».
- Delete: `src/components/common/PlaceholderScreen.tsx` (código muerto tras las Tasks 3 y 6).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: el comportamiento del spec §9 aplicado de punta a punta en ambas pantallas.

- [x] Prueba: cambiar cualquier filtro invalida el reporte anterior antes de mostrar el siguiente (nunca se ve una tabla vieja con un encabezado nuevo). *(ya cubierta en ambas pantallas por las Tasks 3 y 6)*
- [x] Prueba: una entrega con `result_json`/`teacher_adjustments` inválido (del contrato marcado en la Task 2) hace que el resumen la señale explícitamente y que la exportación quede bloqueada citando esa entrega, con instrucción de reevaluar/descartar desde el detalle existente y recargar — nunca una exclusión silenciosa de filas.
- [x] Prueba: una entrega sin evaluación sigue en cobertura y en la tabla de estudiantes, pero no entra en ningún promedio.
- [x] Prueba: una respuesta omitida aparece en la hoja `Respuestas`/CSV como omitida y sin nivel numérico. *(ya cubierta por las Tasks 4 y 5)*
- [x] Prueba: si la sesión se cierra durante la carga, se muestra el flujo habitual de sesión inválida (reutilizar el mecanismo existente, no uno nuevo).
- [x] Prueba: la descarga solo se habilita después de una carga válida y el archivo conserva la fecha exacta del corte mostrado en pantalla. *(ya cubierta por la Task 6)*
- [x] Corrección: el «paralelo vacío» de la exportación se decide con `fullMetrics.coverage.expected`, como en el resumen; una fuente que deja la selección vacía bloquea con su propio motivo, sin acusar al paralelo de no tener estudiantes.
- [x] Prueba de regresión: el bloqueo por contrato lee `fullMetrics.contractErrors`, no las métricas filtradas por fuente.
- [x] Enlazar «Resumen diagnóstico» y «Exportar» en el menú docente y retirar `PlaceholderScreen`, ya sin uso.
- [x] Confirmar el fallo esperado en cada una antes de implementar el ajuste correspondiente.
- [x] Ejecutar `npx vitest run src/features/diagnostics src/app src/components`.

### Task 8: Confirmación de RLS, documentación y cierre

**Files:**
- Create (opcional si se decide dejar evidencia automatizada): `src/test/db/diagnostic-report-rls.test.ts`
- Modify: `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`, `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`, `README.md` (retirar el lenguaje de "dashboard/exportación pendiente" que dejó la tarea anterior; documentar el circuito nuevo, sus límites y que no añadió migraciones)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: evidencia de que RLS sigue igual (acceso de solo lectura docente, sin privilegios de escritura nuevos) y documentación vigente.

- [x] Con PGlite (`src/test/db/pgliteFixture.ts`), confirmar que `anon` sigue sin poder leer `ai_evaluations`/`submissions`/`responses`/`students`/`groups`, y que `authenticated` sin rol docente tampoco puede — sin necesidad de una migración nueva, esto es una prueba de regresión sobre las políticas ya existentes. `src/test/db/diagnostic-report-rls.test.ts`, 5/5 en verde; incluye un control positivo (sesión docente sí puede leer) y confirma que ningún privilegio de escritura nuevo apareció para `authenticated` (incluida la revocación preexistente de `INSERT` sobre `students`, heredada del bloque de límites de entrada, no de este).
- [x] Actualizar los tres documentos para reflejar que el resumen diagnóstico y la exportación ya están implementados y probados localmente (nunca como desplegado, salvo que Task de despliegue separada lo confirme). `README.md`, `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` y `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` actualizados; se retiró el lenguaje de "pendiente"/"Próximamente" sobre estas dos pantallas y se documentó explícitamente que no se agregó ninguna migración.
- [x] Ejecutar la puerta completa: `npm run verify`, `npx -y react-doctor@latest . --verbose --diff`, revisar el diff completo de la rama. `npm run verify`: 102 archivos, 755 pruebas, lint/formato/tipos/build en verde (única advertencia: el chunk de `exceljs`, separado a propósito). React Doctor: 80/100 — 9 hallazgos nuevos, todos en `src/features/diagnostics/`, revisados uno por uno; ninguno bloqueante (dos son la complejidad esperada de pantallas grandes ya evaluadas como "ganada" por dos revisiones previas; el patrón de `DiagnosticFilters.tsx:94` es la decisión arquitectónica deliberada de Task 3, ya escrutinada dos veces; el resto son micro-optimizaciones de rendimiento sobre código puro con ≤50 estudiantes × 4 preguntas). Quedan como hallazgos diferidos para la revisión final de rama, no como bloqueo de este cierre.
- [x] Dejar la rama lista para revisión, sin push ni despliegue.

---

## Final Acceptance Checklist

Corresponde uno a uno con el spec §10:

- [x] Ajustes docentes sustituyen exactamente el criterio indicado y no mutan el resultado original. (Task 1, `diagnosticModel.test.ts`)
- [x] `no_aplica`, omisiones, descartados y fallidos no reducen promedios. (Task 1)
- [x] El promedio del paralelo pondera una vez a cada estudiante por criterio. (Task 1, verificado con matemática real por el revisor, no solo por el informe)
- [x] Provisionales y revisados nunca pierden su etiqueta de procedencia. (Task 1/3, `source`/`coverageCategory` sobreviven en cada capa)
- [x] El último intento de evaluación se selecciona determinísticamente. (Task 2, comparación numérica de `requested_at`, probada con filas fuera de orden)
- [x] Los filtros no mezclan evaluaciones ni paralelos. (Task 3/7, invalidación antes de cargar en ambas pantallas)
- [x] Resumen, Excel y CSV producen los mismos conteos y promedios. (Task 4/5, `applyEffectiveResult`/`buildDiagnosticJudgmentRows` compartidos, no reimplementados)
- [x] CSV conserva tildes, comillas y saltos de línea y neutraliza fórmulas. (Task 4)
- [x] Excel tiene las cinco hojas, encabezados, tipos y filas esperadas. (Task 5, verificado leyendo el `ArrayBuffer` de vuelta, y en un navegador real)
- [x] Estados vacíos y errores impiden descargas engañosas. (Task 6/7, bloqueo por contrato leído siempre de las métricas sin filtrar)
- [x] RLS impide lectura anónima y el cambio no amplía privilegios de escritura. (Task 8, `diagnostic-report-rls.test.ts`)
- [x] La puerta completa `npm run verify`, React Doctor y compilación pasan. (Task 8; React Doctor con hallazgos revisados y diferidos, ninguno bloqueante)
