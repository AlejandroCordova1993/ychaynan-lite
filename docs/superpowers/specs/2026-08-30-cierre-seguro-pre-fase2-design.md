# Cierre seguro previo a la Fase 2 — diseño

**Fecha:** 30 de agosto de 2026  
**Tipo:** recorte correctivo y arquitectónico  
**Estado:** aprobado por el docente responsable el 30 de agosto de 2026

## 1. Propósito

Este recorte sanea la base ya desplegada antes de construir el circuito estudiantil. No agrega todavía la experiencia completa de evaluación. Su objetivo es que la siguiente fase parta de contratos coherentes, migraciones acumulativas, documentación verdadera y una ruta de operación que no dependa de credenciales guardadas en conversaciones.

Fuentes de verdad:

- `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`;
- `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md`;
- `RUBRICA_DIAGNOSTICA_COMPLETA.md`;
- código, pruebas y migraciones presentes en el repositorio;
- estado comprobable de GitHub Pages y del proyecto Supabase correcto.

Cuando una afirmación histórica contradiga el código o la infraestructura verificada, se actualizará el documento histórico; no se modificará el código para hacerlo coincidir con un estado obsoleto.

## 2. Diagnóstico que este recorte resuelve

La base docente funciona y está desplegada, pero quedan cinco riesgos antes de continuar:

1. El estado y el README aún describen parcialmente una aplicación local sin Supabase real.
2. Dos credenciales fueron copiadas en una conversación. Deben considerarse expuestas y rotarse; no se reutilizarán ni se copiarán al repositorio.
3. La conexión administrativa disponible en esta sesión no apunta al proyecto Ychayñan Lite. Ninguna corrección remota se ejecutará mientras el proyecto no se identifique y autentique de forma inequívoca.
4. El contrato de borradores habla de control de versión, pero `submissions` no persiste esa versión.
5. La guía exige abrir una evaluación y generar accesos en una sola operación, pero las cinco Edge Functions enumeradas no incluyen una operación docente capaz de generar, regenerar o desbloquear códigos sin exponer el `pepper` al navegador.

También se corregirán dos endurecimientos preventivos: índices en claves foráneas de alto uso y `search_path` fijo en funciones PostgreSQL ya creadas.

## 3. Alternativas consideradas

### A. Cierre local verificable y despliegue remoto con compuerta — elegida

Se corrigen documentación, dependencias y esquema mediante una migración nueva; se prueba todo localmente y solo después se despliega al proyecto Supabase cuya identidad haya sido confirmada. Es la opción con menor riesgo de tocar el proyecto equivocado y conserva un historial reproducible.

### B. Construir de inmediato todo el flujo estudiantil

Se descarta para este recorte. Ocultaría inconsistencias de base bajo más código y obligaría a diseñar acceso, borradores y entrega mientras sus contratos aún no coinciden con el esquema.

### C. Corregir únicamente la documentación

Se descarta porque dejaría sin resolver el versionado de borradores, los índices y el endurecimiento de funciones. La documentación no puede sustituir invariantes de base de datos.

## 4. Alcance aprobado para implementación

### 4.1 Estado operativo y documentación

- Actualizar `README.md` y `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md` con fecha, commit, pruebas, remoto, despliegue y alcance reales.
- Corregir en la guía técnica la lista de Edge Functions para incluir `manage-assessment-access` como sexta función.
- Documentar que `supabase/config.toml` configura el stack **local**, no el proyecto alojado. Por ello conservará `site_url = "http://localhost:5173"` para desarrollo. La URL productiva se verificará en la configuración remota de Supabase Auth y no se simulará cambiando el archivo local.
- Añadir un procedimiento operativo breve para vincular y verificar el proyecto correcto antes de `db push`, consultar asesores o desplegar funciones.
- No incluir contraseñas, tokens, claves privadas ni valores de `service_role` en documentos, scripts, commits o salidas de prueba.

La decisión sobre `config.toml` sigue la documentación oficial de Supabase: ese archivo pertenece a la configuración local; la `SITE_URL` productiva se administra en la configuración de Auth del proyecto alojado.

### 4.2 Dependencias reproducibles

- Sustituir el rango de `@supabase/supabase-js` por la versión exacta ya resuelta y verificada en el lockfile.
- Incorporar la CLI de Supabase como dependencia de desarrollo con versión exacta, evitando que `npx` descargue una versión distinta en cada sesión.
- Regenerar el lockfile con npm; no editarlo manualmente.

### 4.3 Migración acumulativa de saneamiento

Se creará una migración nueva mediante la CLI de Supabase. No se editarán las ocho migraciones ya aplicadas.

La migración hará lo siguiente:

1. Agregar `submissions.draft_version integer not null default 0` con restricción `draft_version >= 0`.
2. Crear, si no existen, índices para:
   - `assessment_access(student_id)`;
   - `student_sessions(assessment_access_id)`;
   - `submissions(student_id)`;
   - `responses(question_id)`.
3. Fijar un `search_path` explícito para todas las funciones existentes que se ejecutan desde triggers o políticas. El orden permitido será `pg_catalog, public` y, únicamente donde haga falta, `auth`. Las referencias a tablas sensibles permanecerán calificadas con esquema.
4. No conceder nuevas operaciones a `anon`, `authenticated` ni `PUBLIC`.

El versionado usa concurrencia optimista:

- al crear un borrador, la versión inicial persistida es `0`;
- cada guardado exitoso incrementa la versión en una unidad;
- `save-draft` deberá recibir la versión conocida por el cliente;
- si la versión recibida no coincide con la almacenada, la operación devuelve conflicto y no sobrescribe la respuesta más reciente.

Este recorte añade el soporte de datos y corrige el contrato documental. La implementación de `save-draft` pertenece al siguiente corte vertical y deberá probar el conflicto de versión de extremo a extremo.

### 4.4 Contrato seguro de gestión de accesos

La guía declarará una sexta Edge Function:

`manage-assessment-access`

Responsabilidades:

- exigir JWT válido y rol docente en `app_metadata.role`;
- aceptar las acciones `open`, `regenerate` y `unblock`;
- comprobar que la evaluación y los estudiantes pertenecen al docente;
- generar códigos aleatorios de ocho caracteres en el servidor;
- normalizar y calcular el HMAC usando `ACCESS_CODE_PEPPER`, secreto disponible solo en la Edge Function;
- persistir únicamente hashes, nunca códigos en claro;
- devolver códigos en claro solo en la respuesta inmediata de `open` o `regenerate`;
- registrar el evento de auditoría correspondiente;
- no enviar códigos a logs.

`open` será atómico: o se abre la evaluación y se crean todos los accesos, o no se modifica nada. Para ello la Edge Function llamará una función SQL transaccional con `security invoker`, ejecutada por `service_role`, con `EXECUTE` revocado a `PUBLIC`, `anon` y `authenticated`. El navegador nunca llamará esa función SQL directamente.

La implementación de la Edge Function y de la operación SQL se hará en el siguiente corte vertical, junto con sus pruebas. En este recorte se corrige el contrato arquitectónico para que no se empiece la Fase 2 con una responsabilidad huérfana.

## 5. Flujo de datos resultante

```text
Docente autenticado
  -> manage-assessment-access (JWT docente)
  -> genera código y HMAC en servidor
  -> operación SQL transaccional con service_role
  -> assessment + assessment_access + audit_events
  -> devuelve códigos una sola vez al docente

Estudiante
  -> verify-access (nombre + paralelo + código)
  -> sesión estudiantil limitada
  -> save-draft (expected draft_version)
  -> actualización condicional e incremento de versión
```

No se añade autenticación estudiantil tradicional. La sesión limitada y la política de un solo envío siguen siendo las definidas por los documentos maestros.

## 6. Seguridad operativa y compuerta de producción

Antes de cualquier mutación remota deben cumplirse todos estos puntos:

1. Rotar la contraseña docente y la contraseña de base de datos que aparecieron en la conversación.
2. Revocar o rotar cualquier token personal que haya sido copiado en un chat, archivo temporal o captura.
3. Autenticar la CLI o el conector con la cuenta que posee Ychayñan Lite.
4. Confirmar por nombre y `project_ref` que el destino es Ychayñan Lite; no aceptar solo el enlace guardado en `.temp` como prueba de autorización.
5. Comparar migraciones locales y remotas antes de `db push`.
6. Aplicar la migración nueva únicamente al proyecto confirmado.
7. Ejecutar asesores de seguridad y rendimiento, y revisar cada resultado.
8. Probar el login docente y el acceso anónimo negativo después del despliegue.

Si la conexión sigue mostrando otro proyecto, la operación se detiene. No se usarán credenciales del proyecto Ecuafuturo como sustituto.

## 7. Estrategia de pruebas

Se seguirá TDD para cada cambio de comportamiento:

1. Agregar primero pruebas de integración que fallen porque falta `draft_version`, los índices o el `search_path` seguro.
2. Ejecutarlas y comprobar que fallan por la ausencia concreta esperada.
3. Crear la migración mínima que las haga pasar.
4. Ejecutar la prueba focalizada y luego `npm run verify` completo.

Las pruebas deberán demostrar:

- que las nueve migraciones se aplican desde cero en PGlite;
- que `draft_version` tiene valor inicial `0`, no admite negativos y persiste incrementos válidos;
- que existen los cuatro índices por sus columnas, no solo por el nombre elegido;
- que las funciones auditadas tienen `proconfig` con `search_path` fijo;
- que los privilegios anónimos siguen rechazados;
- que el build de GitHub Pages conserva la base `/ychaynan-lite/` y `HashRouter`.

La validación contra PGlite no reemplaza el smoke real posterior en Supabase alojado.

## 8. Fuera de alcance

- formularios completos de creación y publicación de evaluaciones;
- sesión y formulario estudiantil;
- implementación de las seis Edge Functions;
- integración con proveedor de IA;
- evaluación masiva, revisión docente, dashboard y exportación;
- retroalimentación inmediata al estudiante;
- cambios visuales amplios;
- dominio personalizado;
- cambio de plataforma de despliegue.

## 9. Criterios de aceptación

El recorte se considera terminado solo cuando:

- la documentación describe el estado verificable y distingue configuración local de remota;
- no aparecen secretos en archivos rastreados ni en el bundle;
- la nueva migración pasa desde una base vacía junto con las ocho anteriores;
- las pruebas nuevas recorrieron rojo y verde;
- `npm run verify` termina con código 0 y sin advertencias;
- React Doctor sobre `src` no informa errores accionables;
- el repositorio queda sin cambios inesperados;
- el despliegue remoto, si se realiza, se hace después de confirmar el proyecto correcto y queda acompañado por smoke tests y asesores limpios o con hallazgos documentados.

La rotación de credenciales y la reconexión administrativa son acciones operativas del propietario. Si no pueden verificarse desde esta sesión, se reportan como bloqueantes del despliegue remoto, no como trabajo completado.

## 10. Entregable siguiente

Tras aprobar y completar este cierre, el siguiente plan será un corte vertical mínimo:

1. crear evaluación y preguntas;
2. abrirla mediante `manage-assessment-access`;
3. verificar acceso estudiantil;
4. guardar borrador con control de versión;
5. entregar una única vez;
6. mostrar la entrega al docente.

La IA, los dashboards y la exportación se incorporarán después de que este circuito básico sea demostrable de extremo a extremo.
