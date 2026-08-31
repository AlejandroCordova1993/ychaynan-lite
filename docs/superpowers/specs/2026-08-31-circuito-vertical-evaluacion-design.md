# Circuito vertical mínimo de evaluación — Diseño

**Fecha:** 31 de agosto de 2026  
**Estado:** aprobado conceptualmente; pendiente de revisión escrita  
**Alcance:** creación docente, apertura y códigos, validación estudiantil, borrador, entrega única y bandeja docente

## 1. Objetivo

Construir el primer recorrido completo y utilizable de Ychayñan Lite: el docente crea una evaluación diagnóstica, la abre para un paralelo, entrega un código personal a cada estudiante, recibe respuestas con guardado recuperable y consulta las entregas. El estudiante no crea una cuenta y no recibe resultados ni retroalimentación.

El éxito de este corte se demuestra cuando una entrega ficticia puede recorrer el circuito completo sin acceso directo anónimo a las tablas, sin duplicarse y sin perder el texto original.

## 2. Fuentes de verdad

Este diseño concreta, sin sustituirlas, las reglas de:

1. `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`.
2. `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md`.
3. Las nueve migraciones existentes en `supabase/migrations/`.
4. `rubric-v1.json`, utilizado como snapshot inmutable al abrir una evaluación.
5. La petición aprobada: circuito vertical mínimo antes de IA, dashboard y exportación, con nombre completo, paralelo y código como comprobaciones estudiantiles.

Ante una contradicción, mandan primero las restricciones ya desplegadas en PostgreSQL y después los documentos maestros. Ningún cambio de este corte puede debilitar RLS ni exponer tablas al rol `anon`.

## 3. Alcance funcional

### 3.1. Incluido

- Crear y editar una única evaluación en estado `draft`.
- Capturar título, propósito, lectura, instrucciones generales y entre una y cuatro preguntas abiertas.
- Configurar rango orientativo de palabras, criterios activos, módulos activos y relaciones curriculares por pregunta.
- Validar el formulario antes de persistirlo.
- Congelar lectura, preguntas y snapshot de rúbrica al abrir.
- Abrir una evaluación para un paralelo y generar un código personal de ocho caracteres por estudiante activo.
- Mostrar y permitir imprimir o descargar la lista de códigos solamente en la respuesta de apertura o regeneración.
- Validar código, nombre completo, paralelo y estado de evaluación sin revelar qué dato falló.
- Crear una sesión estudiantil temporal y una entrega `in_progress`.
- Recuperar el borrador remoto y combinarlo de forma segura con el borrador local.
- Guardar el borrador completo con control optimista mediante `draft_version`.
- Entregar de forma idempotente una sola vez.
- Mostrar confirmación sin resultados al estudiante y limpiar el equipo compartido.
- Mostrar al docente una bandeja por evaluación con estudiantes esperados, iniciados y entregados.
- Abrir el detalle de una entrega con lectura, preguntas y textos originales.

### 3.2. Excluido

- Evaluación con IA y procesamiento por lote.
- Revisión o ajustes docentes de resultados de IA.
- Dashboard diagnóstico, métricas y comparación longitudinal.
- Exportación CSV, JSON, Excel o Google Sheets.
- Retroalimentación visible para el estudiante.
- Reapertura, segundo intento o edición posterior a la entrega.
- Códigos QR, cuentas estudiantiles y seguimiento anual dentro de Lite.
- Cambios al contenido pedagógico de `rubric-v1.json` derivados del trabajo paralelo de calibración.

## 4. Arquitectura

### 4.1. Fronteras

- El navegador docente usa el cliente Supabase con JWT `authenticated`. RLS autoriza únicamente `app_metadata.role = teacher`.
- El navegador estudiantil nunca consulta tablas con el cliente Supabase. Solo invoca Edge Functions públicas con entradas limitadas.
- Las Edge Functions usan un cliente privilegiado exclusivamente en servidor. `SUPABASE_SERVICE_ROLE_KEY`, `ACCESS_CODE_PEPPER` y cualquier secreto no aparecen en Vite, GitHub Pages ni respuestas públicas.
- Las operaciones de apertura, guardado final y entrega que afectan varias tablas se ejecutan transaccionalmente mediante funciones SQL privadas invocables solo por `service_role`.
- No se crea un backend adicional ni una segunda fuente de datos.

### 4.2. Componentes del corte

1. API y pantallas docentes para el borrador de evaluación.
2. `manage-assessment-access` para abrir, regenerar y desbloquear.
3. Pantalla pública y `validate-student` para iniciar o reanudar.
4. Pantalla de respuesta y `save-draft` para persistencia optimista.
5. Confirmación y `submit-assessment` para la entrega idempotente.
6. API y pantallas docentes de bandeja y detalle.

No se implementan `evaluate-submission` ni `export-campaign` en este corte.

## 5. Modelo de datos existente

No se añaden tablas. Se usan:

- `groups` y `students`: paralelo y nómina.
- `assessments` y `questions`: contenido docente y snapshot de rúbrica.
- `assessment_access`: código hasheado, intentos y estado por estudiante.
- `student_sessions`: token temporal almacenado únicamente como hash.
- `access_rate_limits`: control temporal de abuso.
- `submissions` y `responses`: borrador completo y entrega final.

Las restricciones actuales siguen siendo obligatorias:

- solo una evaluación con estado `open`;
- una entrega por `assessment_id` y `student_id`;
- una posición de pregunta por evaluación;
- un acceso por evaluación y estudiante;
- una respuesta por entrega y pregunta;
- `draft_version >= 0`;
- contenido de evaluación y preguntas inmutable después de abrir;
- respuestas inmutables después de entregar;
- transición a `submitted` únicamente dentro de la ventana abierta.

### 5.1. Migración nueva permitida

Puede añadirse una única migración para operaciones SQL transaccionales. Debe:

- usar nombres explícitos y `search_path` fijado;
- usar `SECURITY INVOKER`; este corte no justifica `SECURITY DEFINER`;
- revocar siempre `EXECUTE` a `PUBLIC` y `anon`;
- conceder a `authenticated` únicamente la operación de borrador docente, protegida además por RLS y comprobación de rol;
- conceder a `service_role` las operaciones internas invocadas por Edge Functions;
- no cambiar migraciones ya aplicadas;
- incluir pruebas PGlite de éxito, rechazo y rollback.

## 6. Creación docente

### 6.1. Ruta

`#/docente/evaluacion`

La pantalla sustituye el placeholder actual. Si no existe borrador, comienza vacío. Si existe uno, lo carga. Lite admite una campaña activa y no necesita un listado complejo de evaluaciones en esta fase.

### 6.2. Campos

- `title`: obligatorio, máximo 160 caracteres.
- `purpose`: obligatorio y breve.
- `reading_text`: obligatorio, máximo 30 000 caracteres.
- `general_instructions`: opcional.
- `opens_at` y `closes_at`: opcionales en borrador; si ambos existen, cierre posterior a apertura.
- `paste_policy`: `allow` o `discourage`.
- `curriculum_version`: opcional.
- entre una y cuatro preguntas.

Cada pregunta contiene:

- posición consecutiva iniciada en 1;
- consigna obligatoria, máximo 2 000 caracteres;
- instrucciones opcionales;
- mínimo y máximo orientativo de palabras coherentes;
- criterios activos existentes en la rúbrica;
- módulos activos permitidos por Lite;
- relaciones curriculares como metadatos, sin calcular cobertura.

### 6.3. Persistencia

El docente guarda evaluación y preguntas mediante una función SQL transaccional `save_assessment_draft`, ejecutada como `SECURITY INVOKER`, concedida únicamente a `authenticated` y protegida por RLS y `is_teacher()`. La operación reemplaza el conjunto de preguntas del borrador dentro de una sola transacción. La interfaz no declara éxito hasta recibir la confirmación completa; si falla cualquier validación o escritura, no persiste un estado parcial y conserva el formulario local.

El snapshot de rúbrica, versión y hash se calculan de forma determinista antes de guardar. Abrir una evaluación con snapshot ausente o hash inválido queda rechazado.

## 7. Apertura y códigos

### 7.1. Contrato de `manage-assessment-access`

Requiere JWT docente válido y rol `teacher`.

Entrada:

```json
{
  "action": "open | regenerate | unblock",
  "assessmentId": "uuid",
  "groupId": "uuid opcional según acción",
  "studentId": "uuid opcional según acción"
}
```

Respuesta común:

```json
{ "ok": true, "data": {} }
```

Error común:

```json
{
  "ok": false,
  "error": { "code": "CODIGO_ESTABLE", "message": "Mensaje seguro" }
}
```

### 7.2. Acción `open`

- Acepta solo una evaluación `draft` y un paralelo activo con estudiantes activos.
- Verifica una a cuatro preguntas, lectura no vacía, rúbrica válida y ventana coherente.
- Genera códigos criptográficamente aleatorios de ocho caracteres.
- Usa un alfabeto legible que excluye `0`, `O`, `1` e `I`.
- Calcula HMAC-SHA-256 con `ACCESS_CODE_PEPPER` y guarda solo `code_hash`.
- Crea todos los accesos y cambia la evaluación a `open` dentro de una transacción.
- Si una parte falla, no abre la evaluación ni deja accesos parciales.
- Devuelve cada código en claro una sola vez junto al nombre y estudiante correspondiente.

### 7.3. Acciones posteriores

- `regenerate`: invalida el acceso anterior no entregado, crea un código nuevo y devuelve solo el nuevo valor en claro.
- `unblock`: devuelve el acceso a un estado utilizable y limpia espera e intentos según el contrato SQL.
- Ninguna acción permite regenerar o desbloquear una entrega `submitted`.

## 8. Validación estudiantil

### 8.1. Ruta y entrada

Ruta: `#/evaluacion/:slug`

La interfaz solicita nombre completo, paralelo y código personal. El paralelo se escribe manualmente; no se revela la nómina ni se ofrece un selector que permita explorar otros registros. Aunque el código identifica un único acceso, el paralelo se conserva como comprobación adicional aprobada por el responsable.

`validate-student` recibe:

```json
{
  "assessmentSlug": "slug",
  "fullName": "nombre completo",
  "groupName": "paralelo",
  "personalCode": "código"
}
```

Límites: nombre de hasta 160 caracteres, paralelo de hasta 80 y código de entrada de hasta 12.

### 8.2. Normalización

Se ejecuta en frontend como ayuda y en servidor como autoridad:

- Unicode NFC;
- minúsculas españolas;
- retirar tildes vocálicas;
- convertir `ü` en `u`;
- conservar `ñ` distinta de `n`;
- convertir guion y apóstrofo en separadores;
- retirar puntos y comas;
- colapsar espacios;
- rechazar dígitos y controles;
- exigir coincidencia completa con `full_name_normalized` o una variante autorizada.

No se aceptan coincidencias parciales ni aproximadas.

El paralelo se normaliza con Unicode NFC, minúsculas, tildes vocálicas ignoradas, `ñ` preservada, espacios colapsados y puntuación separadora normalizada. A diferencia del nombre, admite dígitos para valores como `3ro B`. Debe coincidir por completo con el nombre del `group` asociado al acceso.

### 8.3. Seguridad y sesión

- El HMAC del código se compara sin exponer códigos almacenados.
- Los errores de código, nombre, paralelo, horario, bloqueo y estado usan el mismo mensaje público.
- Los intentos del acceso reciben espera progresiva.
- El límite por fingerprint/red es amplio y no puede bloquear colectivamente un aula de al menos treinta estudiantes detrás de una misma IP.
- Una validación correcta genera 32 bytes aleatorios en base64url.
- La base guarda únicamente SHA-256 del token.
- El token claro se devuelve una sola vez y se conserva en `sessionStorage`.
- Una nueva validación revoca sesiones previas activas del mismo acceso si aún no existe entrega final.
- La expiración efectiva es el menor valor entre el máximo configurado y el cierre de la evaluación.
- Si ya existe entrega final, la respuesta solo indica `submitted`; no crea otra sesión.

Al crear la primera entrega, el servidor genera su `clientSubmissionKey` criptográficamente aleatoria. Si la validación se repite después de una respuesta de red perdida, devuelve la misma entrega y la misma clave, no otra fila.

La respuesta correcta incluye evaluación, preguntas, entrega, respuestas guardadas, `draftVersion`, `clientSubmissionKey`, token y expiración. Nunca incluye rúbrica, hash, nombres ajenos ni datos de otros estudiantes.

## 9. Borrador recuperable

### 9.1. Almacenamiento local

- El token vive solo en `sessionStorage`.
- Las respuestas y la `clientSubmissionKey` viven temporalmente en `localStorage` bajo una clave versionada por slug.
- El texto local se actualiza en cada cambio para soportar al menos quince minutos sin red.
- La sincronización remota ocurre después de una pausa, al cambiar de pregunta, al recuperar conexión y antes de entregar.

### 9.2. Contrato de `save-draft`

Entrada:

```json
{
  "sessionToken": "token",
  "clientSubmissionKey": "clave devuelta por validate-student",
  "expectedDraftVersion": 0,
  "responses": [
    { "questionId": "uuid", "originalText": "texto exacto" }
  ]
}
```

Reglas:

- validar token, expiración, evaluación abierta y entrega editable;
- aceptar únicamente preguntas de esa evaluación;
- máximo 20 000 caracteres por respuesta;
- preservar `originalText` exactamente como fue enviado;
- calcular conteo de palabras y hash en servidor;
- tratar el arreglo como snapshot completo del borrador;
- actualizar solo si `expectedDraftVersion` coincide;
- incrementar `draft_version` una vez por guardado exitoso;
- ante conflicto, responder `409 DRAFT_VERSION_CONFLICT` con la versión y borrador remotos, sin sobrescribirlos;
- repetir la misma sincronización no crea otra entrega gracias a `clientSubmissionKey` y la unicidad por estudiante.

La interfaz nunca descarta silenciosamente una versión. Si local y remoto divergen, conserva ambos textos y pide al estudiante elegir o copiar antes de continuar.

## 10. Entrega final

### 10.1. Contrato de `submit-assessment`

Entrada:

```json
{
  "sessionToken": "token",
  "clientSubmissionKey": "uuid",
  "expectedDraftVersion": 3,
  "confirmed": true,
  "responses": [
    { "questionId": "uuid", "originalText": "texto exacto" }
  ]
}
```

La operación transaccional:

1. valida token y evaluación abierta dentro de su ventana;
2. verifica que todas las preguntas tengan una respuesta cuyo contenido no sea vacío después de recortar espacios, conservando sin cambios el texto original;
3. verifica `expectedDraftVersion`;
4. guarda el snapshot final, conteos y hashes e incrementa `draft_version` una vez;
5. cambia la entrega a `submitted` y fija `submitted_at`;
6. marca el acceso `submitted`;
7. revoca las sesiones del acceso;
8. devuelve un recibo estable con la versión final.

Una repetición con la misma `clientSubmissionKey` devuelve el mismo recibo sin alterar datos. Para resolver la pérdida de la primera respuesta, el endpoint permite que el mismo token ya revocado consulte exclusivamente ese recibo cuando coincide con el acceso y la clave; no puede leer ni modificar respuestas. Una clave distinta para el mismo estudiante recibe el estado ya entregado y tampoco crea otra fila.

### 10.2. Experiencia posterior

La ruta `#/evaluacion/:slug/entregada` muestra solo confirmación, fecha y un identificador abreviado del recibo. No muestra calificación, criterios ni retroalimentación.

“Finalizar y limpiar este equipo” elimina token, respuestas, clave idempotente y estado local. La limpieza automática solo ocurre después de que el navegador recibió y mostró el recibo.

## 11. Bandeja docente

### 11.1. Rutas

- `#/docente/respuestas`: resumen de la evaluación y paralelo.
- `#/docente/respuestas/:submissionId`: detalle de una entrega.

### 11.2. Resumen

La tabla distingue:

- esperado: acceso `unused`;
- iniciado: acceso `active` o entrega `in_progress`;
- entregado: entrega `submitted`;
- bloqueado o revocado.

Muestra nombre original, paralelo, estado y horas relevantes. No inventa un estado de IA todavía.

### 11.3. Detalle

Muestra lectura, cada pregunta, respuesta original, conteo de palabras, fecha de guardado y entrega. Es de solo lectura. Los futuros controles de IA se añadirán en otro corte.

## 12. Manejo de errores

Todas las Edge Functions usan el sobre `{ ok, data }` o `{ ok: false, error }`, códigos estables y mensajes seguros.

Códigos mínimos:

- `INVALID_REQUEST` — entrada mal formada.
- `UNAUTHORIZED` — docente o sesión inválidos.
- `ACCESS_NOT_AVAILABLE` — error público genérico de validación.
- `RATE_LIMITED` — espera temporal con `retryAfterSeconds`.
- `ASSESSMENT_NOT_EDITABLE` — borrador congelado.
- `ASSESSMENT_NOT_OPEN` — operación fuera de estado o ventana.
- `DRAFT_VERSION_CONFLICT` — versión remota distinta.
- `ALREADY_SUBMITTED` — entrega ya cerrada.
- `INTERNAL_ERROR` — error seguro sin SQL, traza ni secretos.

Los errores de infraestructura conservan los textos locales y ofrecen reintento. El navegador no limpia estado ante respuestas ambiguas o fallos de red.

## 13. Accesibilidad y diseño

- Mantener la identidad visual y el menú lateral ya aprobados.
- Formularios con etiquetas persistentes, mensajes asociados y resumen de errores.
- Navegación completa por teclado y foco devuelto correctamente tras diálogos.
- Estados de guardando, guardado local, sincronizando, sin conexión, conflicto y entregado anunciados con regiones vivas.
- Confirmación explícita antes de entregar.
- Lectura con ancho cómodo y preguntas secuenciales sin ocultar el texto ya escrito.
- El color nunca es el único indicador de estado.

## 14. Estrategia de pruebas

La implementación seguirá TDD.

### 14.1. Unitarias

- validación de formulario docente;
- snapshot y hash deterministas de rúbrica;
- generación y formato de código;
- normalización de nombres, incluida diferencia `ñ`/`n`;
- validación de respuestas y conteo de palabras;
- almacenamiento local versionado y limpieza;
- mapeo de errores seguros.

### 14.2. Integración de base

- apertura y accesos atómicos;
- rollback ante cualquier error;
- privilegios de funciones privadas;
- una entrega por estudiante;
- control de `draft_version`;
- inmutabilidad posterior;
- rechazo fuera de la ventana;
- repetición idempotente.

### 14.3. Componentes

- crear y recuperar borrador docente;
- mostrar códigos una sola vez;
- validar estudiante sin revelar la causa del rechazo;
- continuar escribiendo sin red;
- resolver conflicto sin perder textos;
- confirmar entrega y limpiar equipo;
- bandeja y detalle docente.

### 14.4. Recorrido final

1. Crear paralelo y estudiante ficticios.
2. Crear evaluación con lectura y una pregunta.
3. Abrir y capturar el código.
4. Validar nombre con diferencia de mayúsculas y tildes.
5. Comprobar que `Pena` no coincide con `Peña`.
6. Guardar, desconectar, escribir y reconectar.
7. Entregar y repetir la solicitud.
8. Ver una sola entrega en el panel docente.
9. Comprobar que `anon` no puede leer ninguna tabla.
10. Ejecutar `npm run verify`, React Doctor y smoke alojado antes de publicar.

## 15. Criterios de aceptación

El corte se considera terminado únicamente cuando:

- el circuito completo funciona con datos ficticios;
- ninguna tabla concede acceso a `anon`;
- código y token existen en base solo como hashes;
- los códigos claros se muestran una sola vez;
- treinta validaciones detrás de una IP no provocan bloqueo colectivo;
- el borrador local sobrevive al menos quince minutos sin red;
- un conflicto no sobrescribe ningún texto;
- repetir la entrega no crea duplicados;
- el texto final queda inmutable;
- el estudiante nunca ve evaluación ni retroalimentación;
- el docente puede abrir la respuesta original;
- las pruebas, lint, formato, tipos y build están en verde;
- la publicación solo se realiza después de verificar Supabase remoto y GitHub Pages.

## 16. Secuencia de implementación

1. Cerrar y confirmar el rediseño visual pendiente sin mezclarlo con este corte.
2. Crear servicios, validadores y formulario docente.
3. Añadir la migración transaccional privada y `manage-assessment-access`.
4. Implementar acceso público y `validate-student`.
5. Implementar editor estudiantil, almacenamiento local y `save-draft`.
6. Implementar confirmación y `submit-assessment`.
7. Implementar bandeja y detalle docente.
8. Ejecutar verificación integral local.
9. Aplicar migración y secretos solo tras revisión explícita del proyecto remoto.
10. Publicar y ejecutar el recorrido alojado con datos ficticios.

