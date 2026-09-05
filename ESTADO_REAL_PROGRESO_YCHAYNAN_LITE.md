# Estado real de progreso de Ychayñan Lite

**Fecha de corte:** 5 de septiembre de 2026

**Rama evaluada:** `master`, en `7af6a6c`, publicada

**Commits revisados:** este corte integra y publica dos bloques independientes construidos sobre `287443f`: códigos estudiantiles recuperables (`e883486`) y revisión docente de evaluaciones IA (`e7b615e`). Ambos entraron por fusiones explícitas (`64813d7` y `7af6a6c`) desde la rama de integración `claude/integracion-codigos-y-revision`, sin conflictos. El control de pegado del corte anterior quedó publicado con esta misma integración.

**Proyecto Supabase:** `ychaynan-lite` (`qwqugnbmncrwcemxwutc`)

## 1. Conclusión ejecutiva

Ychayñan Lite ya superó la etapa de cimentación: existe un recorrido vertical funcional desde la creación de una evaluación hasta la consulta docente de una entrega. El estudiante entra sin cuenta, conserva sus errores tal como los escribió y no recibe evaluación ni retroalimentación.

El circuito está implementado en frontend, PostgreSQL y seis Edge Functions desplegadas, incluidas `generate-assessment-draft` y `evaluate-submission`. Las quince migraciones locales coinciden con el proyecto remoto: este corte añadió y aplicó dos, `20260904120000_recoverable_access_codes` y `20260905013429_teacher_evaluation_review`.

**El docente ya puede volver a consultar los códigos vigentes.** El código personal dejó de ser un valor aleatorio irrecuperable: el servidor lo deriva con HMAC-SHA-256 sobre `ACCESS_CODE_PEPPER`, la evaluación, el estudiante y una generación entera, de modo que la base sigue guardando solo el hash de validación. La pantalla de accesos muestra el enlace estudiantil, permite copiarlo, copiar cada código, descargar la lista en CSV compatible con Excel e imprimirla. `manage-assessment-access` se redesplegó como versión 4 el 5 de septiembre de 2026 a las 02:03 UTC.

**Los treinta y cinco accesos ya distribuidos siguen funcionando y no fueron tocados.** Quedaron marcados como generación 0, es decir, formato anterior: sus códigos siguen siendo válidos para el estudiante, pero son matemáticamente irrecuperables para el docente porque solo existe su hash. La pantalla ofrece convertirlos con `Regenerar lista completa`, acción que exige confirmación explícita y que este corte dejó deliberadamente sin ejecutar.

**La revisión docente individual existe y está publicada.** Sobre una evaluación IA completada, el docente puede aprobar, ajustar nivel y justificación por criterio o módulo, o descartarla con motivo obligatorio. La propuesta original permanece inmutable y visible; los ajustes se guardan como lista validada en `teacher_adjustments`, y `reviewed_by`/`reviewed_at` se determinan en servidor. El estudiante sigue sin ver retroalimentación.

**El endpoint del asistente existe en producción y ya corre la versión endurecida.** `generate-assessment-draft` se redesplegó el 3 de septiembre de 2026 a las 22:51 UTC con el código de `f04abba` (versión 4 de la función, confirmada con `supabase functions list`). El saneamiento —modelo vigente, contrato estructurado de errores, validación estricta del envelope y arranque sin clave— ya es el comportamiento observado en producción, no solo en la rama local.

Antes del redespliegue, una solicitud real devolvía `502` sin contrato estructurado: la versión previa no manejaba con gracia la ausencia de `DEEPSEEK_API_KEY`. Tras redesplegar y antes de configurar el secreto, la misma solicitud devolvió correctamente `503 ai_not_configured` ("El asistente de IA no está configurado."), confirmando el arranque sin clave. Con `DEEPSEEK_API_KEY` configurado como secreto de Supabase, una generación real con una lectura de prueba no sensible devolvió una propuesta completa y coherente (título, propósito, instrucciones y tres preguntas con criterios), verificada visualmente en el navegador.

**La evaluación individual con IA está implementada y su función ya fue desplegada.** `evaluate-submission` está activa como versión 1 con `verify_jwt = true`; procesa una entrega completa, conserva trazabilidad en `ai_evaluations` y entrega un resultado provisional solo al docente. Una solicitud sin autenticación fue rechazada con HTTP 401. Sigue faltando el smoke autenticado con una entrega ficticia, además de la aprobación/edición docente, el lote reanudable, las métricas longitudinales y la exportación.

## 2. Infraestructura verificada

### GitHub

- Repositorio: `AlejandroCordova1993/ychaynan-lite`.
- GitHub Pages: `https://alejandrocordova1993.github.io/ychaynan-lite/`.
- SPA basada en `HashRouter` y base `/ychaynan-lite/`; no requiere dominio propio.
- El commit técnico `507e5b5` se integró por fast-forward en `master`; los workflows **Verify** y **Deploy Pages** terminaron correctamente. El smoke público devolvió HTTP 200 para la página y el bundle, y confirmó las rutas del circuito.
- La integración de este corte (`287443f..7af6a6c`) entró en `master` por fast-forward y se publicó: **Verify** y **Deploy Pages** terminaron en `success`. El smoke público confirmó HTTP 200 y que el bundle servido contiene ambos bloques: el chunk de accesos incluye `Enlace estudiantil`, `Descargar CSV`, `Regenerar lista completa` y `Formato anterior`; el de detalle de entrega incluye `review_submission_evaluation`, `teacher_adjustments` y `no_aplica`.

### Supabase

- Región: `sa-east-1`.
- Quince migraciones locales y remotas coincidentes, verificadas con `supabase migration list` después de aplicar las dos nuevas.
- `db lint` sobre `public`: sin errores en la última comprobación; no se volvió a ejecutar en este corte porque requiere Docker, que no está disponible en la estación actual.
- Registro público deshabilitado.
- Rol docente exigido mediante `app_metadata.role = teacher`.
- Tres secretos operativos configurados sin persistir ni imprimir su valor privado: pepper de códigos, orígenes CORS y sesión máxima de 180 minutos.
- La variable pública VITE_SUPABASE_ANON_KEY del repositorio GitHub se actualizó con la clave vigente para el próximo build de Pages.

### Edge Functions activas

| Función                     | Estado | Verificación                                                                                                                                                                                                         |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manage-assessment-access`  | activa | versión 4, desplegada el 5/09/2026 a las 02:03 UTC; JWT obligatorio, rol docente comprobado dentro de la función, códigos derivados nunca almacenados en claro; rechazo anónimo HTTP 401 y preflight 204 verificados |
| `validate-student`          | activa | sin JWT de cuenta; valida identidad, código y límites antes de emitir sesión opaca                                                                                                                                   |
| `save-draft`                | activa | sesión opaca, versión optimista y preservación textual                                                                                                                                                               |
| `submit-assessment`         | activa | sesión opaca, confirmación explícita, idempotencia e inmutabilidad                                                                                                                                                   |
| `generate-assessment-draft` | activa | endurecida y verificada: versión 4, código de `f04abba`, redesplegada el 3/09/2026 a las 22:51 UTC; generación real probada con clave configurada                                                                    |
| `evaluate-submission`       | activa | versión 1, JWT obligatorio, rol docente verificado dentro de la función y rechazo anónimo HTTP 401                                                                                                                   |

Son seis funciones activas. Los smokes remotos no destructivos comprobaron CORS en el circuito estudiantil, el rechazo HTTP 401 de `evaluate-submission` sin sesión docente y, en este corte, el rechazo HTTP 401 de `manage-assessment-access` sin JWT junto con su preflight HTTP 204 desde el origen publicado. No se crearon ni modificaron datos de prueba en producción. La revisión docente no necesitó ninguna Edge Function nueva: se resuelve con una RPC bajo RLS.

El asistente de borradores ya se ejercitó contra el proveedor real: con `DEEPSEEK_API_KEY` configurado como secreto de Supabase, una llamada de prueba con una lectura no sensible devolvió una propuesta completa. El comportamiento descrito en la guía técnica ahora corresponde también a lo que responde producción, no solo a la rama.

`evaluate-submission` fue desplegada desde `c837000` como versión 1. Está registrada con `verify_jwt = true`, vuelve a comprobar `app_metadata.role = teacher`, consulta la entrega mediante `service_role` solo dentro de la función y no incorpora la tabla `students` al contexto enviado al proveedor. Falta comprobar el camino autenticado y la persistencia con una entrega ficticia.

Procedimiento completado, en este orden:

1. desplegar desde el código de la rama con las correcciones — hecho (`212ffef`, `f04abba`); la rama en sí sigue sin fusionarse a `master` (ver pendiente 1 más abajo);
2. ejecutar la verificación completa — `npm run verify` en verde; la comprobación más reciente aprueba 360 pruebas;
3. desplegar nuevamente `generate-assessment-draft` — hecho, versión 4;
4. configurar `DEEPSEEK_API_KEY` en los secretos de Supabase — hecho;
5. realizar un smoke con una lectura no sensible — hecho, propuesta generada correctamente.

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

La puerta de calidad local sobre la integración terminó con código 0: formato, ESLint sin advertencias permitidas, TypeScript, 77 archivos y 419 pruebas aprobadas, y build de producción con 193 módulos transformados. El mismo comando volvió a pasar en CI sobre `7af6a6c`.

Las pruebas cubren contratos, RLS, migraciones, normalización de identidad, sesiones, códigos, borradores, conflictos, idempotencia, privacidad de la carga estudiantil, interfaz docente y entrega. Los códigos recuperables añaden cobertura sobre derivación determinista, cambio de código al aumentar la generación, autorización docente de `list`, `regenerate` y `rotateLegacy`, rechazo de `anon` y `authenticated` sobre las funciones SQL, conversión atómica de accesos heredados, revocación de sesiones al regenerar, preservación de borradores, prohibición de regenerar entregas enviadas, escape CSV con neutralización de fórmulas, enlace correcto en local y en GitHub Pages, e ingreso estudiantil real con un código derivado. La revisión docente añade cobertura sobre validación de ajustes, motivo obligatorio al descartar, revisión irreversible y conflicto entre pestañas. La evaluación IA añade cobertura sobre autenticación y rol, aislamiento de identidad, contrato estricto de resultados, criterios/módulos permitidos, niveles, dimensiones, observaciones, verificación de evidencias, timeout, respuesta truncada, fallo seguro, reclamación idempotente y reintento solo desde `failed`.

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

| Fase                             | Estado real                                                             | Pendiente principal                                           |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Infraestructura y seguridad base | completa para el corte actual                                           | vigilancia operativa y ensayo controlado                      |
| Circuito vertical sin IA         | implementado y publicado                                                | ejecutar un ensayo completo con datos ficticios controlados   |
| Calibración pedagógica           | documental avanzada                                                     | corpus anonimizado, doble evaluación y ajuste de umbrales     |
| Generación de borradores con IA  | implementada, desplegada en versión endurecida y probada con clave real | añadir control de consumo por docente                         |
| Calificación con IA              | función individual desplegada; revisión docente publicada               | smoke autenticado, lote reanudable                            |
| Diagnóstico longitudinal         | pendiente                                                               | métricas por criterio, estudiante, paralelo y momento del año |
| Exportación y cierre             | pendiente                                                               | CSV/JSON, manifiesto y procedimiento de retiro/archivo        |

## 8. Pendientes priorizados

1. Comprobar con la sesión docente real, en el sitio publicado, los tres caminos que este corte no pudo verificar sin credenciales: que la pantalla de accesos vuelve a mostrar los códigos tras recargar, que el CSV descargado abre correctamente en Excel, y que la revisión docente guarda ajustes y descartes sobre una evaluación completada.
2. Decidir cuándo convertir los treinta y cinco códigos heredados con `Regenerar lista completa`. La acción invalida los códigos ya distribuidos y cierra las sesiones activas, conservando borradores y respuestas; queda a la espera de una decisión del docente.
3. Publicar y probar manualmente el control de pegado restringido, además de corregir cualquier hallazgo del ensayo de acceso, reconexión, autoguardado y entrega antes de usar estudiantes reales.
4. Realizar un smoke autenticado de `evaluate-submission` con una entrega ficticia, verificando que la función remota persiste un resultado válido sin enviar identidad estudiantil.
5. Añadir la evaluación por lote desde el panel con un máximo de tres solicitudes simultáneas y reanudación desde la persistencia existente.
6. Añadir un control persistente de consumo por docente para las dos funciones de IA. No puede resolverse con memoria del proceso Edge porque cada invocación puede ejecutarse en una instancia distinta.
7. Crear métricas diagnósticas y longitudinales que no reduzcan la escritura a una sola nota, recalculadas a partir de los niveles finales y excluyendo los resultados descartados.
8. Implementar exportación y respaldo antes de una campaña real.
9. Calibrar la rúbrica con textos anonimizados de estudiantes de 15 a 17 años.
10. Volver a ejecutar `supabase db lint` e introspección remota del esquema cuando haya Docker disponible; en este corte solo se confirmó la aplicación de las dos migraciones por su registro en el historial remoto.
11. Reducir la complejidad de `SubmissionEvaluationPanel` y `TeacherEvaluationReview`, y la deuda preexistente de `AssessmentEditorScreen`.

## 9. Riesgos abiertos

- No se ha realizado todavía un ensayo de aula ni una prueba E2E completa alojada con datos ficticios.
- El rate limit incluye una huella aportada por el cliente; el enfriamiento por acceso personal reduce el abuso, pero debe observarse bajo redes escolares compartidas.
- La función de evaluación individual con IA está desplegada, pero todavía no hay evidencia de una ejecución autenticada contra una entrega real o ficticia. Lo mismo aplica a la consulta docente de códigos, a la descarga del CSV y a la revisión docente: su código está publicado y sus pruebas pasan, pero ningún camino autenticado se ejercitó en producción porque hacerlo exige la sesión del docente.
- Los treinta y cinco códigos ya distribuidos son irrecuperables para el docente hasta que decida convertirlos. Siguen siendo válidos para el estudiante, pero la pantalla los muestra como formato anterior y sin valor; esto es el comportamiento aprobado en el diseño, no un defecto.
- La revisión docente es definitiva en este primer bloque: no existe reapertura ni historial de revisiones.
- El lote, el dashboard y la exportación siguen ausentes.
- El asistente no tiene todavía ningún límite de consumo por docente: con `DEEPSEEK_API_KEY` ya configurado y la función respondiendo en producción, el costo depende únicamente de la disciplina de uso hasta que exista un control persistente (pendiente 3 de la sección anterior).
- Las respuestas son datos educativos personales: no deben entrar al repositorio, logs públicos ni servicios de IA sin la política y anonimización definidas.
- La validación visual automatizada del nuevo panel no pudo ejecutarse por fallo del navegador integrado y ausencia de Playwright; las pruebas de componente y React Doctor sí están en verde.

## 10. Criterio de cierre del MVP diagnóstico

El MVP podrá considerarse listo para uso real cuando el circuito alojado pase un ensayo controlado, la evaluación docente con IA tenga validación pedagógica, exista exportación recuperable y el dashboard permita comparar avances sin exponer resultados al estudiante.

Este documento debe actualizarse después de cada cambio funcional o de infraestructura. Código, pruebas locales y despliegue remoto son evidencias distintas; ninguna sustituye a las otras.
