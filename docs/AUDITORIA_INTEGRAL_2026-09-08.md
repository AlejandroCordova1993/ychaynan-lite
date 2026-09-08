# Auditoría integral — Yachayñan Lite

Fecha: 8 de septiembre de 2026. Corte: `96b7e0c1bc7d87f8afffa84d8ae73369b61ab217`, rama `master`, sincronizada con `origin/master` al iniciar.

## Dictamen

Existe un circuito funcional sustancial: preparación docente, importación de nóminas, accesos estudiantiles, borradores, entregas, evaluación individual y por paralelo, y revisión docente. La infraestructura está publicada y las verificaciones automatizadas pasan. Sin embargo, todavía no recomiendo abrir una campaña completa: hay defectos reproducibles de conservación del borrador, compatibilidad de identidad y tratamiento de respuestas omitidas, además de debilidades en la presentación y validación de resultados de IA.

Esta fue una auditoría, no una implementación. No se desplegó, no se hizo push, no se cambiaron credenciales, cursos, estudiantes ni entregas. El único archivo permanente añadido es este informe.

## Evidencia y alcance

- Revisión de frontend, contratos, funciones Edge, migraciones, permisos, pruebas y documentación.
- `npm run verify`: código 0; 87 archivos, 596 pruebas; lint, formato, tipos y build correctos.
- Seis pruebas diagnósticas sintéticas adicionales reprodujeron los comportamientos descritos más abajo. Se retiraron después: comprobaban la existencia del defecto, no que estuviera corregido.
- `npm audit --omit=dev --json`: cero vulnerabilidades conocidas reportadas. No equivale a una garantía de seguridad del producto.
- Proyecto Supabase vinculado `qwqugnbmncrwcemxwutc`, activo; las 18 migraciones locales coinciden con las remotas.
- GitHub Actions: Verify y Deploy Pages finalizaron correctamente para el commit auditado.
- Metadatos remotos: las diez tablas públicas tienen RLS; ninguna concede SELECT directo a `anon`. La inserción directa de estudiantes por `authenticated` está retirada.
- Se consultaron metadatos, cadenas sintéticas de normalización y un contador de estados antiguos. No se enviaron respuestas a un proveedor de IA ni se hicieron escrituras productivas.
- La inspección visual mediante el navegador integrado falló por un problema de arranque de su entorno. Los resultados de interfaz se sustentan en código y pruebas de componentes, no en una revisión visual completa.

## Hallazgos prioritarios

### 1. P1 — Una sincronización tardía puede sobrescribir el borrador local más reciente

Referencia: `src/features/student/StudentResponseScreen.tsx:124` y `:142`.

Mientras se sincroniza una versión, el estudiante puede seguir escribiendo. Al terminar la petición anterior, se guarda su snapshot antiguo en localStorage, sustituyendo el texto más reciente que ya estaba protegido localmente. El cuadro de respuesta sigue mostrando el texto nuevo, pero una recarga puede recuperar la versión antigua.

Reproducción: escribir A, iniciar guardado al salir del campo, escribir AB antes de que responda el servidor y resolver la petición de A. La prueba confirmó que el campo conserva AB mientras el respaldo local vuelve a A.

Corrección recomendada: identificar revisiones locales y reconocer únicamente la revisión enviada, sin sobrescribir ediciones posteriores. Cubrir respuestas tardías, conflictos y recarga. Revisar después el guardado remoto, que depende de salir del campo, y su recuperación tras desconexión.

### 2. P1 — La importación y el ingreso no normalizan los nombres de la misma manera

Referencias: `supabase/migrations/20260906180000_atomic_roster_import.sql:43`, `supabase/migrations/20260901095530_student_access_flow.sql:1`, `supabase/functions/_shared/normalize.ts:5` y `src/lib/validation/normalizeName.ts`.

La importación atómica usa normalización SQL, mientras el ingreso usa otra implementación TypeScript. SQL convierte `Ana.María` en `ana maria`; TypeScript produce `anamaria`. Una ñ representada como n más tilde combinante se convierte en SQL en `n `, pero TypeScript la conserva como ñ mediante NFC. La consulta sintética al proyecto real confirmó ambos resultados SQL.

Impacto: determinados nombres válidos pueden quedar importados pero no coincidir al ingresar. No implica que todos los estudiantes estén afectados.

Corrección recomendada: definir equivalencia idéntica entre capas, conservar los nombres originales y probar puntuación, tildes, ñ compuesta/descompuesta y espacios. Antes de corregir registros existentes, identificar los afectados y posibles colisiones; no hacer una renormalización masiva a ciegas.

### 3. P1 — Las entregas incompletas se admiten, pero la IA las rechaza

Referencias: `supabase/migrations/20260901102813_student_submit_flow.sql`, `supabase/functions/evaluate-submission/submissionSource.ts:90` y `:107`.

La entrega definitiva admite preguntas sin responder. Una prueba sobre PGlite con las migraciones confirmó incluso una entrega sin filas de respuestas. Sin embargo, el constructor de entrada de IA exige una respuesta por pregunta y texto no vacío: falla con `missing_response` o `response_empty`.

Impacto: un trabajo entregado y bloqueado para edición puede no ser evaluable individualmente ni por lote.

Corrección recomendada: acordar y aplicar un contrato diagnóstico de omisiones. Las preguntas respondidas deben poder evaluarse, y las omitidas quedar identificadas sin inventar evidencia ni confundir ausencia de respuesta con desempeño medido. No resolverlo simplemente obligando al estudiante a rellenar todo.

### 4. P1 — Las observaciones detalladas de IA no aparecen en el panel

Referencia: `src/features/submissions/SubmissionEvaluationPanel.tsx:57`.

La salida contiene `question.observations`, pero la vista muestra criterios, módulos, fortalezas y prioridades sin renderizar esa colección. El docente no puede consultar allí el inventario estructurado de errores, fragmentos y explicaciones que constituye una parte central del diagnóstico solicitado.

Corrección recomendada: presentar las observaciones por pregunta, con código, fragmento, explicación y severidad, y distinguir claramente lo pendiente de comprobación docente. Primero debe corregirse la validación del hallazgo siguiente.

### 5. P1 — Se aceptan resúmenes numéricos incoherentes y observaciones sin evidencia verificada

Referencias: `supabase/functions/_shared/aiEvaluation.ts:394`, `:421` y `:507`.

El parser comprueba rangos generales de los resúmenes, pero no los recalcula a partir de los criterios reales. Una salida con un único criterio de nivel 1 aceptó resúmenes de 99 criterios y promedio 4. La interfaz presenta esos valores como propuesta de IA.

Asimismo, se admitió una observación `ORT-A` con fragmento inventado cuando solo estaba activo el criterio de pertinencia. La comprobación de evidencias revisa criterios y módulos, pero copia las observaciones sin comprobar sus fragmentos.

Corrección recomendada: calcular conteos y promedios determinísticamente; definir cómo afectan `no_aplica`, descartes y revisiones; validar la pertinencia de códigos y comprobar los fragmentos de observaciones contra la respuesta original. La revisión humana no sustituye estas garantías básicas.

### 6. P2 — Una nómina CSV de 50 estudiantes puede rechazarse por el salto final

Referencia: `src/features/roster/parseRoster.ts:98` y `:253`.

El máximo se aplica a las filas crudas antes de omitir vacías. La prueba confirmó que 50 registros se aceptan sin salto final y se rechazan al añadirlo. Es un formato habitual de CSV.

Corrección recomendada: contar registros significativos, conservando los números originales de fila y los límites independientes de tamaño de archivo y celdas.

### 7. P2 — El editor rechaza fechas válidas con zona horaria

Referencias: `src/features/assessment/assessmentSchemas.ts:96` y `src/lib/api/assessments.ts`.

El esquema usa `datetime()` sin admitir offsets. Se comprobó que rechaza `2026-09-08T12:00:00+00:00` y acepta su equivalente terminado en Z. El cargador aplica ese esquema a fechas recibidas de Supabase, por lo que evaluaciones con horario pueden fallar al reabrirse.

Corrección recomendada: aceptar offsets válidos o canonicalizar explícitamente. Añadir pruebas de guardar, cargar y editar horarios, no solo fechas nulas.

### 8. P2 — Falta recuperación de evaluaciones detenidas en running/pending

Referencia: `supabase/functions/evaluate-submission/handler.ts:120`, su `index.ts` y `src/features/submissions/EvaluationHeaderActions.tsx`.

Una evaluación marcada en curso impide nuevas solicitudes. Si la función termina abruptamente después de reservar el trabajo y antes de persistir éxito o fallo, no hay una caducidad/recuperación implementada y la interfaz no permite reintentar ese estado.

Es un riesgo de recuperación confirmado por el código, no un incidente observado: la consulta remota encontró cero trabajos pending/running con más de diez minutos.

Corrección recomendada: reserva con vencimiento y recuperación idempotente; evitar que un proceso antiguo sobrescriba el resultado de un reintento.

### 9. P2 — El techo HTTP documentado no cubre todas las funciones

Referencias: `supabase/functions/evaluate-submission/handler.ts:69`, `supabase/functions/generate-assessment-draft/handler.ts:32`, `supabase/functions/manage-assessment-access/handler.ts:142` y `README.md:71`.

Estas tres funciones leen `request.json()` sin el lector acotado usado en la superficie estudiantil. La afirmación documental de rechazo 413 generalizado es demasiado amplia. Estas rutas autentican al docente antes de esa lectura: no se identificó aquí un ataque anónimo equivalente.

Corrección recomendada: establecer límites previos a la lectura completa, probarlos y ajustar la documentación al alcance realmente desplegado.

### 10. P2 — Documentación operativa contradictoria y aviso de privacidad inexacto

El documento maestro, líneas 835–838 y 1123, aún dice que la evaluación IA no existe. El estado de progreso conserva una lista que pide implementar el lote, ya disponible, y mezcla cortes antiguos de pruebas con estado vigente. También vuelve a incluir diagnóstico longitudinal aunque el maestro limita Lite a una campaña puntual.

`src/components/layout/TeacherLayout.tsx:181` afirma que los datos de estudiantes no salen del panel. Las respuestas sí se procesan mediante servicios externos; omitir nombres del contexto no garantiza que el texto libre carezca de datos personales.

Corrección recomendada: separar historia de estado actual, conservar una única lista vigente y usar un aviso veraz sobre almacenamiento y procesamiento. Este informe no certifica cumplimiento legal ni sustituye la política de privacidad institucional.

## Qué está bien y qué existe realmente

- Autenticación docente y comprobación de rol en operaciones sensibles; estudiantes mediante acceso individual, sin cuenta convencional.
- RLS y privilegios restringidos, importación atómica y límites persistidos en base de datos, no solo en formularios.
- Gestión de cursos con borrado condicionado, archivo y restauración, conservando actividad existente.
- Captura de respuestas originales, sincronización versionada y entrega definitiva; requieren corregir la carrera de guardado señalada.
- Evaluación IA individual, resultados provisionales y revisión docente; no se envía retroalimentación estudiantil automática.
- Filtros por evaluación y paralelo, contadores y evaluación masiva con llamadas independientes por entrega. El lote admite hasta tres solicitudes simultáneas desde esa pantalla, no mezcla estudiantes y no aprueba resultados automáticamente.
- La cola del lote vive en el navegador: hay que mantener la pantalla abierta. No es un trabajo persistente de servidor ni una cuota global entre pestañas.
- Generación asistida de borradores, importación CSV/XLSX y política de pegado de fragmentos. Esta última es una restricción de interfaz, no una garantía de autoría ni un detector de IA.

## Seguridad y calidad: matices

El asesor de Supabase devolvió dos advertencias, sin errores: RPC SECURITY DEFINER expuesta a authenticated y protección de contraseñas filtradas desactivada. La primera corresponde a `import_students_to_group`: su acceso es intencional, comprueba rol docente, usa search_path vacío y tiene permisos restringidos. No se clasifica automáticamente como vulnerabilidad. La segunda es un endurecimiento de configuración pendiente de valorar, no evidencia de una cuenta comprometida.

La comprobación de archivos sensibles versionados encontró solo `.env.example` entre los patrones consultados. No se hizo una búsqueda forense exhaustiva de secretos en todo el historial.

React Doctor terminó con 70/100 y 16 advertencias. El escaneo incluyó artefactos compilados y un worktree de Claude; sus avisos sobre superficies BaaS no demuestran exposición de una clave privilegiada. El resto apunta principalmente a componentes grandes, complejidad e iteraciones. Esta puntuación no es una nota de seguridad y no sustituye los defectos reproducidos arriba.

La arquitectura sigue siendo para un docente. No debe anunciarse aislamiento multiinstitucional o multidocente sin diseñarlo y probarlo explícitamente.

## Pendientes reales y orden recomendado

1. Corregir conservación de borradores, identidad y entregas omitidas; incorporar las reproducciones como pruebas de regresión permanentes.
2. Endurecer y mostrar las observaciones de IA; calcular resúmenes verificables y probar las revisiones docentes.
3. Corregir CSV y horarios; añadir recuperación de trabajos, límites HTTP coherentes y control persistente de consumo IA. Tres solicitudes simultáneas por pantalla no limitan gasto global.
4. Ejecutar una prueba integral autorizada con datos ficticios: importar, abrir, ingresar, responder, recuperar, entregar, evaluar individualmente y por paralelo y revisar. Incluir móvil, teclado, desconexión y errores. Validar además una pequeña muestra pedagógica frente a corrección docente; las pruebas de contrato no calibran la rúbrica.
5. Construir el resumen diagnóstico por curso y estudiante y la exportación verificable. En `src/app/router.tsx:144` y `:148` siguen siendo `PlaceholderScreen`. Los contadores de entregas no sustituyen métricas de fortalezas, debilidades y cobertura.
6. Cerrar documentación operativa, aviso de datos y procedimiento de exportación/archivo al terminar la campaña.

Mantener fuera del recorte actual el detector de autoría IA, la telemetría de escritura y el seguimiento longitudinal: el alcance vigente los reserva para el futuro. No ampliar la aplicación para resolverlos durante estas correcciones.
