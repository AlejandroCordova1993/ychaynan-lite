# Estado real de progreso de Yachayñan Lite

## Corte de correcciones del 10/09/2026

La versión publicada del resumen diagnóstico y exportación es `bd84cfc`;
Verify y Deploy Pages se comprobaron correctos en la auditoría previa. Supabase
tenía 20 migraciones aplicadas, hasta `20260908195948`. Los cortes inferiores
son históricos y no sustituyen este estado.

Correcciones de este corte, **locales y todavía no desplegadas**:

- Los borradores no cuentan como omisiones ni se exportan como entregas en CSV
  o las hojas Criterios y Respuestas. Conservan su presencia en la cobertura.
- La entrega guarda un marcador de confirmación pendiente en la pestaña antes
  de enviarse. Permite recuperar el recibo después de una respuesta perdida o
  recarga sin volver a guardar respuestas sobre una entrega cerrada.
- El docente puede ver y descartar resultados IA completados pero inválidos,
  indicando un motivo. No puede aprobarlos. El original permanece intacto.
- Las observaciones se presentan como evidencia localizada, no como validación
  docente. Las consultas individuales y del listado desempatan también por ID.

La migración nueva `20260910120455_allow_discard_incomplete_evaluation.sql`
permite descartar una salida nula y mantiene las comprobaciones de rol, autor,
motivo y revisión definitiva. Está probada con PGlite; falta aplicarla en Supabase.
Los resultados inválidos que ya estuvieran revisados requieren intervención
técnica; no se altera una revisión definitiva automáticamente.

Pendientes de la auditoría que no quedan resueltos por este corte:

- Autoguardado remoto por inactividad y al recuperar conexión (sigue existiendo
  copia local y sincronización al salir del campo y antes de entregar).
- Paginación de las consultas y filtrado por paralelo en servidor para evitar
  truncamiento con poblaciones grandes.
- Cola persistente y presupuesto de consumo IA; no son parte de este arreglo.
- Validación visual y prueba piloto de extremo a extremo con el docente.
- Revisión de la dependencia transitiva de ExcelJS, sin actualización forzada.

> Bloque de resumen diagnóstico y exportación (rama `claude/resumen-diagnostico-exportacion`, 9/09/2026):
> el docente puede ver, por evaluación aplicada y paralelo, cobertura, las cuatro
> dimensiones, criterios, falencias y fortalezas con muestra mínima, observaciones IA
> frecuentes y una tabla por estudiante — distinguiendo siempre resultado provisional
> de IA de resultado revisado por el docente, y bloqueando la exportación ante
> cualquier entrega con contrato inválido en vez de omitirla en silencio. La misma
> selección se descarga en CSV (formato largo, UTF-8 con BOM) o en Excel (cinco hojas:
> Resumen, Estudiantes, Criterios, Respuestas, Observaciones). No se agregó ninguna
> migración: todo se lee bajo las políticas RLS docentes que ya existían, confirmado
> con una prueba de regresión sobre `anon` y sobre `authenticated` sin rol docente.
> Ambas pantallas ya están enlazadas desde el menú docente (antes solo se alcanzaban
> escribiendo la URL). Publicado posteriormente en `bd84cfc` tras revisión.

> Bloque operativo del 8/09/2026:
> mensajes de horario en el ingreso, edición de horarios y cierre docente,
> alta individual con prevención de duplicados y extensión idempotente de accesos
> para estudiantes tardíos u otros paralelos. No cambia datos productivos existentes.
> La migración `20260908195948_operational_assessment_management.sql` ya está aplicada
> y las funciones `validate-student` y `manage-assessment-access` actualizadas en producción.
> El frontend se publica mediante GitHub Actions con este cambio. Procedimiento y pendientes:
> [Correcciones operativas](docs/CORRECCIONES_OPERATIVAS_2026-09-08.md).
> En ese corte faltaban el resumen y la exportación; ya publicados en `bd84cfc`.

> Avance publicado del 6/09/2026 descrito abajo:
> Respuestas incorpora selección de evaluación histórica, filtro por paralelo y
> estado, contadores del grupo y evaluación de entregas pendientes por lote.
> Cada entrega se analiza independientemente, con hasta tres solicitudes
> simultáneas desde la pantalla. No hay aprobación automática ni cola persistente
> en segundo plano. Este avance se publicó en `41e7794`; aún no se ha probado con
> consumo real de IA. Alcance y límites: [Evaluación por paralelo](docs/EVALUACION_POR_PARALELO.md).
>
> El flujo estudiantil local también separa cada borrador por entrega, compara su
> versión con la guardada en servidor y exige elegir explícitamente ante un
> conflicto, sin permitir editar mientras se resuelve. Durante la entrega final se
> bloquean la edición y el cierre del diálogo. La pantalla ya muestra instrucciones,
> orientación de extensión y fecha de cierre; el salto al contenido conserva la
> ruta de `HashRouter`, y la marca del ingreso docente recuperó contraste y
> composición. Estas correcciones se publicaron en `4eebdf1`; los workflows
> **Verify** y **Deploy Pages** terminaron correctamente.
>
> Corte del 7/09/2026 desplegado en Supabase y publicado en GitHub Pages:
> el techo por respuesta es de 5.000 puntos de código Unicode en navegador,
> Edge Function, evaluación con IA y PostgreSQL. La nómina queda limitada a 50
> estudiantes por paralelo y se escribe exclusivamente mediante la RPC atómica
> `import_students_to_group`; el archivo admite como máximo 50 filas, 500 celdas
> y 5 MB. Las funciones rechazan con 413 los cuerpos sobredimensionados antes de
> ejecutar lógica de negocio y con 400 los cuerpos JSON malformados. Las
> migraciones `20260906180000_atomic_roster_import.sql` y
> `20260906181000_persisted_input_limits.sql` ya están aplicadas. La verificación
> local integrada aprobó 87 archivos y 596 pruebas, además de lint, formato,
> tipos y build.

**Fecha de corte publicado:** 8 de septiembre de 2026

**Publicación del frontend:** el commit `573740f` está en `master`; Verify y Deploy Pages terminaron correctamente y el sitio público respondió HTTP 200 con el bundle actualizado.

El corte corrige conservación del borrador ante respuestas tardías, unifica la normalización SQL de nombres para importaciones futuras, cuenta solo filas significativas de nómina, acepta fechas ISO con offset y trata preguntas sin respuesta como omisiones. También endurece el resultado IA: recalcula dimensiones, limita observaciones a criterios pertinentes, marca fragmentos no verificables, acota cuerpos HTTP docentes y permite recuperar reservas interrumpidas sin que el trabajador antiguo sobrescriba el resultado vigente. La migración aplicada no reescribe estudiantes existentes y exige diagnosticar diferencias y colisiones antes de cualquier saneamiento.

**Rama publicada:** `master`, con las correcciones de integridad integradas hasta `573740f`.

**Integración:** `codex/audit-integrity-fixes` avanzó `master` desde `96b7e0c` hasta `573740f` sin conflictos. La suite completa volvió a pasar sobre el resultado integrado antes del push.

**Proyecto Supabase:** `ychaynan-lite` (`qwqugnbmncrwcemxwutc`)

## 1. Conclusión ejecutiva

Yachayñan Lite ya superó la etapa de cimentación: existe un recorrido vertical funcional desde la creación de una evaluación hasta la consulta docente de una entrega. El estudiante entra sin cuenta, conserva sus errores tal como los escribió y no recibe evaluación ni retroalimentación.

El circuito está implementado en frontend, PostgreSQL y seis Edge Functions desplegadas, incluidas `generate-assessment-draft` y `evaluate-submission`. Producción conserva diecinueve migraciones; la última alinea identidad, reservas de evaluación y privilegios de revisión.

**El docente ya puede volver a consultar los códigos vigentes.** El código personal dejó de ser un valor aleatorio irrecuperable: el servidor lo deriva con HMAC-SHA-256 sobre `ACCESS_CODE_PEPPER`, la evaluación, el estudiante y una generación entera, de modo que la base sigue guardando solo el hash de validación. La pantalla de accesos muestra el enlace estudiantil, permite copiarlo, copiar cada código, descargar la lista en CSV compatible con Excel e imprimirla. `manage-assessment-access` se redesplegó como versión 6 el 8 de septiembre de 2026.

**Los treinta y cinco accesos ya distribuidos siguen funcionando y no fueron tocados.** Quedaron marcados como generación 0, es decir, formato anterior: sus códigos siguen siendo válidos para el estudiante, pero son matemáticamente irrecuperables para el docente porque solo existe su hash. La pantalla ofrece convertirlos con `Regenerar lista completa`, acción que exige confirmación explícita y que este corte dejó deliberadamente sin ejecutar.

**La revisión docente individual existe y está publicada.** Sobre una evaluación IA completada, el docente puede aprobar, ajustar nivel y justificación por criterio o módulo, o descartarla con motivo obligatorio. La propuesta original permanece inmutable y visible; los ajustes se guardan como lista validada en `teacher_adjustments`, y `reviewed_by`/`reviewed_at` se determinan en servidor. El estudiante sigue sin ver retroalimentación.

**El endpoint del asistente existe en producción y ya corre la versión endurecida.** `generate-assessment-draft` se redesplegó como versión 5 el 8 de septiembre de 2026. El saneamiento —modelo vigente, contrato estructurado de errores, validación estricta del envelope, límite de cuerpo y arranque sin clave— ya es el comportamiento activo en producción.

Antes del redespliegue, una solicitud real devolvía `502` sin contrato estructurado: la versión previa no manejaba con gracia la ausencia de `DEEPSEEK_API_KEY`. Tras redesplegar y antes de configurar el secreto, la misma solicitud devolvió correctamente `503 ai_not_configured` ("El asistente de IA no está configurado."), confirmando el arranque sin clave. Con `DEEPSEEK_API_KEY` configurado como secreto de Supabase, una generación real con una lectura de prueba no sensible devolvió una propuesta completa y coherente (título, propósito, instrucciones y tres preguntas con criterios), verificada visualmente en el navegador.

**La evaluación individual y la solicitud por paralelo están implementadas.** `evaluate-submission` versión 3 mantiene `verify_jwt = true`; el tratamiento de omisiones, las observaciones por criterio, los agregados recalculados y las reservas recuperables están desplegados. Cada entrega se procesa independientemente y el resultado provisional solo se muestra al docente. Sigue pendiente el control persistente de consumo. El resumen diagnóstico de campaña y la exportación (CSV y Excel) ya están implementados y probados localmente en la rama `claude/resumen-diagnostico-exportacion`, sin desplegar todavía.

## 2. Infraestructura verificada

### GitHub

- Repositorio: `AlejandroCordova1993/ychaynan-lite`.
- GitHub Pages: `https://alejandrocordova1993.github.io/ychaynan-lite/`.
- SPA basada en `HashRouter` y base `/ychaynan-lite/`; no requiere dominio propio.
- El commit técnico `507e5b5` se integró por fast-forward en `master`; los workflows **Verify** y **Deploy Pages** terminaron correctamente. El smoke público devolvió HTTP 200 para la página y el bundle, y confirmó las rutas del circuito.
- La integración de este corte (`287443f..7af6a6c`) entró en `master` por fast-forward y se publicó: **Verify** y **Deploy Pages** terminaron en `success`. El smoke público confirmó HTTP 200 y que el bundle servido contiene ambos bloques: el chunk de accesos incluye `Enlace estudiantil`, `Descargar CSV`, `Regenerar lista completa` y `Formato anterior`; el de detalle de entrega incluye `review_submission_evaluation`, `teacher_adjustments` y `no_aplica`.
- El corte de integridad `573740f` se publicó el 8 de septiembre: **Verify** y **Deploy Pages** terminaron en `success`; el sitio y el bundle principal respondieron HTTP 200 y el bundle contiene el aviso actualizado de procesamiento por IA.

### Supabase

- Región: `sa-east-1`.
- Diecinueve migraciones locales y remotas coincidentes, verificadas con `supabase migration list` después de aplicar `20260908134926_align_identity_and_submission_contracts.sql`.
- `db lint` sobre `public`: sin errores en la última comprobación; no se volvió a ejecutar en este corte porque requiere Docker, que no está disponible en la estación actual.
- Registro público deshabilitado.
- Rol docente exigido mediante `app_metadata.role = teacher`.
- Tres secretos operativos configurados sin persistir ni imprimir su valor privado: pepper de códigos, orígenes CORS y sesión máxima de 180 minutos.
- La variable pública VITE_SUPABASE_ANON_KEY del repositorio GitHub se actualizó con la clave vigente para el próximo build de Pages.

### Edge Functions activas

| Función                     | Estado | Verificación                                                                                                                                        |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manage-assessment-access`  | activa | versión 6; JWT obligatorio, rol docente comprobado dentro de la función, cuerpo acotado y rechazo sin sesión HTTP 401 verificado                    |
| `validate-student`          | activa | versión 5, sin JWT de cuenta; normalización Unicode alineada, validación de identidad, código y límites; rechazo sintético 400 verificado           |
| `save-draft`                | activa | versión 4; sesión opaca, versión optimista, preservación textual y lectura HTTP acotada; smokes 413 y 400 aprobados                                 |
| `submit-assessment`         | activa | versión 4; sesión opaca, confirmación explícita, idempotencia, inmutabilidad y lectura HTTP acotada; smokes 413 y 400 aprobados                     |
| `generate-assessment-draft` | activa | versión 5; JWT obligatorio, contrato y cuerpo acotados, clave configurada y rechazo sin sesión HTTP 401 verificado                                  |
| `evaluate-submission`       | activa | versión 3; JWT obligatorio, omisiones y observaciones validadas, reservas recuperables, límite de 5.000 por respuesta y rechazo sin sesión HTTP 401 |

Son seis funciones activas. En este corte, smokes remotos no destructivos comprobaron 413 ante 100.000 bytes y 400 ante JSON malformado en `validate-student`, `save-draft` y `submit-assessment`, además del rechazo 401 de `evaluate-submission` sin sesión docente. No se crearon ni modificaron datos de prueba en producción. La revisión docente no necesitó ninguna Edge Function nueva: se resuelve con una RPC bajo RLS.

El asistente de borradores ya se ejercitó contra el proveedor real: con `DEEPSEEK_API_KEY` configurado como secreto de Supabase, una llamada de prueba con una lectura no sensible devolvió una propuesta completa. El comportamiento descrito en la guía técnica ahora corresponde también a lo que responde producción, no solo a la rama.

`evaluate-submission` está desplegada como versión 3. Está registrada con `verify_jwt = true`, vuelve a comprobar `app_metadata.role = teacher`, consulta la entrega mediante `service_role` solo dentro de la función y no incorpora la tabla `students` al contexto enviado al proveedor. Falta comprobar el camino autenticado y la persistencia con una entrega ficticia.

Procedimiento de este corte completado, en este orden:

1. integrar la rama de correcciones en `master` — hecho por fast-forward hasta `573740f`;
2. ejecutar la verificación completa — hecho: 87 archivos, 623 pruebas, lint, formato, tipos y build en verde;
3. aplicar `20260908134926_align_identity_and_submission_contracts.sql` — hecho; las 19 migraciones coinciden entre local y remoto;
4. desplegar las cuatro funciones afectadas — hecho: `validate-student` v5, `manage-assessment-access` v6, `generate-assessment-draft` v5 y `evaluate-submission` v3;
5. ejecutar smokes remotos de rechazo y publicar Pages — hecho; Verify y Deploy Pages finalizaron en `success`, y el sitio respondió HTTP 200 con el bundle actualizado.

## 3. Superficie funcional implementada

### Docente

- iniciar sesión y cambiar la contraseña;
- cerrar sesión incluso ante una cuenta autenticada sin rol docente;
- crear paralelos e importar la nómina;
- crear y guardar una evaluación borrador con lectura y una a cuatro preguntas;
- pedir a la IA un borrador de preguntas abiertas, revisar la propuesta completa y aplicarla o descartarla; nada se guarda ni se abre sin confirmación;
- congelar la rúbrica operativa dentro de la evaluación;
- abrir atómicamente una evaluación para un paralelo;
- generar, volver a consultar tras recargar, copiar, regenerar y desbloquear códigos personales;
- ver y copiar el enlace estudiantil de la evaluación abierta, válido tanto en local como en GitHub Pages;
- descargar la nómina completa en CSV con BOM UTF-8 —nombre, paralelo, código, estado y enlace— e imprimirla; los valores que empiezan por `=`, `+`, `-` o `@` se neutralizan para que la hoja de cálculo no ejecute fórmulas provenientes de los datos;
- distinguir en la tabla el paralelo, el estado del acceso y el estado de entrega, y reconocer los códigos de formato anterior;
- convertir los códigos heredados con una acción explícita que informa cuántos códigos cambian y cuántas sesiones activas se cierran antes de confirmar;
- consultar el estado de los accesos;
- listar entregas y abrir el detalle íntegro de cada estudiante;
- solicitar una evaluación individual con IA y consultar dimensiones, criterios, evidencias, fortalezas, prioridades y limitaciones como resultado provisional;
- aprobar, ajustar por criterio o módulo, o descartar con motivo obligatorio ese resultado provisional, con confirmación explícita y sin alterar la propuesta original.

### Estudiante

- entrar sin cuenta con nombre completo, paralelo y código personal;
- ignorar mayúsculas y tildes vocálicas al comparar el nombre, conservando la diferencia entre `n` y `ñ`;
- resolver homónimos mediante el código personal;
- recibir una única sesión temporal revocable;
- ver solo la lectura y las preguntas, nunca la rúbrica;
- guardar localmente y sincronizar de forma optimista;
- comparar versiones si existe un conflicto, sin mezcla automática;
- esperar un autoguardado en curso antes de la entrega definitiva;
- cuando la política esté restringida, pegar únicamente fragmentos continuos de la lectura de hasta 40 palabras, insertados automáticamente entre comillas;
- entregar una sola vez y obtener un comprobante local;
- no recibir puntaje, análisis de IA ni retroalimentación.

## 4. Datos y seguridad

El modelo conserva las diez tablas del dominio: `groups`, `students`, `assessments`, `questions`, `assessment_access`, `student_sessions`, `access_rate_limits`, `submissions`, `responses` y `ai_evaluations`.

Las migraciones 10 a 13 añadieron las operaciones transaccionales del circuito vertical: creación/apertura de evaluación, acceso y sesión estudiantil, borrador versionado y entrega final. RLS impide que `anon` consulte directamente las tablas; las operaciones estudiantiles pasan por funciones con `service_role` solo en servidor.

La migración 14 añadió `assessment_access.code_generation` con restricción de no negatividad y tres funciones `SECURITY INVOKER` con `search_path` fijo, revocadas a `public`, `anon` y `authenticated` y concedidas solo a `service_role`: apertura con códigos recuperables, regeneración individual que exige una generación mayor a la vigente y conversión atómica de los códigos heredados. Las funciones anteriores se conservan para no abrir una ventana incompatible durante el despliegue. La regeneración revoca las sesiones vigentes del acceso sin borrar `submissions` ni `responses`, y nunca opera sobre una entrega ya enviada.

La migración 15 añadió la revisión docente sobre `ai_evaluations`: una RPC `SECURITY INVOKER` bajo RLS concedida a `authenticated`, más un trigger que exige rol docente, evaluación completada, criterios existentes en la salida original, niveles 1–4 o `no_aplica`, razones no vacías y una revisión irreversible una vez cerrada. Convive con el guard previo, que sigue protegiendo `result_json` y el resto de la salida original.

Controles implementados:

- hashes HMAC de códigos con pepper privado;
- códigos derivados de forma determinista dentro de la Edge Function; el secreto no llega al navegador, al repositorio ni a ninguna variable `VITE_*`, y ningún código se almacena en texto claro;
- el código solo se devuelve al docente si la derivación coincide con el hash guardado; las entregas enviadas o revocadas nunca lo exponen;
- código diferente para cada estudiante;
- enfriamiento por acceso y limitación adicional por huella;
- revocación de sesiones anteriores al validar un nuevo ingreso;
- token de sesión almacenado únicamente como hash;
- actualización optimista mediante `draft_version`;
- clave de entrega del cliente e idempotencia;
- respuesta final inmutable;
- mensajes estudiantiles genéricos para no revelar matrículas;
- CORS limitado a desarrollo local y GitHub Pages.

## 5. Rúbrica

La rúbrica integral v1.1 es la versión operativa congelada en nuevas evaluaciones. Contiene doce criterios centrales y módulos opcionales por pregunta. Los documentos de calibración revisados con Claude son propuestas pedagógicas y no sustituyen silenciosamente la versión operativa.

La evaluación individual con IA usa la rúbrica congelada, criterios y módulos activos por pregunta, valida una salida estructurada y contrasta las evidencias mediante normalización Unicode sin alterar los originales. El resultado nace en estado `completed` y es provisional. Desde este corte, el docente puede cerrarlo como `reviewed` o `discarded`; los niveles ajustados conviven con la propuesta original, que no se modifica. El resumen original de IA no debe reutilizarse como promedio definitivo cuando existan ajustes docentes, y los resultados descartados deben excluirse de futuros agregados.

## 6. Verificación local

### Corte publicado del 8 de septiembre de 2026 — commit `573740f`

La revisión posterior corrigió la plantilla de observaciones por pregunta (prompt `evaluation-v1.1`), incorporó `AMB` al criterio de precisión léxica y alineó la composición Unicode NFC y los espacios de nombres entre SQL y TypeScript. La compatibilidad con evaluaciones antiguas quedó expresamente fuera de este recorte por decisión del docente: no existen evaluaciones anteriores que conservar. Estas correcciones están desplegadas en Supabase.

La auditoría integral se tradujo en correcciones locales de integridad antes de cualquier despliegue. Pasaron `npm run lint`, `npm run format:check`, `npm run typecheck` y `npm run build`. También pasaron por bloques 18 archivos y 208 pruebas de Edge Functions, 12 archivos y 99 pruebas focalizadas de interfaz/API, y 124 pruebas de base de datos y migraciones. React Doctor terminó con 89/100 y sin hallazgos. `git diff --check` quedó limpio.

La suite completa posterior al último ajuste terminó con código 0: 87 archivos y 623 pruebas. También pasaron lint, formato, tipos y build de producción con 205 módulos transformados.

Las correcciones incluyen: protección contra respuestas tardías del autoguardado, normalización SQL equivalente, importación de 50 filas significativas, fechas ISO con offset, omisiones explícitas, resultados de IA recalculados y verificables, recuperación de evaluaciones vencidas mediante lease, límites de cuerpo autenticados, privilegio mínimo sobre `ai_evaluations` y documentación operativa coherente.

La puerta de calidad local sobre la integración terminó con código 0: formato, ESLint sin advertencias permitidas, TypeScript, 77 archivos y 419 pruebas aprobadas, y build de producción con 193 módulos transformados. El mismo comando volvió a pasar en CI sobre `7af6a6c`.

Las pruebas cubren contratos, RLS, migraciones, normalización de identidad, sesiones, códigos, borradores, conflictos, idempotencia, privacidad de la carga estudiantil, interfaz docente y entrega. Los códigos recuperables añaden cobertura sobre derivación determinista, cambio de código al aumentar la generación, autorización docente de `list`, `regenerate` y `rotateLegacy`, rechazo de `anon` y `authenticated` sobre las funciones SQL, conversión atómica de accesos heredados, revocación de sesiones al regenerar, preservación de borradores, prohibición de regenerar entregas enviadas, escape CSV con neutralización de fórmulas, enlace correcto en local y en GitHub Pages, e ingreso estudiantil real con un código derivado. La revisión docente añade cobertura sobre validación de ajustes, motivo obligatorio al descartar, revisión irreversible y conflicto entre pestañas. La evaluación IA añade cobertura sobre autenticación y rol, aislamiento de identidad, contrato estricto de resultados, criterios/módulos permitidos, niveles, dimensiones, observaciones, verificación de evidencias, timeout, respuesta truncada, fallo seguro, reclamación idempotente y recuperación de estados `failed` o reservas vencidas.

React Doctor sobre la integración terminó con 88/100 y cinco advertencias, ninguna de ellas un error: tres preexistentes en `AssessmentEditorScreen` —iteraciones encadenadas, búsqueda en arreglo dentro de un bucle y componente grande— y dos de complejidad de control de flujo en `SubmissionEvaluationPanel` y `TeacherEvaluationReview`, introducidas por el bloque de revisión docente y ya reconocidas por su autor como deuda de mantenibilidad. La pantalla de accesos no dejó hallazgos: sus dos advertencias iniciales se resolvieron extrayendo la tabla, el panel de conversión y el formulario de apertura a componentes propios.

La validación visual automatizada continúa pendiente: Playwright no forma parte de las dependencias del proyecto y no se amplió el stack.

La auditoría posterior a `6ff297d` detectó tres incumplimientos, ya corregidos y cubiertos por pruebas:

- la propuesta solo se ocultaba al comparar la firma final, de modo que cambiar un dato y restaurarlo podía revivirla o admitir una respuesta tardía. Ahora cada solicitud queda atada a una revisión monótona y el resultado se elimina de verdad;
- la verificación de la sesión docente corría fuera del `try`, así que una excepción de Supabase o de red escapaba del handler. Ahora queda dentro del contrato estructurado;
- un `200` con envelope ilegible se clasificaba como indisponibilidad del proveedor en lugar de propuesta inválida.

La segunda corrección, `212ffef`, cerró tres defectos residuales posteriores a `894089e`:

- un `200` cuyo cuerpo era JSON válido pero estructuralmente inválido —`null`, un escalar o un arreglo— reventaba al leer `choices` y el catch genérico lo devolvía como `provider_unavailable`. Ahora la forma del envelope se valida explícitamente antes de acceder a sus propiedades y se clasifica como `invalid_ai_response`; un error HTTP o una caída real de red siguen siendo `provider_unavailable`;
- cambiar lectura, propósito, cantidad o foco durante una generación invalidaba la solicitud pero dejaba el botón deshabilitado hasta que respondiera o venciera su espera de hasta 90 segundos, de modo que el aviso pedía «genera una nueva» sin permitirlo. El booleano de carga se sustituyó por la revisión activa de la solicitud, así que una solicitud obsoleta ya no bloquea la interfaz ni puede alterar la carga, el error ni la propuesta de una más reciente. La cancelación es lógica: no se cancela la petición HTTP;
- el documento maestro presentaba `manage-assessment-access` y el conflicto optimista como trabajo futuro cuando ambos ya estaban implementados.

Este corte añade el detalle de interfaz que ese cambio hizo alcanzable: con una solicitud obsoleta resuelta y otra vigente en curso, el aviso de propuesta obsoleta podía quedar visible junto a la propuesta nueva ya aplicable. Ahora un resultado vigente apaga el aviso, y descartar esa propuesta no lo resucita.

La prueba de navegación `abre el editor real desde el menú docente` dejó de ser intermitente. Tenía dos defectos: el cliente falso de `App.test.tsx` no expone `from`, así que el editor emitía `TypeError: client.from is not a function`; y la aserción competía contra la importación dinámica del editor, porque React Router navega dentro de una transición y React conserva la pantalla anterior mientras se resuelve el chunk de `React.lazy`. Se corrigieron aislando `getDraftAssessment` y precargando el módulo, sin ampliar tiempos de espera.

## 7. Estado por fase

| Fase                             | Estado real                                                                       | Pendiente principal                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Infraestructura y seguridad base | completa para el corte actual                                                     | vigilancia operativa y ensayo controlado                                            |
| Circuito vertical sin IA         | implementado y publicado                                                          | ejecutar un ensayo completo con datos ficticios controlados                         |
| Calibración pedagógica           | documental avanzada                                                               | corpus anonimizado, doble evaluación y ajuste de umbrales                           |
| Generación de borradores con IA  | implementada, desplegada en versión endurecida y probada con clave real           | añadir control de consumo por docente                                               |
| Calificación con IA              | individual, revisión y lote por paralelo implementados y desplegados              | ejecutar smoke autenticado con una entrega ficticia                                 |
| Resumen diagnóstico de campaña   | implementado y probado localmente (rama `claude/resumen-diagnostico-exportacion`) | desplegar y validar con datos reales                                                |
| Exportación y cierre             | CSV y Excel implementados y probados localmente                                   | desplegar; el procedimiento de retiro/archivo del cierre de campaña sigue pendiente |

## 8. Pendientes priorizados

1. Comprobar con la sesión docente real, en el sitio publicado, los tres caminos que este corte no pudo verificar sin credenciales: que la pantalla de accesos vuelve a mostrar los códigos tras recargar, que el CSV descargado abre correctamente en Excel, y que la revisión docente guarda ajustes y descartes sobre una evaluación completada.
2. Decidir cuándo convertir los treinta y cinco códigos heredados con `Regenerar lista completa`. La acción invalida los códigos ya distribuidos y cierra las sesiones activas, conservando borradores y respuestas; queda a la espera de una decisión del docente.
3. Ejecutar el diagnóstico de colisiones de nombres antes de cualquier saneamiento de estudiantes existentes; la migración y las funciones ya están desplegadas.
4. Ejecutar un ensayo autenticado con datos ficticios del circuito completo: acceso, reconexión, autoguardado, pegado restringido, entrega, evaluación individual, lote, recuperación y revisión docente.
5. Añadir un control persistente de consumo por docente para las dos funciones de IA. No puede resolverse con memoria del proceso Edge porque cada invocación puede ejecutarse en una instancia distinta.
6. ~~Construir el resumen diagnóstico de la campaña sin reducir la escritura a una sola nota, recalculado a partir de niveles finales y excluyendo resultados descartados.~~ Hecho e implementado y probado localmente (rama `claude/resumen-diagnostico-exportacion`); falta desplegarlo.
7. ~~Implementar exportación y respaldo antes de una campaña real.~~ La exportación en CSV y Excel ya está implementada y probada localmente; falta desplegarla. El respaldo/archivo de cierre de campaña sigue sin implementar.
8. Calibrar la rúbrica con textos anonimizados de estudiantes de 15 a 17 años.
9. Volver a ejecutar `supabase db lint` e introspección remota del esquema cuando haya Docker disponible.
10. Reducir la complejidad de `SubmissionEvaluationPanel` y `TeacherEvaluationReview`, y la deuda preexistente de `AssessmentEditorScreen`.

## 9. Riesgos abiertos

- No se ha realizado todavía un ensayo de aula ni una prueba E2E completa alojada con datos ficticios.
- El rate limit incluye una huella aportada por el cliente; el enfriamiento por acceso personal reduce el abuso, pero debe observarse bajo redes escolares compartidas.
- El endurecimiento de evaluación del 8 de septiembre está desplegado. Falta un ensayo autenticado documentado del circuito completo con datos ficticios.
- Los treinta y cinco códigos ya distribuidos son irrecuperables para el docente hasta que decida convertirlos. Siguen siendo válidos para el estudiante, pero la pantalla los muestra como formato anterior y sin valor; esto es el comportamiento aprobado en el diseño, no un defecto.
- La revisión docente es definitiva en este primer bloque: no existe reapertura ni historial de revisiones.
- No existe una cola persistente en segundo plano para el lote; la pantalla debe permanecer abierta. El resumen diagnóstico y la exportación (CSV/Excel) ya están implementados y probados localmente (rama `claude/resumen-diagnostico-exportacion`); falta desplegarlos y validarlos con datos reales.
- El asistente no tiene todavía ningún límite de consumo por docente: con `DEEPSEEK_API_KEY` ya configurado y la función respondiendo en producción, el costo depende únicamente de la disciplina de uso hasta que exista un control persistente (pendiente 3 de la sección anterior).
- Las respuestas son datos educativos personales: no deben entrar al repositorio, logs públicos ni servicios de IA sin la política y anonimización definidas.
- La validación visual automatizada del nuevo panel no se repitió en este corte. Las pruebas de componente están en verde y React Doctor obtuvo 89/100, sin hallazgos en el código cambiado.

## 10. Criterio de cierre del MVP diagnóstico

El MVP podrá considerarse listo para uso real cuando el circuito alojado pase un ensayo controlado, la evaluación docente con IA tenga validación pedagógica, exista exportación recuperable y el resumen de campaña permita planificar por estudiante y paralelo sin exponer resultados al estudiante. La comparación longitudinal queda fuera de Lite y corresponde a la futura integración con Ecuafuturo.

Este documento debe actualizarse después de cada cambio funcional o de infraestructura. Código, pruebas locales y despliegue remoto son evidencias distintas; ninguna sustituye a las otras.
