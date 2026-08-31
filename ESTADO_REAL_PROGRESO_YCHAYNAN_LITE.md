# Estado real de progreso de Ychayñan Lite

**Fecha de corte:** 31 de agosto de 2026

**Alcance:** rama aislada de saneamiento, frontend React, PostgreSQL local y alojado, RLS, Auth docente, GitHub Pages, dependencias, pruebas y documentación maestra.

## 1. Conclusión ejecutiva

Ychayñan Lite ya tiene infraestructura real conectada y una base técnica verificada: repositorio GitHub, GitHub Pages, proyecto Supabase independiente, cuenta docente, diez tablas con RLS y nueve migraciones coincidentes entre local y remoto.

La aplicación todavía no es utilizable con estudiantes. Las seis Edge Functions objetivo no están implementadas y tampoco existe el circuito completo para crear una evaluación, gestionar accesos, validar al estudiante, guardar borradores, entregar, evaluar, revisar y exportar.

El avance actual es una **cimentación segura previa al siguiente corte vertical**, no un MVP terminado ni las Fases 0 y 1 completas.

## 2. Estado de Git verificado antes de este commit documental

- Rama técnica: **codex/cierre-seguro-pre-fase2**.
- Commit técnico verificado: **36cf3a28fb6e4767055c5a6920398a72d6aef321**, “fix: robustecer cambio de contrasena docente”.
- origin/master: **4eacf70f1c4db007d5242a830654d854ee2246d4**.
- La rama estaba cero commits por detrás y nueve por delante de origin/master.
- El árbol estaba limpio antes de editar este informe y git diff --check no produjo salida.
- Remoto: https://github.com/AlejandroCordova1993/ychaynan-lite.git.
- Este trabajo no hizo push ni merge. GitHub Pages responde, pero no debe asumirse que contiene los nueve commits de esta rama hasta integrarla y verificar el workflow.

## 3. Infraestructura alojada

### GitHub y Pages

- Repositorio público: AlejandroCordova1993/ychaynan-lite.
- Aplicación: https://alejandrocordova1993.github.io/ychaynan-lite/.
- Smoke del 31 de agosto de 2026: HTTP 200, 339 bytes en el documento inicial.
- La SPA conserva HashRouter y la base /ychaynan-lite/; no requiere dominio propio.

### Supabase

- Proyecto único visible por CLI: **ychaynan-lite**.
- Project ref: **qwqugnbmncrwcemxwutc**.
- Región: **sa-east-1**.
- Estado: **ACTIVE_HEALTHY**.
- Durante el preflight del despliegue, la CLI mostró **linked: true**.
- El propietario confirmó el 31 de agosto de 2026 la rotación de la contraseña docente y de la contraseña de base de datos expuestas.
- El propietario confirmó el 31 de agosto de 2026 la Site URL productiva y que habilitó en el proyecto alojado **Authentication → Sign In / Providers → Email → Require current password when updating**. Este ajuste hace cumplir del lado servidor el `current_password` que envía el formulario; su contrato backend es `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true`. La confirmación procede del propietario, no de una lectura automatizada del Dashboard. supabase/config.toml continúa reservado para localhost y desarrollo.
- El propietario confirmó que eliminó `supabase-token.txt` y revocó varios tokens activos, probablemente incluido el usado por la CLI. Desde esa revocación, la CLI debe considerarse no autenticada hasta completar un nuevo login; esta revisión no intentó comprobarla ni reautenticarla.

### Migraciones y diagnóstico remoto

La migración 20260830153451_secure_pre_phase2_foundation.sql se aplicó una sola vez después de confirmar el proyecto, ocho migraciones remotas previas y un dry-run que proponía exclusivamente esa migración, sin seeds ni roles.

La autorización explícita para aplicar únicamente la migración 9 se otorgó antes de las rotaciones. El controlador había indicado que responder `listo` activaría ese despliegue ya autorizado y trató después esa respuesta como señal operativa. Aunque el alcance ejecutado coincidió con lo autorizado, esta secuencia no cumplió literalmente la exigencia documental de obtener una autorización explícita nueva inmediatamente antes del push.

Después del despliegue:

- las nueve migraciones locales y remotas coinciden;
- db lint sobre public terminó sin errores;
- los avisos anteriores de function_search_path_mutable desaparecieron;
- Advisors conserva un warning: **Leaked Password Protection Disabled** en Supabase Auth. No invalida la rotación realizada, pero conviene habilitar esa protección antes del uso con estudiantes.

No se ejecutaron db reset, migration repair, seeds ni smokes mutables.

## 4. Evidencia local fresca

- npm ci: 284 paquetes instalados, 285 auditados y 0 vulnerabilidades. El primer intento encontró un archivo Rolldown bloqueado por un Vite del mismo worktree; se identificó y cerró únicamente ese proceso, y el reintento pasó.
- npm mantiene una advertencia no bloqueante: ESLint 9.39.5 ya figura como versión no soportada.
- npm run verify: lint, Prettier, TypeScript, Vitest y Vite terminaron con código 0.
- Pruebas: 16 archivos y 124 pruebas aprobadas.
- Build: 96 módulos transformados.
- Bundle principal: 396,21 kB; 115,45 kB gzip.
- Chunk de cambio de contraseña: 3,39 kB; 1,22 kB gzip.
- npm audit de producción y completo: 0 vulnerabilidades.
- React Doctor en cambios: 7 archivos, 100/100, sin hallazgos.
- React Doctor completo sobre src: 38 archivos, 100/100, sin hallazgos. La opción --diff funciona, pero la versión actual recomienda --scope changed.
- El escaneo de 74 archivos versionados y 8 archivos del bundle no detectó service_role, ACCESS_CODE_PEPPER, tokens personales sbp_ ni asignaciones sensibles. Detectó un único JWT con rol anon, que corresponde a la clave pública esperada del frontend.

## 5. Modelo de datos y seguridad

El modelo mantiene exactamente diez tablas:

1. groups
2. students
3. assessments
4. questions
5. assessment_access
6. student_sessions
7. access_rate_limits
8. submissions
9. responses
10. ai_evaluations

La novena migración añadió:

- submissions.draft_version integer not null default 0;
- restricción contra versiones negativas;
- cuatro índices de claves foráneas usados por accesos, sesiones, entregas y respuestas;
- search_path = pg_catalog, public en las diez funciones del dominio.

Las diez peticiones anónimas de solo lectura por Data API devolvieron HTTP 401. RLS y los privilegios mínimos impiden acceso directo de anon; el frontend no contiene service_role ni secretos privados.

El modelo no incluye audit_events ni una bitácora general. Esa ausencia es deliberada para mantener el alcance simple.

## 6. Superficie funcional actual

El enrutador contiene trece rutas de producto.

Cuatro rutas tienen un componente específico:

1. /docente/ingresar: inicio de sesión docente.
2. /docente: inicio docente mínimo y navegación de cuenta.
3. /docente/cambiar-contrasena: cambio de contraseña docente.
4. /docente/paralelos: creación de paralelos e importación de nómina.

La pantalla de inicio docente sigue siendo mínima y anuncia trabajo futuro; no debe confundirse con un dashboard.

Nueve rutas usan todavía PlaceholderScreen: acceso, respuesta y confirmación estudiantil; creación de evaluación; distribución de accesos; bandeja y revisión individual; resumen diagnóstico; y exportación.

El cambio de contraseña ya está implementado en la rama técnica: exige contraseña actual, una nueva contraseña distinta de al menos doce caracteres, confirmación coincidente, actualización mediante Supabase Auth y cierre de sesión posterior con recuperación si el cierre falla. El propietario confirmó la rotación de la cuenta docente real. La publicación de este código en Pages depende todavía de integrar la rama.

Como comprobación manual posterior, el propietario confirmó que inició sesión correctamente con la contraseña nueva, llegó al área docente y volvió a cambiar la contraseña con éxito desde la interfaz. Esta es evidencia declarada por el propietario, no un smoke automatizado ni una operación reproducida por el agente.

## 7. Backend funcional pendiente

El contrato objetivo contiene seis Edge Functions y el directorio supabase/functions todavía no existe:

1. manage-assessment-access
2. validate-student
3. save-draft
4. submit-assessment
5. evaluate-submission
6. export-campaign

Por tanto, el estudiante aún no puede entrar con nombre y código, guardar un borrador ni entregar. El docente tampoco puede crear y abrir una evaluación completa, ejecutar evaluación con IA, revisar resultados, consultar métricas o exportar la campaña.

draft_version y los contratos de concurrencia están preparados en esquema y documentación; la lógica de conflicto optimista todavía debe implementarse en save-draft.

## 8. Avance por fase

| Fase                 | Estado real                   | Evidencia                                                                              | Pendiente principal                                                  |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Preparación          | Parcial avanzada              | GitHub, Pages, Supabase, documentos, rúbrica y CI                                      | Integrar la rama y completar operación de Auth                       |
| Base segura          | Parcial avanzada y desplegada | Diez tablas, nueve migraciones, RLS, rol docente, nómina, índices y funciones saneadas | Implementar el backend del circuito                                  |
| Calibración          | No iniciada                   | Rúbrica humana y JSON disponibles                                                      | Muestras anonimizadas, doble corrida y revisión ciega                |
| Evaluación y ensayo  | No iniciada funcionalmente    | Esquema preparatorio y versionado de borrador                                          | Editor, accesos, sesión, borrador, entrega y ensayo NAT/desconexión  |
| IA y revisión        | No iniciada funcionalmente    | Tabla y contratos preparatorios                                                        | Proveedor, evaluación individual, lote reanudable y revisión docente |
| Diagnóstico y salida | No iniciada                   | Requisitos documentados                                                                | Dashboard, CSV/JSON, manifiesto, exportación y retiro                |

## 9. Riesgos y deudas abiertas

### Bloquean el uso con estudiantes

1. Cero de seis Edge Functions están implementadas.
2. Nueve rutas de producto siguen siendo placeholders.
3. No existe todavía un flujo estudiantil funcional ni evaluación, revisión o exportación completa.
4. No se ha realizado calibración pedagógica ni ensayo de aula.
5. Los commits de esta rama todavía no están integrados en origin/master ni publicados por Pages.

### Seguridad y operación pendientes

1. Habilitar, si el plan de Supabase lo permite, Leaked Password Protection antes del uso con estudiantes.
2. Reautenticar la CLI solo cuando una futura operación lo requiera y sin volver a guardar tokens en archivos del proyecto.
3. Implementar Edge Functions con validación de sesión, límites compatibles con NAT, idempotencia, CORS estricto y secretos solo del lado servidor.
4. Confirmar semánticamente la rúbrica JSON contra la rúbrica Markdown durante calibración.
5. Mantener fuera del repositorio público datos estudiantiles, exportaciones y documentos fuente sin licencia decidida.

## 10. Próximo corte vertical recomendado

Construir y probar un recorrido mínimo de extremo a extremo en este orden:

1. crear y abrir una evaluación;
2. gestionar accesos con manage-assessment-access;
3. validar nombre completo y código con validate-student;
4. crear sesión temporal;
5. guardar borrador con expectedDraftVersion;
6. entregar una sola vez con idempotencia;
7. mostrar la entrega al docente;
8. recién después incorporar evaluación con IA, revisión, métricas y exportación.

La siguiente fase no debe empezar por el dashboard ni por la IA. El riesgo inmediato es demostrar que acceso, sesión, concurrencia de borrador y entrega funcionan de forma segura y recuperable.

## 11. Regla de actualización

Este archivo se actualiza después de cada recorte funcional o cambio de infraestructura. Solo puede marcarse una fase como completa cuando existen código, pruebas proporcionales y verificación en el entorno correspondiente. Una prueba local no reemplaza una comprobación alojada, y un contrato documentado no equivale a una Edge Function implementada.
