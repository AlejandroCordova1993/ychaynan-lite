# Códigos estudiantiles recuperables y exportables

**Fecha:** 4 de septiembre de 2026  
**Estado:** diseño aprobado en conversación; pendiente de revisión documental e implementación  
**Alcance:** Ychayñan Lite, evaluación diagnóstica de un solo docente

## 1. Problema comprobado

La evaluación abierta `evaluacion-ce54278f` tiene 35 accesos: uno activo y 34 sin usar. La implementación actual genera un código aleatorio, persiste únicamente su hash HMAC y devuelve el valor claro una sola vez. Al recargar la pantalla, el código original ya no puede reconstruirse ni descargarse.

Este comportamiento protege el código en reposo, pero no satisface la operación real del docente: distribuir 35 accesos exige volver a consultar, copiar, imprimir o descargar la nómina después de la apertura.

El fallo de ingreso observado es independiente y ya tiene una corrección local: PostgreSQL devuelve `expiresAt` con un offset como `+00:00`, que los validadores del navegador rechazaban después de que el servidor ya había creado la sesión.

## 2. Objetivos

- Permitir que el docente autenticado consulte los códigos actuales mientras la evaluación esté abierta.
- No guardar los códigos en texto abierto ni enviarlos a clientes no autenticados.
- Mostrar el enlace estudiantil real y permitir copiarlo.
- Descargar un CSV compatible con Excel que contenga nombre, paralelo, código, estado y enlace.
- Mantener la impresión de la lista.
- Hacer que la regeneración de un código invalide sesiones anteriores, pero preserve borradores y respuestas.
- Convertir de forma explícita los accesos aleatorios existentes al esquema recuperable.

## 3. Fuera de alcance

- Cuentas de estudiante, correos o contraseñas.
- Envío automático de códigos por correo, mensajería o servicios externos.
- Exportación XLSX o PDF en esta fase; CSV e impresión cubren la necesidad sin nuevas dependencias.
- Recuperación de los códigos aleatorios originales: matemáticamente no es posible a partir de sus hashes.
- Mostrar códigos de evaluaciones cerradas o archivadas.

## 4. Alternativas consideradas

### A. Mostrar y descargar solo al generar

No cambia la base y es la opción más pequeña, pero reproduce el problema actual: si el docente cierra la pestaña o pierde el archivo, debe regenerar códigos individualmente. Se descarta porque no cumple la consulta posterior solicitada.

### B. Guardar códigos cifrados

Permite recuperar exactamente cada código, pero exige una segunda clave de cifrado, rotación de clave, nonce por fila y un procedimiento de recuperación. Es seguro si se implementa correctamente, aunque añade más operación de la necesaria para esta aplicación temporal.

### C. Derivar códigos deterministas versionados — elegida

El servidor deriva el código mediante HMAC-SHA-256 usando `ACCESS_CODE_PEPPER`, el identificador de evaluación, el identificador del estudiante y una generación entera. La base conserva la generación y el hash de validación, nunca el código claro. El servidor puede reconstruir el código actual para un docente autorizado. Regenerar equivale a incrementar la generación.

Esta opción reutiliza el secreto ya configurado, mantiene los códigos fuera de la base y evita introducir otra credencial.

## 5. Modelo de datos

Una migración nueva añadirá a `assessment_access`:

- `code_generation integer not null default 0`;
- restricción `code_generation >= 0`.

Semántica:

- `0`: código heredado aleatorio, no recuperable;
- `1` o superior: código determinista recuperable;
- incrementar el valor produce un código nuevo e invalida el anterior al actualizar `code_hash`.

La migración no altera automáticamente los 35 accesos existentes. Permanecen válidos hasta que el docente confirme su conversión.

## 6. Derivación del código

El código se calcula exclusivamente dentro de `manage-assessment-access`:

```text
HMAC-SHA-256(
  ACCESS_CODE_PEPPER,
  "recoverable-code:v1:<assessmentId>:<studentId>:<generation>"
)
```

Los primeros ocho valores de cinco bits se mapean al alfabeto existente `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. El resultado conserva ocho caracteres, evita letras ambiguas y mantiene el contrato actual del formulario estudiantil.

Después se calcula el `code_hash` actual con la función HMAC separada `hashAccessCode`. La función que lista códigos debe comprobar que el código derivado coincide con el hash almacenado antes de devolverlo. Una inconsistencia se presenta como código no disponible y se registra sin incluir el valor sensible.

## 7. Operaciones de servidor

`manage-assessment-access` seguirá requiriendo JWT y comprobará `app_metadata.role = teacher` dentro de la función. `service_role` permanecerá únicamente en el servidor.

Acciones del contrato:

- `open`: crea accesos nuevos con generación 1 y devuelve la lista inicial.
- `list`: devuelve evaluación, slug, paralelo y accesos; deriva códigos solo para generaciones recuperables en estados `unused`, `active` o `blocked`. Los estados `submitted` y `revoked` nunca exponen un código.
- `regenerate`: incrementa la generación de un acceso no entregado, actualiza su hash, revoca sus sesiones vigentes y devuelve el código nuevo.
- `rotateLegacy`: convierte atómicamente a generación 1 todos los accesos de generación 0 cuyo estado sea `unused`, `active` o `blocked`, actualiza hashes y revoca sus sesiones vigentes. Omite `submitted` y `revoked`.
- `unblock`: conserva su comportamiento actual y no cambia el código.

Las mutaciones de uno o varios accesos se realizarán mediante funciones SQL `SECURITY INVOKER`, con `search_path` fijo, revocadas a `PUBLIC`, `anon` y `authenticated`, y concedidas únicamente a `service_role`. Las funciones antiguas se conservarán durante el despliegue para evitar una ventana de incompatibilidad.

La rotación no elimina `submissions` ni `responses`. Una entrega `in_progress` se reanuda al ingresar con el código nuevo. Una entrega `submitted` nunca se regenera ni vuelve a abrirse.

## 8. Conversión de la evaluación actual

Al detectar generaciones 0, el panel mostrará un aviso:

> Los códigos actuales se generaron con el formato anterior y no pueden recuperarse. Regenera la lista para poder consultarla y descargarla en adelante.

El botón `Regenerar lista completa` exigirá confirmación explícita y mostrará cuántas sesiones activas serán cerradas. Para el estado comprobado al redactar este documento, la conversión afecta 35 accesos elegibles y cierra una sesión activa; conserva su entrega en progreso y cualquier texto guardado.

No habrá rotación automática al cargar la pantalla.

## 9. Interfaz docente

La pantalla `Distribuir accesos` mostrará, para la evaluación abierta:

- título de la evaluación y paralelo;
- enlace estudiantil completo para el origen actual;
- acciones `Copiar enlace`, `Descargar CSV` e `Imprimir`;
- tabla con estudiante, código actual, estado, intentos fallidos y acciones;
- acción de copia por código;
- aviso y acción de conversión cuando existan códigos heredados.

El enlace se forma con el origen y base actuales más `#/evaluacion/<slug>`, por lo que funciona tanto en `localhost` como en GitHub Pages.

Los códigos de entregas ya enviadas se ocultan en la interfaz y quedan vacíos en el CSV porque ya no son necesarios. Los nombres y códigos no se guardan en `localStorage` ni `sessionStorage` docente.

## 10. Descarga CSV

El archivo se generará en el navegador a partir de la respuesta docente autenticada, sin dependencia adicional. Tendrá BOM UTF-8 para Excel y estas columnas:

```text
Nombre completo,Paralelo,Código,Estado,Enlace de evaluación
```

Todos los campos se escaparán según CSV. Los valores que empiecen con `=`, `+`, `-` o `@` se neutralizarán para evitar fórmulas al abrir el archivo en una hoja de cálculo. El nombre será `<slug>-codigos.csv`.

## 11. Seguridad y privacidad

- Los códigos no se almacenan en texto abierto.
- El navegador estudiantil nunca puede listar códigos.
- La consulta docente exige JWT válido y rol en `app_metadata`.
- No se concede acceso nuevo de `anon` o `authenticated` a columnas sensibles.
- `service_role` y `ACCESS_CODE_PEPPER` permanecen dentro de la Edge Function.
- Ningún código, nombre o token se escribe en logs.
- La respuesta usa CORS limitado a los orígenes configurados.
- El hash continúa siendo la única representación usada para validar al estudiante.

## 12. Manejo de errores

- Sesión docente inválida: 401 genérico.
- Rol incorrecto: 403 genérico.
- Evaluación inexistente o no abierta: 404/409 sin detalles internos.
- Código heredado: estado explícito `legacy`, no error de servidor.
- Inconsistencia entre derivación y hash: código omitido y aviso recuperable.
- Rotación concurrente: una sola transacción gana; la respuesta posterior recarga la lista vigente.
- Error de descarga: la lista permanece visible para copiar o imprimir.

## 13. Pruebas

El desarrollo seguirá RED–GREEN–REFACTOR e incluirá:

- derivación estable para la misma evaluación, estudiante y generación;
- cambio de código al aumentar la generación;
- ausencia de código claro en la base y en logs;
- autorización docente de `list`, `regenerate` y `rotateLegacy`;
- rechazo de `anon` y de roles no docentes;
- conversión atómica de accesos heredados;
- revocación de sesiones al regenerar;
- preservación de borradores y respuestas;
- prohibición de regenerar entregas enviadas;
- escape CSV y neutralización de fórmulas;
- enlace correcto en localhost y GitHub Pages;
- estados de carga, error, legado y lista recuperable en React;
- prueba integral de ingreso con un código derivado.

La puerta final será `npm run verify`, React Doctor para los cambios React, migraciones PGlite, `supabase db lint`, comparación de migraciones y un smoke remoto controlado.

## 14. Secuencia de despliegue

1. Crear y probar la migración local.
2. Añadir operaciones nuevas sin retirar las antiguas.
3. Aplicar la migración al proyecto enlazado y verificar migraciones y lint.
4. Desplegar `manage-assessment-access` compatible con ambas generaciones.
5. Publicar el frontend actualizado.
6. Confirmar manualmente `Regenerar lista completa` para la evaluación actual.
7. Descargar el CSV y validar un ingreso estudiantil ficticio.
8. Retirar compatibilidad heredada únicamente en una fase posterior documentada.

## 15. Criterios de aceptación

- El docente puede volver a abrir la pantalla y consultar los códigos vigentes.
- La lista puede copiarse, imprimirse y descargarse como CSV.
- El enlace estudiantil está visible y funciona en el entorno actual.
- Ningún código claro queda almacenado en PostgreSQL.
- Regenerar invalida el código anterior y las sesiones previas sin borrar borradores.
- Los accesos existentes solo cambian después de confirmación explícita.
- Un estudiante con datos correctos entra y carga la evaluación.
- El estudiante no ve rúbrica, resultados ni códigos ajenos.
