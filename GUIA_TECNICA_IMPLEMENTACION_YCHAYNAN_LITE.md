# Guía técnica de implementación de Ychayñan Lite

**Versión:** 1.4  
**Fecha:** 29 de agosto de 2026  
**Estado:** arquitectura aprobada; cimentación local verificada; MVP aún no operativo  
**Documento hermano:** DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md  
**Naturaleza:** aplicación web temporal para una campaña diagnóstica puntual

**Estado operativo verificable:** `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`

---

## 1. Propósito y autoridad

Esta guía indica exactamente con qué herramientas construir Ychayñan Lite, cómo dividir el código, qué datos guardar, qué operaciones exponer, cómo proteger la información, cómo publicar la aplicación y cómo retirarla después de exportar los resultados.

No redefine la pedagogía. Ante contradicciones se aplica este orden:

1. La instrucción explícita y más reciente del docente responsable.
2. DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md para finalidad, alcance y reglas funcionales.
3. Esta guía para decisiones técnicas e implementación.
4. RUBRICA_DIAGNOSTICA_COMPLETA.md para significado pedagógico, criterios y descriptores.
5. La copia congelada de rubric-v1.json para ejecución; una prueba valida su contrato estructural y cada cambio exige revisar su correspondencia semántica con la rúbrica humana.
6. Migraciones, código y pruebas como evidencia del comportamiento desplegado.

Toda desviación debe registrarse en la sección de decisiones técnicas antes de programarse.

---

## 2. Decisión arquitectónica cerrada

Ychayñan Lite se construirá como una aplicación separada, pequeña y temporal. No será un módulo de Ecuafuturo ni reutilizará su base de datos de producción.

Arquitectura:

    Navegador del estudiante o docente
                  |
                  v
    GitHub Pages: React + TypeScript + Vite
                  |
                  v
    Supabase Edge Functions
       |                     |
       v                     v
    PostgreSQL            Proveedor de IA
    + Auth                solo desde backend

Decisiones obligatorias:

- El frontend se publica gratuitamente en GitHub Pages.
- La URL será del tipo https://usuario.github.io/ychaynan-lite/.
- No se compra ni configura un dominio propio.
- El repositorio puede ser público.
- La página publicada también es pública, pero los resultados y el panel docente no lo son.
- Supabase se crea como proyecto independiente y desechable.
- Solo el docente posee una cuenta.
- El estudiante se identifica mediante evaluación, código personal y nombre completo.
- El estudiante nunca consulta directamente las tablas.
- La IA nunca se llama desde el navegador.
- No existe retroalimentación para el estudiante.
- Existe una única entrega por estudiante y evaluación; Lite no admite reaperturas posteriores.
- La campaña se exporta y después puede archivarse. La eliminación de entregas y resultados queda fuera de la interfaz Lite y requiere un procedimiento administrativo autorizado.

---

## 3. Objetivo de producto mínimo

La primera y única versión operativa debe permitir:

1. Autenticar al docente.
2. Crear paralelos e importar la nómina.
3. Crear una evaluación con lectura corta, una a cuatro preguntas y rúbrica congelada.
4. Generar un código personal por estudiante.
5. Abrir y cerrar la evaluación.
6. Validar código y nombre completo sin cuentas estudiantiles.
7. Guardar un borrador y recibir una sola entrega.
8. Conservar exactamente el texto escrito.
9. Evaluar una entrega o todas las entregas pendientes de un paralelo con IA.
10. Permitir revisión, edición y aprobación docente.
11. Mostrar métricas diagnósticas sencillas.
12. Exportar CSV y JSON compatibles con una futura importación en Ecuafuturo.

No se construirá una plataforma general, un sistema comercial ni una arquitectura para múltiples instituciones.

---

## 4. Funciones deliberadamente excluidas

No implementar:

- registro o inicio de sesión estudiantil;
- varios docentes o roles institucionales;
- licencias, pagos, planes o dominios propios;
- tutor conversacional;
- retroalimentación inmediata al estudiante;
- actividades gamificadas o autocorregibles;
- mensajería, correo o notificaciones;
- edición colaborativa;
- sincronización en tiempo real con Google Sheets;
- integración automática con Ecuafuturo;
- seguimiento longitudinal dentro del Lite;
- generación de lecturas completas o actividades cerradas con IA;
- colas externas, microservicios o contenedores;
- almacenamiento de archivos si basta texto;
- analítica institucional compleja;
- detector de plagio o de autoría mediante IA;
- aplicaciones móviles nativas;
- funcionamiento sin conexión completo;
- internacionalización;
- importación XLSX;
- códigos QR;
- dashboard de cobertura curricular.

Si una solicitud futura pertenece a esta lista, primero debe justificarse por escrito. La preferencia predeterminada es exportar el dato y resolver la función permanente en Ecuafuturo.

---

## 5. Herramientas seleccionadas

### 5.1. Frontend

- React con TypeScript.
- Vite para desarrollo y compilación.
- React Router usando HashRouter.
- Supabase JavaScript Client para la sesión docente.
- React Hook Form para formularios.
- Zod para validar entradas y respuestas de API.
- CSS Modules o una hoja de estilos por capas; no incorporar un framework visual pesado.
- Lucide React únicamente si se necesitan iconos.

No usar Redux, Zustand ni otra biblioteca global. El tamaño del producto no lo justifica. El estado remoto se encapsula en servicios y hooks pequeños; la sesión docente puede mantenerse en un contexto de React.

### 5.2. Backend y datos

- Supabase PostgreSQL.
- Supabase Auth con correo y contraseña para un único docente.
- Supabase Edge Functions escritas en TypeScript.
- Migraciones SQL versionadas dentro del repositorio.
- Row Level Security en todas las tablas del esquema expuesto.

### 5.3. Inteligencia artificial

- Un único proveedor configurado mediante variables de entorno para generación y evaluación.
- Una interfaz interna de proveedor para poder cambiar modelo sin alterar el dominio.
- Salida JSON validada por esquema.
- Temperatura o variabilidad baja.
- Toda identidad estudiantil excluida de la solicitud.

No se diseñará un enrutador multProveedor. La abstracción tendrá solo los métodos mínimos para evaluar una respuesta y comprobar disponibilidad.

### 5.4. Publicación

- Repositorio público en GitHub.
- GitHub Actions para comprobar, compilar y publicar.
- GitHub Pages como alojamiento estático.
- Supabase CLI para migraciones y Edge Functions.

### 5.5. Calidad

- ESLint.
- Prettier.
- Vitest y Testing Library.
- Playwright para recorridos críticos.
- Pruebas SQL o de integración contra un proyecto local o de prueba.

---

## 6. Repositorio y estructura del proyecto

Crear un repositorio separado de Ecuafuturo. Nombre recomendado: ychaynan-lite.

Estructura:

    /
    ├─ .github/
    │  └─ workflows/
    │     ├─ verify.yml
    │     └─ deploy-pages.yml
    ├─ docs/
    │  ├─ DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md
    │  ├─ GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md
    │  ├─ RUBRICA_DIAGNOSTICA_COMPLETA.md
    │  └─ rubric-v1.json
    ├─ public/
    ├─ src/
    │  ├─ app/
    │  │  ├─ App.tsx
    │  │  ├─ router.tsx
    │  │  └─ providers.tsx
    │  ├─ components/
    │  │  ├─ common/
    │  │  ├─ student/
    │  │  └─ teacher/
    │  ├─ features/
    │  │  ├─ auth/
    │  │  ├─ roster/
    │  │  ├─ assessments/
    │  │  ├─ submissions/
    │  │  ├─ evaluation/
    │  │  ├─ dashboard/
    │  │  └─ export/
    │  ├─ lib/
    │  │  ├─ api/
    │  │  ├─ supabase/
    │  │  ├─ validation/
    │  │  └─ formatting/
    │  ├─ styles/
    │  ├─ test/
    │  └─ main.tsx
    ├─ supabase/
    │  ├─ functions/
    │  │  ├─ _shared/
    │  │  ├─ manage-assessment-access/
    │  │  ├─ validate-student/
    │  │  ├─ save-draft/
    │  │  ├─ submit-assessment/
    │  │  ├─ generate-assessment-draft/
│  │  ├─ evaluate-submission/
    │  │  └─ export-campaign/
    │  ├─ migrations/
    │  ├─ seed.sql
    │  └─ config.toml
    ├─ .env.example
    ├─ .gitignore
    ├─ package.json
    ├─ package-lock.json
    ├─ tsconfig.json
    ├─ vite.config.ts
    └─ README.md

Reglas:

- Un componente no llama directamente a fetch ni contiene SQL.
- Las operaciones remotas viven en src/lib/api.
- Las reglas de negocio reutilizables viven en la característica correspondiente.
- Las funciones comparten autenticación, CORS, respuestas y validación desde supabase/functions/_shared.
- No copiar módulos completos de Ecuafuturo. Solo reutilizar conceptos comprobados y código cuya dependencia esté clara.

---

## 7. Navegación y rutas

Usar HashRouter porque GitHub Pages no ofrece reescritura de rutas para una aplicación SPA.

Rutas públicas:

- #/evaluacion/:slug: acceso estudiantil.
- #/evaluacion/:slug/responder: lectura y preguntas, requiere sesión estudiantil temporal.
- #/evaluacion/:slug/entregada: confirmación sin resultados.

Rutas docentes:

- #/docente/ingresar
- #/docente
- #/docente/paralelos
- #/docente/evaluacion
- #/docente/accesos
- #/docente/respuestas
- #/docente/respuestas/:submissionId
- #/docente/diagnostico
- #/docente/exportar

Una protección de ruta en el frontend mejora la experiencia, pero no constituye autorización. Toda lectura o escritura sensible se vuelve a autorizar en Supabase.

La aplicación tendrá una sola evaluación activa por campaña. La ruta de creación puede editar el borrador hasta abrirlo. Después de recibir la primera entrega, la lectura, las preguntas y la rúbrica quedan congeladas.

---

## 8. Flujos principales

### 8.1. Preparación docente

1. El docente inicia sesión.
2. Crea los paralelos.
3. Importa un CSV y revisa la codificación en una vista previa.
4. Revisa caracteres dañados, filas inválidas o duplicadas; corrige el CSV y vuelve a cargarlo si es necesario.
5. Crea la evaluación.
6. Pega la lectura y escribe las preguntas.
7. Selecciona criterios y módulos aplicables.
8. Revisa la vista previa.
9. Congela la rúbrica.
10. Genera códigos personales.
11. Ejecuta una entrega de prueba con un estudiante ficticio.
12. Comprueba acceso simultáneo desde una sola red y una interrupción de quince minutos.
13. Abre la evaluación.

#### 8.1.1. Importación CSV

El importador acepta únicamente archivos CSV. Lee el archivo como bytes, reconoce BOM UTF-8, intenta UTF-8 estricto y, si falla, propone Windows-1252. Antes de insertar muestra la codificación detectada, permite elegir UTF-8 o Windows-1252, muestra el número de filas y una vista previa que incluye nombres con tildes y `ñ`. Si aparecen caracteres de reemplazo, la importación se bloquea. Las filas inválidas y duplicadas quedan visibles con su motivo y solo se insertan las filas válidas después de la confirmación docente. No se instala SheetJS.

### 8.2. Participación estudiantil

1. El estudiante abre el enlace público.
2. Ingresa código personal y nombre completo.
3. El backend verifica evaluación abierta, código, nombre y estado.
4. El backend devuelve un token temporal opaco.
5. El estudiante lee y responde.
6. La aplicación guarda borradores.
7. El estudiante confirma la entrega.
8. El backend crea la entrega final de forma idempotente.
9. La interfaz muestra solo la confirmación de recepción.

### 8.3. Análisis docente

1. El docente cierra la ventana o espera su vencimiento.
2. Abre la lista de respuestas.
3. Evalúa una respuesta o inicia el lote del paralelo.
4. La IA devuelve criterios, evidencias y observaciones estructuradas.
5. El docente revisa cada análisis.
6. Aprueba, corrige o descarta la salida.
7. El dashboard usa resultados revisados y distingue los provisionales.
8. El docente exporta la campaña.

---

## 9. Identidad estudiantil sin cuentas

La nómina es la identidad estable. Cada estudiante tiene:

- UUID interno;
- paralelo;
- nombres y apellidos originales;
- nombre normalizado;
- variantes autorizadas opcionales;
- estado activo o inactivo.

Cada estudiante recibe un código aleatorio distinto para la evaluación. El enlace general no identifica a una persona.

El código:

- tendrá ocho caracteres legibles;
- excluirá caracteres ambiguos como 0/O y 1/I;
- se generará con aleatoriedad criptográfica;
- se mostrará una sola vez al docente;
- se almacenará como HMAC-SHA-256 con una clave secreta de servidor;
- no aparecerá en registros de aplicación.

La validación exige simultáneamente:

- evaluación abierta;
- código válido;
- nombre coincidente;
- estudiante activo;
- entrega no finalizada.

No devolver mensajes que revelen si falló el código o el nombre. La respuesta pública será: “No pudimos validar los datos. Revisa la información o consulta al docente”.

---

## 10. Normalización exacta de nombres

La normalización se ejecutará en frontend solo como ayuda y nuevamente en backend como autoridad.

Algoritmo:

1. Convertir el valor a Unicode NFC.
2. Eliminar espacios al inicio y al final.
3. Convertir a minúsculas con configuración española.
4. Reemplazar vocales acentuadas por su vocal base: á, é, í, ó y ú.
5. Tratar ü como u para evitar errores de digitación frecuentes.
6. Conservar ñ como ñ; nunca convertirla en n.
7. Reemplazar secuencias de espacios por un solo espacio.
8. Tratar guion y apóstrofo como separadores normalizables, sin eliminar letras.
9. Rechazar dígitos y caracteres de control.

Ejemplos:

| Entrada | Normalizada | Coincide |
|---|---|---|
| María José Peña Ñacato | maria jose peña ñacato | sí |
| MARIA JOSE PEÑA ÑACATO | maria jose peña ñacato | sí |
| Maria José Peña Ñacato | maria jose peña ñacato | sí |
| Maria Jose Pena Nacato | maria jose pena nacato | no |

La coincidencia normal exige los dos nombres y los dos apellidos registrados. Si la nómina oficial tiene una excepción, el docente agrega una variante explícita. No usar similitud difusa automática: podría abrir el registro equivocado.

---

## 11. Sesión temporal del estudiante

Al validar la identidad, la función genera 32 bytes aleatorios y devuelve el token en formato base64url. La base de datos guarda únicamente su hash SHA-256. El límite de red se configura por encima del tamaño esperado del aula y nunca bloquea individualmente solo por compartir IP. El panel permite desbloquear, autorizar una variante o regenerar el código.

Propiedades:

- se almacena en sessionStorage, no en localStorage;
- expira al cerrar la evaluación o después de un máximo configurable;
- pertenece a un solo estudiante y evaluación;
- puede guardar borrador y entregar, pero no leer otras respuestas;
- no permite consultar rúbrica, análisis ni datos de compañeros;
- una validación nueva invalida la sesión anterior si todavía no existe entrega final;
- después de entregar queda inutilizable;
- el borrador vive temporalmente en localStorage bajo una clave de campaña, mientras el token permanece en sessionStorage;
- “Finalizar y limpiar este equipo” borra token, borrador y estado local después de la entrega.

Si el navegador se cierra antes de entregar, el estudiante puede volver a validar sus datos y continuar el borrador. Si ya entregó, recibe únicamente el estado de entrega completada.

---

## 12. Modelo de datos físico

La versión inicial utiliza diez tablas. Todas las claves primarias son UUID y las fechas usan `timestamptz` en UTC. Supabase Auth contiene al único docente, identificado por `app_metadata.role = teacher`; el registro público permanece deshabilitado.

### 12.1. `groups`

`id`, `name`, `school_year`, `status`, `created_at` y `updated_at`. Índice único por año y nombre original; la normalización se usa para la coincidencia de nombres del acceso estudiantil, no para crear duplicados de paralelos.

### 12.2. `students`

`id`, `group_id`, `full_name_original`, `full_name_normalized`, `authorized_variants`, `status`, `external_reference` y fechas. Se permiten homónimos.

### 12.3. `assessments`

`id`, `slug`, título, propósito, lectura, instrucciones, apertura, cierre, estado, política de pegado, versión curricular y fechas. Incluye `rubric_snapshot`, `rubric_schema_version` y `rubric_hash`. Solo una evaluación puede estar abierta.

### 12.4. `questions`

`id`, `assessment_id`, orden, consigna, instrucciones, extensión orientativa, criterios activos, módulos habilitados, códigos de observación permitidos y relaciones curriculares. Posición única por evaluación.

### 12.5. `assessment_access`

`id`, evaluación, estudiante, hash del código, estado, intentos, espera y fechas. Hay restricciones únicas por evaluación y estudiante y por evaluación y hash del código. Un bloqueo siempre es temporal y el docente puede retirarlo.

### 12.6. `student_sessions`

`id`, acceso, hash del token, expiración, revocación y último uso. Nunca guarda el token original.

### 12.7. `access_rate_limits`

`id`, evaluación, hash temporal de red o dispositivo, ventana, conteo y espera. El umbral por IP debe superar holgadamente el tamaño del aula; sirve para abuso masivo, no para identificar estudiantes.

### 12.8. `submissions`

`id`, evaluación, estudiante, estado, inicio, entrega, `client_submission_key`, `draft_version integer not null default 0` y fechas. `draft_version` representa la versión del borrador completo de una entrega, no una versión independiente por pregunta; tiene `CHECK (draft_version >= 0)`. Lite no guarda reaperturas y mantiene una restricción única por evaluación y estudiante.

### 12.9. `responses`

`id`, entrega, pregunta, texto original, conteo de palabras, fecha de borrador, fecha de entrega y hash de contenido. Restricción única por entrega y pregunta. La respuesta completa queda inmutable al entregar; tampoco puede eliminarse ni agregarse otra respuesta a una entrega ya entregada.

### 12.10. `ai_evaluations`

`id`, `submission_id`, versión y hash de rúbrica, versión de prompt, proveedor, modelo, estado, resultado JSON por pregunta, resumen por dimensión, confianza, error seguro y fechas. Conserva salida original inmutable, ajustes, nota, identidad y fecha de revisión docente.

Una restricción única evita dos evaluaciones activas de la misma entrega, rúbrica y versión de prompt.

Mapeo documental de estados: el maestro llama `evaluating` al estado técnico `running` y `evaluated` al estado técnico `completed`; los contratos de API y las migraciones usan los nombres técnicos.

La Data API se expone únicamente mediante GRANT explícitos para `authenticated`; `anon` no recibe privilegios sobre las tablas. RLS continúa siendo obligatorio y limita las filas permitidas.

La versión utiliza exactamente diez tablas. No existen `teacher_profiles`, `rubric_versions` ni `audit_events`: esta versión no conserva una bitácora general de eventos. La autenticación identifica al único docente mediante `app_metadata.role = teacher`, la rúbrica y las preguntas quedan congeladas al abrir la evaluación y la trazabilidad mínima vive en `ai_evaluations`.

---

## 13. Restricciones e invariantes de base de datos

Implementar en SQL, no únicamente en la interfaz:

- Una entrega por assessment_id y student_id.
- Una respuesta por submission_id y question_id.
- No entregar una evaluación que no esté abierta.
- No entregar después de closes_at.
- No editar respuestas de una entrega submitted.
- No cambiar lectura, preguntas ni rúbrica después de la primera entrega.
- No aprobar una evaluación de IA sin usuario docente autenticado.
- No convertir una evaluación failed en reviewed.
- No eliminar un estudiante con entrega; se marca inactivo.
- No modificar el snapshot de rúbrica después de abrir la evaluación.
- Toda evaluación de IA referencia una entrega existente.

Usar transacciones para:

- importar nómina;
- abrir la evaluación y generar accesos;
- entregar respuestas;
- aprobar una revisión;
- construir la exportación final.

---

## 14. Autorización y RLS

### 14.1. Docente

El único usuario autenticado puede leer y modificar los datos del proyecto. El registro público está deshabilitado y las políticas RLS exigen rol authenticated; no se crea una tabla de perfil.

El rol anon no recibe permisos directos sobre:

- students;
- assessment_access;
- student_sessions;
- submissions;
- responses;
- ai_evaluations;

### 14.2. Estudiante

Todas las operaciones estudiantiles pasan por Edge Functions. Las funciones:

1. validan cuerpo y tamaño;
2. verifican origen;
3. aplican límite de intentos;
4. validan token de sesión cuando corresponda;
5. ejecutan una operación concreta con service role;
6. devuelven la mínima información necesaria.

### 14.3. Claves

Permitidas en el frontend:

- URL pública de Supabase;
- clave publicable o anon de Supabase;
- versión pública de la aplicación.

Prohibidas en el frontend y en Git:

- service role;
- clave del proveedor de IA;
- pepper de códigos;
- secretos de sesión;
- credenciales reales;
- copias de la base de datos.

---

## 15. Contratos de Edge Functions

El contrato objetivo contiene siete funciones; cuatro están desplegadas, una tiene implementación local pendiente de despliegue y dos siguen pendientes. Todas responderán con `{ ok, data }` o `{ ok: false, error: { code, message } }` y nunca expondrán trazas, SQL ni mensajes privados del proveedor.

### 15.1. `manage-assessment-access`

Requiere JWT docente y recibe una acción `open`, `regenerate` o `unblock`. Genera códigos aleatorios legibles de ocho caracteres, usa `ACCESS_CODE_PEPPER` para calcular HMAC y persiste únicamente el hash. El código en claro se devuelve una sola vez al docente, exclusivamente en la respuesta que lo creó o regeneró.

La acción `open` usa una operación SQL transaccional `security invoker`, invocable solo por `service_role`, para abrir la evaluación y crear los accesos de forma atómica. `PUBLIC`, `anon` y `authenticated` no reciben `EXECUTE` sobre esa operación. `regenerate` invalida el código anterior sin exponerlo y `unblock` retira el bloqueo temporal autorizado.

### 15.2. `validate-student`

Recibe `assessmentSlug`, `fullName` y `personalCode`. Valida estado, coincidencia exacta normalizada, límites y entrega previa. Devuelve token temporal, expiración, evaluación, preguntas, borrador y estado. No acepta nombres parciales ni revela qué dato falló.

El límite por IP es amplio y no bloquea el aula. Los intentos por código y dispositivo aplican espera progresiva. El docente puede desbloquear, autorizar variante o regenerar.

### 15.3. `save-draft`

Recibe token, `clientSubmissionKey`, respuestas por pregunta y `expectedDraftVersion`. Verifica evaluación abierta, límites, estado editable e idempotencia. Actualiza el borrador completo solo cuando `expectedDraftVersion` coincide con `submissions.draft_version`; al tener éxito incrementa ese campo y devuelve la nueva versión. Si no coincide, devuelve un conflicto sin sobrescribir el borrador más reciente.

### 15.4. `submit-assessment`

Recibe token, clave idempotente, respuestas completas y confirmación. En una transacción guarda, calcula conteos y hashes, cambia estado, invalida sesión y marca acceso como entregado. Una repetición devuelve el mismo recibo.

### 15.5. generate-assessment-draft

Requiere un JWT docente y recibe la lectura, un propósito opcional, entre una y cuatro preguntas y un foco diagnóstico. La función llama al proveedor configurado desde el servidor, valida una respuesta JSON estricta y devuelve una propuesta de título, propósito, instrucciones y preguntas abiertas con criterios y módulos permitidos. No persiste el borrador ni modifica la lectura: el navegador muestra una vista previa y el docente debe aplicarla explícitamente antes de guardarla.

La solicitud no incluye estudiantes ni datos de entregas. Si falta la clave del proveedor, el JSON es inválido o se agota el tiempo, devuelve un mensaje seguro sin detalles del proveedor. La generación es una ayuda editorial, no una publicación automática.

### 15.6. `evaluate-submission`

Requiere docente y recibe `submissionId` y `forceRetry` solo para estados fallidos. Carga una entrega completa, lectura, preguntas, criterios, módulos, subconjuntos de observación y rúbrica congelada. Envía una sola solicitud al proveedor sin nombre, paralelo ni identificador estudiantil. Persiste resultados separados por pregunta y resumen por dimensión.

El panel obtiene entregas pendientes y llama esta función con un máximo de tres solicitudes simultáneas. No existe `evaluate-batch`: la persistencia permite reanudar el lote después de recargar.

### 15.7. `export-campaign`

Requiere docente y genera CSV, JSON y manifiesto después de cerrar la evaluación. No se añade almacenamiento de objetos mientras el tamaño permita una descarga directa.

---

## 16. Límites de entrada

Definir constantes compartidas:

- nombre completo: 160 caracteres;
- código: 12 caracteres de entrada, aunque se emitan ocho;
- lectura: 30 000 caracteres;
- título: 160 caracteres;
- pregunta: 2 000 caracteres;
- respuesta individual: 20 000 caracteres;
- una a cuatro preguntas;
- una entrega completa por llamada de IA;
- máximo tres llamadas de IA simultáneas desde el panel.

El backend vuelve a validar todos los límites. Los textos se almacenan como texto plano; no aceptar HTML del usuario.

---

## 17. Evaluación con IA

### 17.1. Entrada por entrega

Una llamada contiene lectura, propósito, preguntas, instrucciones y todas las respuestas de una sola entrega. Cada pregunta declara criterios, módulos y códigos de observación permitidos. Se incluye la copia congelada de la rúbrica y la versión del prompt.

No se envían nombre, paralelo, código, identificador estudiantil, dirección IP ni respuestas de otra persona. El `submission_id` permanece en la base local y se agrega después.

El catálogo completo de 27 observaciones no se envía indiscriminadamente. El programa deriva un subconjunto desde los criterios activos de cada pregunta.

### 17.2. Protección frente al contenido

Lectura y respuestas son datos no confiables. Cualquier instrucción que aparezca dentro de ellos se trata como contenido a analizar, no como orden. Sistema, rúbrica, lectura, preguntas y respuestas se delimitan estructuralmente.

Cuando el proveedor admita caché de prompt, la parte común —instrucciones, lectura y rúbrica— se coloca primero y de forma estable. No se mezclan varias entregas para ahorrar costo.

### 17.3. Salida

El JSON contiene:

- `questionResults` con criterio, nivel 1–4 o `no_aplica`, razón, evidencias, confianza y revisión;
- módulos solo cuando fueron habilitados;
- observaciones permitidas, con fragmento, explicación y severidad;
- fortalezas y prioridades por pregunta;
- `dimensionSummaries` para las cuatro dimensiones;
- confianza global y limitaciones.

Las cuatro dimensiones son la entrada principal del dashboard; los criterios siguen disponibles como detalle.

### 17.4. Validación

La función valida esquema, criterios permitidos, niveles, longitud y estados. Las evidencias se comparan de forma normalizada: Unicode, espacios, tildes y comillas tipográficas, sin modificar el original almacenado.

Si una evidencia no aparece, solo ese criterio queda `needs_evidence_review`. La entrega completa falla únicamente cuando el JSON no puede validarse o repararse una vez de manera controlada.

### 17.5. Tiempo y reintentos

La función establece un timeout interno de 90 segundos, inferior al límite alojado documentado. Los errores temporales quedan `failed` y pueden reintentarse de forma idempotente. Solo se adopta un patrón asíncrono de iniciar y sondear si el pilotaje demuestra que el modelo supera regularmente ese tiempo.

### 17.6. Revisión docente

La pantalla presenta lectura, preguntas, respuestas, dimensiones, criterios, evidencias, observaciones, fortalezas, prioridades y limitaciones. El docente aprueba, cambia, elimina, agrega o descarta. La salida original y los ajustes se conservan en `ai_evaluations`; el dashboard definitivo prioriza la revisión docente.

---

## 18. Dashboard mínimo

Construir sin una biblioteca pesada de gráficos. La portada presenta las cuatro dimensiones:

- comprensión lectora;
- respuesta y razonamiento;
- organización discursiva;
- convenciones de escritura.

Cada dimensión permite desplegar criterios, evidencias y cantidad de respuestas aplicables. También se muestran estudiantes esperados, iniciados y entregados; pendientes de IA; análisis por revisar; matriz estudiante por dimensión; observaciones frecuentes; fortalezas y necesidades de planificación.

Reglas:

- indicar denominador;
- separar sin entrega, sin evaluar, provisional y revisado;
- excluir `no_aplica` del denominador;
- no convertir datos faltantes en cero;
- no presentar puntuación global, ranking ni causalidad;
- no implementar comparación longitudinal ni cobertura curricular;
- conservar códigos curriculares solo en pregunta, detalle y exportación.

No se necesita actualización en tiempo real. Una recarga después de cada operación es suficiente.

---

## 19. Exportación

### 19.1. CSV

Generar archivos UTF-8 con BOM para apertura correcta en Excel:

- groups.csv
- students.csv
- assessments.csv
- questions.csv
- submissions.csv
- responses.csv
- criterion_results.csv
- observations.csv
- teacher_reviews.csv
- curriculum_links.csv

Cada relación usa UUID, no nombre. El nombre original aparece solo donde sea necesario.

### 19.2. JSON

Generar campaign-export.json con:

- exportSchemaVersion;
- exportedAt;
- applicationVersion;
- assessment;
- rubricSnapshot;
- curriculumVersion;
- groups;
- students;
- submissions;
- responses;
- aiEvaluations;
- teacherReviews;
- checksums.

### 19.3. Manifiesto

Incluir manifest.json con:

- listado de archivos;
- número de filas por archivo;
- SHA-256 de cada archivo;
- fecha;
- versión de esquema;
- advertencias de elementos pendientes.

La exportación debe advertir si existen entregas sin evaluar o análisis sin revisar, pero el docente puede exportar de todas maneras.

No implementar Google Sheets API. El docente puede importar los CSV manualmente en Google Sheets.

---

## 20. Diseño de interfaz

La identidad visual se diseña desde cero y no copia la marca de Ecuafuturo.

Principios:

- una acción principal por pantalla;
- lenguaje directo y docente;
- lectura cómoda en computadoras y teléfonos;
- ancho de lectura entre 60 y 75 caracteres;
- contraste WCAG 2.2 AA;
- foco visible;
- navegación por teclado;
- campos con etiquetas persistentes;
- mensajes de error próximos al campo;
- confirmación antes de entregar;
- estados vacíos y de carga comprensibles;
- color nunca como único indicador.

Pantalla estudiantil:

- sin menú general;
- encabezado discreto;
- lectura y preguntas claramente separadas;
- contador de palabras informativo, no punitivo;
- indicador de guardado;
- botón de entrega visible solo al final;
- ningún puntaje, nivel o comentario.

Panel docente:

- navegación corta;
- tablas filtrables por paralelo y estado;
- etiquetas explícitas para IA provisional y revisión docente;
- acciones de lote protegidas con confirmación;
- exportación visible al cerrar la campaña.

---

## 21. Guardado, desconexión y limpieza

El texto se guarda en `localStorage` bajo una clave de campaña después de cada cambio y en servidor después de una pausa, al cambiar de pregunta y antes de entregar. El token permanece exclusivamente en `sessionStorage`.

La interfaz distingue “Guardando”, “Guardado”, “Sin conexión” y “No pudimos guardar”. No afirma guardado remoto sin confirmación.

Requisito probado: el estudiante puede continuar escribiendo durante al menos quince minutos sin red. Al volver la conexión, se reusa la misma `clientSubmissionKey` y se sincroniza sin duplicar. La pantalla no se limpia antes de recibir el recibo.

Después de entregar aparece “Finalizar y limpiar este equipo”. La acción elimina token, borrador, identificadores locales y estado de formulario. También se ejecuta automáticamente tras mostrar y confirmar el recibo durante un intervalo breve.

---

## 22. Manejo de errores

Definir códigos estables:

- VALIDATION_FAILED
- ASSESSMENT_NOT_OPEN
- ACCESS_DENIED
- RATE_LIMITED
- SESSION_EXPIRED
- ALREADY_SUBMITTED
- DRAFT_CONFLICT
- SUBMISSION_FAILED
- AI_PROVIDER_UNAVAILABLE
- AI_INVALID_OUTPUT
- AI_EVALUATION_EXISTS
- EXPORT_INCOMPLETE
- INTERNAL_ERROR

Los registros privados pueden contener correlationId y detalles técnicos. La interfaz recibe solo mensajes seguros.

No reintentar automáticamente:

- validación de identidad;
- entrega confirmada con error de negocio;
- evaluación rechazada por datos inválidos.

Sí se puede reintentar con espera creciente:

- interrupciones de red;
- error temporal de IA;
- error 429 o 5xx del proveedor.

---

## 23. CORS y orígenes

En producción, las Edge Functions aceptan únicamente:

- https://USUARIO.github.io

El path del repositorio no forma parte del Origin del navegador. Todos los repositorios Pages de la misma cuenta comparten el origen `https://USUARIO.github.io`; por ello CORS es solo una defensa del navegador y nunca sustituye la autenticación o el token estudiantil. En desarrollo se permite solo el origen local declarado.

No usar comodín en producción. Aceptar métodos y cabeceras mínimos. Responder OPTIONS correctamente.

GitHub Pages sirve el sitio por HTTPS. Todas las llamadas al backend también usan HTTPS.

---

## 24. Variables de entorno

### 24.1. Frontend

Incluir en .env.example:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_APP_VERSION
- VITE_ASSESSMENT_SLUG opcional

Estas variables son públicas después de compilar. Nunca guardar secretos con prefijo VITE.

### 24.2. Edge Functions

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- AI_PROVIDER
- AI_API_KEY
- AI_MODEL
- ACCESS_CODE_PEPPER
- ALLOWED_ORIGIN
- DEEPSEEK_API_KEY
- DEEPSEEK_MODEL
- AI_GENERATION_TIMEOUT_MS
- PROMPT_VERSION

Configurar secretos con Supabase, no en archivos del repositorio.

### 24.3. GitHub

GitHub Actions requiere las variables públicas del frontend. Aunque no sean secretos, se administran como variables del repositorio para evitar valores dispersos.

---

## 25. Configuración de Vite y GitHub Pages

Si el repositorio se llama ychaynan-lite:

- base de Vite: /ychaynan-lite/;
- router: HashRouter;
- salida: dist;
- assets con rutas relativas a base;
- no depender de reescrituras 404.

El flujo deploy-pages.yml:

1. se activa al publicar cambios en la rama principal;
2. instala la versión LTS de Node declarada por el proyecto;
3. ejecuta npm ci;
4. ejecuta lint, pruebas y compilación;
5. carga dist como artefacto de Pages;
6. despliega mediante las acciones oficiales de GitHub Pages.

Permisos mínimos:

- contents: read;
- pages: write;
- id-token: write.

Usar el environment github-pages. No desplegar si falla una verificación.

---

## 26. Configuración del repositorio público

El repositorio puede contener:

- código;
- migraciones;
- datos sintéticos;
- documentación redactada para publicación;
- .env.example sin valores;
- rúbrica propia si el docente autoriza su publicación.

No puede contener:

- nóminas;
- nombres reales;
- respuestas;
- exportaciones;
- registros;
- capturas con datos;
- códigos personales;
- claves;
- archivos .env;
- documentos curriculares o de terceros que no puedan redistribuirse;
- copias de la base de datos.

Incluir .gitignore para env, exportaciones, resultados, archivos temporales y datos locales. Los tests usarán nombres ficticios.

Que el repositorio sea público no concede automáticamente una licencia abierta. La elección de licencia de código se decide por separado.

---

## 27. Desarrollo local

Secuencia:

1. Instalar Node LTS y Supabase CLI.
2. Clonar el repositorio.
3. Ejecutar npm ci.
4. Copiar .env.example a .env.local y completar valores locales.
5. Iniciar Supabase local.
6. Aplicar migraciones y seed sintético.
7. Servir Edge Functions.
8. Ejecutar Vite.
9. Acceder con el docente ficticio local.

Comandos recomendados en package.json:

- npm run dev
- npm run lint
- npm run format:check
- npm run typecheck
- npm test
- npm run test:e2e
- npm run build
- npm run verify

npm run verify ejecuta lint, typecheck, pruebas y build.

Fijar dependencias con package-lock.json. No actualizar versiones durante la campaña sin una razón comprobada.

Auditoría actual (29-08-2026): `npm audit` no reporta vulnerabilidades en el árbol completo después de actualizar React Router a 7.18.3, Vite a 8.2.2, `@vitejs/plugin-react` a 6.1.1 y Vitest a 4.1.11. El lockfile fue regenerado y la instalación limpia se comprobó con `npm ci`. Las versiones deben mantenerse fijadas durante la campaña salvo una razón comprobada.

---

## 28. Pruebas obligatorias

### 28.1. Unidad

- normalización conserva `ñ` e ignora mayúsculas y tildes vocálicas;
- decodificación y previsualización UTF-8 y Windows-1252;
- validación estructural de `rubric-v1.json` y revisión de correspondencia con la rúbrica humana;
- selección de observaciones por criterio;
- normalización de evidencias sin alterar originales;
- agregación por cuatro dimensiones;
- serialización CSV y códigos de error.

### 28.2. Base de datos

- RLS impide lectura anónima y el registro público está deshabilitado;
- una entrega por estudiante, respuesta final inmutable y transacción idempotente;
- snapshot de rúbrica inmutable;
- evaluación duplicada por entrega rechazada;
- revisión docente conservada en `ai_evaluations`.

### 28.3. Integración

- código y nombre completo exacto crean sesión;
- una forma parcial no se acepta automáticamente;
- desbloqueo, variante y regeneración funcionan;
- treinta accesos detrás de una IP no se bloquean;
- borrador se recupera después de quince minutos sin red;
- una llamada evalúa la entrega y separa preguntas;
- la IA no recibe identidad;
- evidencia no localizada marca solo el criterio;
- JSON irrecuperable queda `failed`;
- revisión docente prevalece.

### 28.4. E2E y accesibilidad

- importar y previsualizar CSV;
- abrir, responder, desconectar, reconectar y entregar;
- doble clic no duplica;
- “Finalizar y limpiar” borra el equipo compartido;
- evaluar una entrega y un paralelo;
- revisar, consultar dimensiones y exportar;
- recorrido completo por teclado, foco, anuncios, contraste, zoom y móvil.

---

## 29. Calibración y ensayo

### 29.1. Calibración pedagógica

Antes del dashboard definitivo, usar 15–20 entregas auténticas anonimizadas o un pequeño pilotaje supervisado. El docente evalúa a ciegas y el modelo realiza dos corridas idénticas.

Por criterio se registran acuerdo exacto, acuerdo adyacente de ±1, consistencia IA–IA, fidelidad de evidencia, `no_aplica` y sesgo por extensión o variedad lingüística. Las puertas provisionales son 80 % de acuerdo adyacente, 80 % de consistencia y 95 % de fidelidad de evidencias.

Un criterio que no alcance la puerta se revisa y, si continúa inestable, queda `teacher_only` o en revisión prioritaria. No se elimina por una limitación técnica sin decisión pedagógica.

### 29.2. Ensayo técnico

Con datos ficticios:

- cargar dos paralelos con tildes, `ñ`, nombres compuestos y homónimos;
- probar CSV UTF-8 y Windows-1252;
- simular treinta accesos desde una misma IP;
- apagar la red durante quince minutos;
- simular doble entrega, salida inválida y evidencia no localizada;
- usar dos estudiantes consecutivos en el mismo equipo;
- exportar y abrir CSV en Excel y Google Sheets.

Eliminar o identificar inequívocamente los datos ficticios antes de la campaña.

---

## 30. Operación de la campaña

### 30.1. Antes

- verificar nómina;
- imprimir o distribuir códigos individualmente;
- comprobar fecha y zona horaria;
- realizar una entrega ficticia;
- confirmar espacio y cuota;
- probar IA con una respuesta sintética;
- comprobar exportación;
- comprobar el modo de borrador local durante quince minutos sin red;
- explicar que es un diagnóstico supervisado, sin calificación ni retroalimentación automática.

### 30.2. Durante

- abrir la evaluación;
- proyectar únicamente el enlace general;
- entregar códigos de forma privada;
- observar estados de acceso y entrega;
- no consultar respuestas en voz alta;
- no modificar lectura ni preguntas;
- registrar incidentes sin exponer datos;
- no aplicar la evaluación como tarea en casa.

### 30.3. Después

- cerrar la evaluación;
- evaluar respuestas;
- revisar resultados;
- descargar exportación completa;
- verificar manifiesto y conteos;
- guardar dos copias protegidas;
- decidir conservación o eliminación del proyecto.

---

## 31. Privacidad y retención

Principio: recopilar solo lo necesario.

- Los nombres se guardan en Supabase, no en GitHub.
- El proveedor de IA recibe texto sin identidad.
- Los códigos y tokens se guardan hasheados.
- Los fingerprints de límite de acceso son temporales.
- Los resultados solo son visibles para el docente.
- No hay página pública de resultados.
- No se usan respuestas para entrenar modelos por decisión de la aplicación.
- No registrar texto estudiantil en herramientas de analítica o errores.

Retención recomendada para esta solución temporal:

1. conservar datos mientras se revisa la campaña;
2. exportar CSV y JSON;
3. verificar integridad;
4. guardar la exportación en almacenamiento docente protegido;
5. eliminar sesiones, rate limits y códigos inmediatamente;
6. archivar o eliminar el proyecto Supabase cuando ya no sea necesario.

La fecha concreta de eliminación la decide el docente antes de abrir la evaluación y debe distinguir datos pedagógicos anuales de datos técnicos temporales.

---

## 32. Costos y capacidad

Diseño esperado:

- GitHub Pages: sin costo;
- dominio: sin costo;
- repositorio público: sin costo;
- Supabase Free: suficiente para el piloto si las cuotas vigentes cubren la campaña;
- proveedor de IA: costo variable según respuestas, extensión y modelo.

No contratar Supabase Pro antes de medir la necesidad. Si la campaña depende de disponibilidad garantizada o copias administradas, evaluar temporalmente el plan pago.

Implementar un límite docente de gasto:

- mostrar número de respuestas pendientes;
- pedir confirmación antes del lote;
- no reevaluar resultados completed;
- permitir reintentar solo failed;
- registrar modelo y uso cuando el proveedor lo entregue.

---

## 33. Retiro y migración a Ecuafuturo

Ychayñan Lite debe poder desaparecer.

Antes de retirarlo:

1. cerrar la evaluación;
2. terminar o marcar pendientes;
3. exportar;
4. verificar hashes y conteos;
5. conservar una copia cifrada o protegida;
6. documentar versión de rúbrica y prompt;
7. revocar claves de IA;
8. eliminar códigos y sesiones;
9. decidir si se elimina Supabase;
10. archivar el repositorio si ya no tendrá cambios.

La futura importación a Ecuafuturo mapeará:

- student.external_reference o student.id;
- group.id;
- assessment.id;
- question.id;
- rubric version;
- criterion results;
- observations;
- teacher review.

No conectar ahora las dos bases de datos. La frontera es el paquete de exportación versionado.

---

## 34. Fases de implementación

Este apartado define la hoja de ruta, no el porcentaje ejecutado. El avance real, las verificaciones y los bloqueos se mantienen en `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`.

### Fase 0. Preparación

- repositorio, Supabase, entornos y CI;
- crear `rubric-v1.json`, validar su contrato estructural y revisar su correspondencia semántica con la rúbrica humana;
- configurar las siete Edge Functions previstas.

### Fase 1. Base segura

- diez tablas, RLS y docente único;
- CSV y XLSX, codificación CSV, nómina, normalización y variantes;
- rate limits compatibles con NAT y desbloqueo docente.

### Fase 2. Calibración temprana

- 15–20 entregas anonimizadas;
- evaluación docente ciega y dos corridas;
- clasificación de criterios automáticos provisionales, prioritarios o `teacher_only`.

### Fase 3. Evaluación y ensayo temprano

- lectura, preguntas, códigos, sesión, borrador y entrega;
- prueba con una IP, quince minutos sin red y equipo compartido.

### Fase 4. IA y revisión

- una llamada por entrega;
- resultados por pregunta y dimensión;
- lote reanudable, evidencia normalizada y revisión docente.

### Fase 5. Diagnóstico y salida

- dashboard mínimo, CSV, JSON, manifiesto;
- ensayo presencial completo, campaña, exportación y retiro.

No avanzar si fallan las puertas críticas de la fase anterior.

---

## 35. Criterios técnicos de aceptación

La aplicación está lista cuando:

- se publica en el enlace github.io sin dominio;
- una persona no autenticada no puede abrir el panel ni consultar tablas;
- un estudiante válido entra con código y nombre;
- las mayúsculas y tildes vocálicas no bloquean;
- n y ñ continúan siendo distintas;
- un estudiante no puede abrir otro registro;
- existe una sola entrega final;
- recargar o repetir una petición no duplica datos;
- el texto original permanece inalterado;
- el estudiante no ve retroalimentación;
- la clave de IA no aparece en el navegador;
- la IA no recibe nombre;
- una salida inválida no se presenta como evaluación;
- el docente puede revisar y corregir;
- el lote puede reanudarse;
- el dashboard distingue datos provisionales;
- la exportación incluye UUID, versiones, conteos y hashes;
- los CSV se previsualizan y abren correctamente;
- treinta estudiantes pueden entrar desde una misma IP;
- el borrador sobrevive quince minutos sin red y el equipo compartido puede limpiarse;
- la calibración clasifica cada criterio antes de habilitar sugerencias;
- lint, typecheck, pruebas y build pasan;
- el recorrido crítico funciona en móvil y teclado;
- el repositorio público no contiene datos ni secretos.

---

## 36. Reglas para el programador

1. Construir únicamente lo descrito.
2. Resolver seguridad en backend y base de datos.
3. Favorecer funciones pequeñas y contratos tipados.
4. No introducir dependencias sin una necesidad concreta.
5. No copiar estética ni marca de Ecuafuturo.
6. No almacenar datos reales en Git.
7. No mostrar análisis al estudiante.
8. No corregir silenciosamente el texto original.
9. No convertir IA en calificación definitiva.
10. No crear integración directa con la base de Ecuafuturo.
11. Mantener migraciones reproducibles. Una migración ya aplicada contra una base de datos real no se modifica nunca: no se volvería a ejecutar y el cambio quedaría invisible. Toda corrección posterior exige una migración nueva.
12. Registrar decisiones que cambien alcance, datos o seguridad.
13. Verificar antes de desplegar.
14. Mantener una ruta clara de exportación y retiro.

---

## 37. Registro inicial de decisiones

| Decisión | Elección | Motivo |
|---|---|---|
| Uso | Campaña diagnóstica puntual y presencial | La función permanente pertenecerá a Ecuafuturo |
| Dominio | Ninguno; enlace GitHub Pages | Evitar costo y configuración |
| Frontend | React, TypeScript, Vite y HashRouter | SPA estática pequeña |
| Datos | Supabase PostgreSQL separado, diez tablas | Aislamiento y esquema reducido |
| Docente | Un usuario de Supabase Auth, registro público cerrado | No necesita perfil o roles |
| Estudiantes | Código, nombre completo exacto y sesión temporal | Evitar cuentas y accesos accidentales |
| Red escolar | Umbral amplio por IP y control temporal por código/dispositivo | Evitar bloqueo colectivo por NAT |
| Backend | Siete Edge Functions | El lote se orquesta desde el panel |
| IA | Una llamada por entrega, máximo tres simultáneas | Menos contexto repetido y aislamiento |
| Rúbrica | `rubric-v1.json` congelado y validado | Una fuente operativa verificable |
| Observaciones | Catálogo completo, subconjunto por pregunta | Menos ruido sin perder cobertura |
| Dashboard | Cuatro dimensiones y criterios desplegables | Lectura estable y transparente |
| Importación | CSV y XLSX procesados localmente, con previsualización; codificación ajustable solo para CSV | Aceptar la fuente real del docente; cargar el lector XLSX de forma diferida para no penalizar el arranque |
| Accesos | Lista impresa, sin QR | Menor alcance |
| Desconexión | Borrador local durante al menos quince minutos | Riesgo operativo principal |
| Google Sheets | Importación manual de CSV | Evitar integración |
| Ecuafuturo | Exportación versionada, sin conexión directa | Evitar acoplamiento |
| Repositorio | Público sin datos ni secretos | GitHub Pages gratuito |

---

## 38. Referencias técnicas oficiales

- GitHub Pages: https://docs.github.com/en/pages
- Flujos personalizados de GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Supabase Auth: https://supabase.com/docs/guides/auth
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Límites de Edge Functions: https://supabase.com/docs/guides/functions/limits
- Supabase CLI y desarrollo local: https://supabase.com/docs/guides/local-development

Estas referencias explican las herramientas; las reglas específicas de Ychayñan Lite son las de este documento y el documento maestro.

---

## 39. Resumen ejecutivo para implementación

El programador debe construir una SPA pequeña en React y TypeScript, publicarla con GitHub Actions en GitHub Pages y usar un proyecto Supabase independiente para autenticación docente, PostgreSQL y Edge Functions. El estudiante no tiene cuenta ni acceso directo a datos: valida nombre completo y código personal, obtiene una sesión temporal y realiza una sola entrega. La IA opera exclusivamente para el docente: puede proponer un borrador de preguntas abiertas y, en la fase posterior, analizar una entrega por llamada. Ambos resultados quedan sujetos a revisión docente.

El producto termina en un dashboard sencillo y una exportación completa. No se compra dominio, no se integra Google Sheets, no se conecta directamente con Ecuafuturo y no se implementa seguimiento anual. La simplicidad se protege mediante diez tablas, siete Edge Functions, CSV, un dashboard de cuatro dimensiones, una lista explícita de exclusiones y una ruta de retiro después de la campaña.

### 39.1. Corte vertical pendiente

La resolución del conflicto optimista de borradores y la implementación de `manage-assessment-access` pertenecen al siguiente corte vertical, junto con el circuito estudiantil. Este saneamiento deja el esquema y los contratos documentales coherentes, pero no habilita todavía accesos, sesiones ni entregas reales.