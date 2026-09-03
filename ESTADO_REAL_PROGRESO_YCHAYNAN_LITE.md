# Estado real de progreso de Ychayñan Lite

**Fecha de corte:** 3 de septiembre de 2026

**Rama evaluada:** `claude/ai-integration-hardening`, sobre la base `d1533cc`

**Commits revisados:** endurecimiento `6ff297d`, primera corrección `894089e` y este corte, que añade una corrección posterior sobre `894089e`.

**Proyecto Supabase:** `ychaynan-lite` (`qwqugnbmncrwcemxwutc`)

## 1. Conclusión ejecutiva

Ychayñan Lite ya superó la etapa de cimentación: existe un recorrido vertical funcional desde la creación de una evaluación hasta la consulta docente de una entrega. El estudiante entra sin cuenta, conserva sus errores tal como los escribió y no recibe evaluación ni retroalimentación.

El circuito está implementado en frontend, PostgreSQL y cinco Edge Functions desplegadas, incluida `generate-assessment-draft`. Las trece migraciones locales coinciden con el proyecto remoto y este corte no añadió ninguna.

**El endpoint del asistente existe en producción, pero su versión remota es anterior al endurecimiento.** La versión desplegada se actualizó alrededor de las 06:24 del 2 de septiembre de 2026, y el commit de endurecimiento `6ff297d` se creó alrededor de las 16:23 del mismo día. El saneamiento —modelo vigente, contrato estructurado de errores, validación estricta y arranque sin clave— vive solamente en la rama local: todavía no puede afirmarse ningún comportamiento saneado en producción, incluida la respuesta `ai_not_configured` ante la falta de clave.

**La calificación con IA de las respuestas estudiantiles todavía no existe.** Lo implementado es únicamente la generación asistida de borradores de preguntas, que el docente revisa completa antes de aplicar. Siguen faltando la evaluación con IA reservada al docente, la revisión por rúbrica, las métricas longitudinales y la exportación.

## 2. Infraestructura verificada

### GitHub

- Repositorio: `AlejandroCordova1993/ychaynan-lite`.
- GitHub Pages: `https://alejandrocordova1993.github.io/ychaynan-lite/`.
- SPA basada en `HashRouter` y base `/ychaynan-lite/`; no requiere dominio propio.
- El commit técnico `507e5b5` se integró por fast-forward en `master`; los workflows **Verify** y **Deploy Pages** terminaron correctamente. El smoke público devolvió HTTP 200 para la página y el bundle, y confirmó las rutas del circuito.

### Supabase

- Región: `sa-east-1`.
- Trece migraciones locales y remotas coincidentes.
- `db lint` sobre `public`: sin errores en la última comprobación.
- Registro público deshabilitado.
- Rol docente exigido mediante `app_metadata.role = teacher`.
- Tres secretos operativos configurados sin persistir ni imprimir su valor privado: pepper de códigos, orígenes CORS y sesión máxima de 180 minutos.
- La variable pública VITE_SUPABASE_ANON_KEY del repositorio GitHub se actualizó con la clave vigente para el próximo build de Pages.

### Edge Functions activas

| Función                     | Estado | Verificación                                                                                                |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `manage-assessment-access`  | activa | JWT de Supabase obligatorio y rol docente comprobado dentro de la función                                   |
| `validate-student`          | activa | sin JWT de cuenta; valida identidad, código y límites antes de emitir sesión opaca                          |
| `save-draft`                | activa | sesión opaca, versión optimista y preservación textual                                                      |
| `submit-assessment`         | activa | sesión opaca, confirmación explícita, idempotencia e inmutabilidad                                          |
| `generate-assessment-draft` | activa | desplegada en versión anterior al endurecimiento: ~06:24 del 2/09/2026, mientras que `6ff297d` es de ~16:23 |

Son cinco funciones activas. El smoke remoto no destructivo devolvió `204` al preflight desde el origen de GitHub Pages, reflejó exactamente ese origen en CORS y rechazó con `401` una solicitud estudiantil incompleta mediante un mensaje genérico. No se crearon datos de prueba en producción.

El asistente de borradores no se ha ejercitado contra el proveedor real: falta el secreto `DEEPSEEK_API_KEY` y no se ha hecho ninguna llamada de prueba con una lectura real. El comportamiento descrito en la guía técnica corresponde a la versión de la rama, no a la que responde hoy en producción.

Procedimiento pendiente, en este orden:

1. integrar las correcciones de la rama;
2. ejecutar la verificación completa;
3. desplegar nuevamente `generate-assessment-draft`;
4. configurar `DEEPSEEK_API_KEY` en los secretos de Supabase;
5. realizar un smoke con una lectura no sensible.

## 3. Superficie funcional implementada

### Docente

- iniciar sesión y cambiar la contraseña;
- cerrar sesión incluso ante una cuenta autenticada sin rol docente;
- crear paralelos e importar la nómina;
- crear y guardar una evaluación borrador con lectura y una a cuatro preguntas;
- pedir a la IA un borrador de preguntas abiertas, revisar la propuesta completa y aplicarla o descartarla; nada se guarda ni se abre sin confirmación;
- congelar la rúbrica operativa dentro de la evaluación;
- abrir atómicamente una evaluación para un paralelo;
- generar, visualizar una sola vez, regenerar y desbloquear códigos personales;
- consultar el estado de los accesos;
- listar entregas y abrir el detalle íntegro de cada estudiante.

### Estudiante

- entrar sin cuenta con nombre completo, paralelo y código personal;
- ignorar mayúsculas y tildes vocálicas al comparar el nombre, conservando la diferencia entre `n` y `ñ`;
- resolver homónimos mediante el código personal;
- recibir una única sesión temporal revocable;
- ver solo la lectura y las preguntas, nunca la rúbrica;
- guardar localmente y sincronizar de forma optimista;
- comparar versiones si existe un conflicto, sin mezcla automática;
- esperar un autoguardado en curso antes de la entrega definitiva;
- entregar una sola vez y obtener un comprobante local;
- no recibir puntaje, análisis de IA ni retroalimentación.

## 4. Datos y seguridad

El modelo conserva las diez tablas del dominio: `groups`, `students`, `assessments`, `questions`, `assessment_access`, `student_sessions`, `access_rate_limits`, `submissions`, `responses` y `ai_evaluations`.

Las migraciones 10 a 13 añadieron las operaciones transaccionales del circuito vertical: creación/apertura de evaluación, acceso y sesión estudiantil, borrador versionado y entrega final. RLS impide que `anon` consulte directamente las tablas; las operaciones estudiantiles pasan por funciones con `service_role` solo en servidor.

Controles implementados:

- hashes HMAC de códigos con pepper privado;
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

La calificación automática de respuestas estudiantiles todavía no existe. La generación asistida de borradores de preguntas sí existe y exige revisión completa antes de aplicar la propuesta; su endpoint está desplegado, aunque la versión remota es anterior al endurecimiento. Cuando se implemente la evaluación, será visible solo para el docente, deberá conservar evidencia por criterio y permanecer editable/revisable por el docente.

## 6. Verificación local

La puerta de calidad `npm run verify` terminó con código 0: formato, ESLint sin advertencias permitidas, TypeScript, 62 archivos y 307 pruebas aprobadas, y build de producción con 180 módulos transformados.

Las pruebas cubren contratos, RLS, migraciones, normalización de identidad, sesiones, códigos, borradores, conflictos, idempotencia, privacidad de la carga estudiantil, interfaz docente y entrega. El asistente de borradores añadió cobertura sobre el contrato compartido de validación estricta, la resolución determinista de la configuración, la compatibilidad con el proveedor vigente, los códigos de error estables, la vista previa completa y la invalidación de propuestas obsoletas.

La auditoría posterior a `6ff297d` detectó tres incumplimientos, ya corregidos y cubiertos por pruebas:

- la propuesta solo se ocultaba al comparar la firma final, de modo que cambiar un dato y restaurarlo podía revivirla o admitir una respuesta tardía. Ahora cada solicitud queda atada a una revisión monótona y el resultado se elimina de verdad;
- la verificación de la sesión docente corría fuera del `try`, así que una excepción de Supabase o de red escapaba del handler. Ahora queda dentro del contrato estructurado;
- un `200` con envelope ilegible se clasificaba como indisponibilidad del proveedor en lugar de propuesta inválida.

La prueba de navegación `abre el editor real desde el menú docente` dejó de ser intermitente. Tenía dos defectos: el cliente falso de `App.test.tsx` no expone `from`, así que el editor emitía `TypeError: client.from is not a function`; y la aserción competía contra la importación dinámica del editor, porque React Router navega dentro de una transición y React conserva la pantalla anterior mientras se resuelve el chunk de `React.lazy`. Se corrigieron aislando `getDraftAssessment` y precargando el módulo, sin ampliar tiempos de espera.

## 7. Estado por fase

| Fase                             | Estado real                                  | Pendiente principal                                                                                                      |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Infraestructura y seguridad base | completa para el corte actual                | vigilancia operativa y ensayo controlado                                                                                 |
| Circuito vertical sin IA         | implementado y publicado                     | ejecutar un ensayo completo con datos ficticios controlados                                                              |
| Calibración pedagógica           | documental avanzada                          | corpus anonimizado, doble evaluación y ajuste de umbrales                                                                |
| Generación de borradores con IA  | implementada; desplegada en versión anterior | integrar, verificar, redesplegar, configurar `DEEPSEEK_API_KEY`, probar con una lectura real y añadir control de consumo |
| Calificación con IA              | no existe                                    | función de evaluación, lotes reanudables e interfaz de revisión                                                          |
| Diagnóstico longitudinal         | pendiente                                    | métricas por criterio, estudiante, paralelo y momento del año                                                            |
| Exportación y cierre             | pendiente                                    | CSV/JSON, manifiesto y procedimiento de retiro/archivo                                                                   |

## 8. Pendientes priorizados

1. Integrar esta rama, publicar GitHub Pages y ejecutar un smoke real controlado con un paralelo y un estudiante ficticios.
2. Corregir cualquier hallazgo del ensayo de acceso, reconexión, autoguardado y entrega antes de usar estudiantes reales.
3. Integrar las correcciones, verificar, **desplegar nuevamente** `generate-assessment-draft` —su versión remota es anterior al endurecimiento—, configurar `DEEPSEEK_API_KEY` en Supabase y recién entonces probar el asistente con una lectura no sensible.
4. Añadir un control persistente de consumo por docente para el asistente, que limite costo y abuso. No puede resolverse con memoria del proceso Edge: cada invocación puede ejecutarse en una instancia distinta y ese conteo no sería confiable. Requiere almacenamiento persistente y no se abordó en este corte.
5. Diseñar e implementar `evaluate-submission` exclusivamente para el docente, con evaluación individual y por lote, trazabilidad, reintentos e intervención humana.
6. Construir la pantalla de revisión por rúbrica sin retroalimentación estudiantil.
7. Crear métricas diagnósticas y longitudinales que no reduzcan la escritura a una sola nota.
8. Implementar exportación y respaldo antes de una campaña real.
9. Calibrar la rúbrica con textos anonimizados de estudiantes de 15 a 17 años.

## 9. Riesgos abiertos

- No se ha realizado todavía un ensayo de aula ni una prueba E2E completa alojada con datos ficticios.
- El rate limit incluye una huella aportada por el cliente; el enfriamiento por acceso personal reduce el abuso, pero debe observarse bajo redes escolares compartidas.
- La calificación con IA, el dashboard y la exportación siguen ausentes.
- La versión de `generate-assessment-draft` que responde en producción es anterior al endurecimiento: no tiene el contrato estructurado de errores, el modelo vigente ni la validación estricta. Hasta redesplegarla, ninguna afirmación de este documento sobre el comportamiento saneado describe producción.
- El asistente no tiene todavía ningún límite de consumo por docente: una vez configurada la clave, el costo depende únicamente de la disciplina de uso.
- Las respuestas son datos educativos personales: no deben entrar al repositorio, logs públicos ni servicios de IA sin la política y anonimización definidas.
- Las tres recomendaciones estructurales de React Doctor en `AssessmentEditorScreen` pueden abordarse como refactor posterior, sin mezclarlo con el circuito ya probado.

## 10. Criterio de cierre del MVP diagnóstico

El MVP podrá considerarse listo para uso real cuando el circuito alojado pase un ensayo controlado, la evaluación docente con IA tenga validación pedagógica, exista exportación recuperable y el dashboard permita comparar avances sin exponer resultados al estudiante.

Este documento debe actualizarse después de cada cambio funcional o de infraestructura. Código, pruebas locales y despliegue remoto son evidencias distintas; ninguna sustituye a las otras.
