# Endurecimiento de límites de entrada — diseño

**Fecha:** 6 de septiembre de 2026  
**Producto:** Yachayñan Lite  
**Estado:** aprobado conceptualmente; pendiente de implementación

## 1. Objetivo

Aplicar límites coherentes en navegador, Edge Functions y PostgreSQL para impedir cargas accidentales o abusivas sin dificultar una evaluación diagnóstica de estudiantes de 15 a 16 años.

El cambio protege cuatro superficies existentes:

1. creación de evaluaciones;
2. importación de nóminas;
3. acceso estudiantil;
4. guardado y entrega de respuestas.

No añade formatos de pregunta, cuentas estudiantiles, rate limiting nuevo, colas, nuevas funciones de IA ni capacidades de dashboard.

## 2. Diagnóstico del estado actual

La aplicación ya valida parte de los datos en el navegador:

- evaluación: título 160, propósito 1.000, lectura 30.000, instrucciones generales 6.000, hasta cuatro preguntas;
- pregunta: consigna 2.000 e instrucciones 4.000;
- nómina: archivo de 5 MB, 2.000 filas y 20.000 celdas;
- evaluación con IA: hasta 20.000 caracteres por respuesta.

Persisten cuatro brechas:

- varios límites del formulario no existen como restricciones de PostgreSQL;
- `save-draft`, `validate-student` y `submit-assessment` leen JSON sin un límite aplicativo del cuerpo ni validación estricta de todos sus campos;
- `save_student_draft` no limita la longitud del texto ni rechaza de forma segura duplicados y formas JSON anómalas;
- la nómina se inserta directamente mediante Data API, por lo que el máximo del archivo puede evadirse fuera de la interfaz.

## 3. Decisiones de producto

### 3.1. Respuestas

Cada respuesta admite como máximo **5.000 caracteres medidos como puntos de código Unicode**. Es un techo técnico, no una extensión esperada ni un criterio de calificación.

El cliente contará con `Array.from(text).length` o una utilidad equivalente; PostgreSQL usará `char_length`. El atributo HTML `maxLength` podrá mantenerse como defensa conservadora, pero no será la fuente del contador ni la única validación, porque el DOM mide unidades UTF-16 y puede contar de manera distinta algunos caracteres fuera del plano básico.

La respuesta extensa recomendada por el documento maestro se mantiene en 250–400 palabras. El nuevo techo deja margen aproximado para 700–900 palabras en español y evita que una entrada desproporcionada llegue a PostgreSQL o al proveedor de IA.

Con hasta cuatro preguntas, una entrega puede contener como máximo 20.000 caracteres de respuesta.

### 3.2. Nómina

- máximo **50 estudiantes registrados por paralelo**;
- máximo **50 filas de datos por archivo** CSV o XLSX;
- máximo **500 celdas materializadas**;
- máximo **5 MB por archivo**, sin cambios;
- nombres y variantes: máximo 160 caracteres por valor.

El límite total se aplica en servidor dentro de una operación atómica. Varias importaciones no pueden superar 50 estudiantes en el mismo paralelo.

### 3.3. Evaluación

Se conservan los límites ya vigentes en el navegador:

| Campo | Límite |
| --- | ---: |
| título | 160 caracteres |
| propósito | 1.000 caracteres |
| lectura | 30.000 caracteres |
| instrucciones generales | 6.000 caracteres |
| preguntas | 1–4 |
| consigna por pregunta | 2.000 caracteres |
| instrucciones por pregunta | 4.000 caracteres |
| versión curricular | 80 caracteres |

PostgreSQL aplicará los mismos límites y `save_assessment_draft` los comprobará antes de insertar o actualizar.

### 3.4. Acceso y sesión estudiantil

| Campo | Límite |
| --- | ---: |
| slug de evaluación | 200 caracteres |
| nombres y apellidos | 160 caracteres |
| paralelo | 80 caracteres |
| código introducido | 12 caracteres |
| fingerprint | 128 caracteres |
| token opaco | 256 caracteres |
| clave idempotente de entrega | 256 caracteres |

Los campos obligatorios se recortan solo donde el contrato ya normaliza la entrada. La respuesta original del estudiante nunca se recorta ni normaliza.

## 4. Arquitectura recomendada

Se aplicará defensa por capas, sin crear una Edge Function adicional.

### 4.1. Contratos compartidos

Un módulo TypeScript puro centralizará los límites públicos de contenido y estudiante. Lo consumirán los formularios, validadores del cliente y Edge Functions compatibles con TypeScript estándar.

El módulo no contendrá secretos, dependencias de navegador, dependencias de Deno ni lógica de acceso a datos.

### 4.2. Lectura segura de JSON

Un helper compartido de Edge Functions:

- rechazará anticipadamente un `Content-Length` superior al máximo del endpoint;
- leerá el cuerpo como texto una sola vez;
- medirá sus bytes UTF-8 reales;
- rechazará JSON vacío, malformado, no-objeto o con campos inesperados;
- distinguirá solicitud inválida (`400`) de cuerpo excesivo (`413`).

Límites por endpoint:

| Edge Function | Máximo del cuerpo |
| --- | ---: |
| `validate-student` | 4 KB |
| `save-draft` | 96 KB |
| `submit-assessment` | 4 KB |

La plataforma puede imponer un máximo adicional. Estos límites son los del contrato de Yachayñan Lite.

### 4.3. Borradores

`save-draft` aceptará únicamente:

- `action` igual a `load` o `save`;
- token y clave con los límites definidos;
- versión esperada entera no negativa;
- entre cero y cuatro respuestas;
- objetos con exactamente `questionId` y `text`;
- identificador UUID válido;
- texto de hasta 5.000 caracteres;
- un solo elemento por pregunta.

La RPC `save_student_draft` repetirá las invariantes relevantes dentro de PostgreSQL. Una llamada que evada la Edge Function no podrá persistir textos largos, más de cuatro respuestas, preguntas duplicadas, JSON no textual ni identificadores inválidos.

La tabla `responses` incorporará una restricción de 5.000 caracteres como última defensa. El conteo de palabras continuará calculándose en servidor y el texto seguirá guardándose exactamente como fue escrito.

### 4.4. Importación atómica de nómina

La inserción directa desde el navegador será sustituida por una RPC pública, invocable solo por `authenticated` y solo para una cuenta con `app_metadata.role = teacher`.

La RPC:

1. recibe el paralelo y un arreglo JSON de hasta 50 estudiantes;
2. bloquea la fila del paralelo durante la operación;
3. exige que el paralelo exista y esté activo;
4. cuenta los estudiantes ya registrados;
5. rechaza la operación completa si el total superaría 50;
6. valida nombres, variantes y forma JSON;
7. normaliza en PostgreSQL con la misma regla de identidad vigente;
8. inserta todo o no inserta nada;
9. devuelve solamente la cantidad insertada.

La función será `SECURITY DEFINER` porque se revocará `INSERT` directo sobre `students` al rol `authenticated`. Para reducir el riesgo inherente:

- tendrá `search_path` fijo;
- comprobará explícitamente el rol docente;
- referenciará objetos con esquema;
- revocará `EXECUTE` a `PUBLIC` y `anon`;
- concederá `EXECUTE` únicamente a `authenticated`;
- no devolverá la nómina ni otros datos.

Las operaciones de lectura y ciclo de vida existentes conservarán sus permisos actuales.

### 4.5. Creación de evaluaciones

Una migración añadirá restricciones de longitud a `assessments`, `questions`, `groups` y `responses`. `save_assessment_draft` comprobará primero los límites para devolver un rechazo controlado y evitar depender del texto técnico de una restricción.

El navegador seguirá usando `assessmentDraftSchema`; los atributos `maxLength` y mensajes visibles reflejarán las mismas cifras para que el docente reciba orientación antes de enviar.

### 4.6. Evaluación con IA

`EVALUATION_LIMITS.responseMaxChars` bajará de 20.000 a 5.000 para coincidir con el nuevo contrato persistido. No cambia el prompt, la rúbrica, la evaluación por paralelo ni el número de llamadas a la IA.

## 5. Experiencia de usuario

### Estudiante

- cada textarea mostrará `N de 5.000 caracteres`, medidos con la utilidad Unicode compartida;
- el navegador impedirá introducir más de 5.000 puntos de código, tanto al escribir como al pegar;
- el contador no sustituirá el rango orientativo de palabras;
- el pegado permitido desde la lectura seguirá limitado a 40 palabras y respetará el techo total;
- si una sincronización es rechazada, el borrador local se conserva y el mensaje no revela detalles internos.

### Docente

- el importador explicará el máximo de 50 estudiantes;
- un archivo con más de 50 filas o 500 celdas se rechazará antes de mostrar la vista previa;
- si varias importaciones excedieran 50 estudiantes en el paralelo, la operación completa se rechazará sin inserciones parciales;
- los campos de evaluación mostrarán límites mediante atributos nativos y mensajes existentes de validación.

## 6. Migración y compatibilidad

Antes de aplicar la migración remota se ejecutarán consultas de solo lectura para detectar:

- respuestas de más de 5.000 caracteres;
- evaluaciones, preguntas, grupos o nombres que excedan los nuevos límites;
- paralelos con más de 50 estudiantes registrados.

La migración no truncará, corregirá ni eliminará datos. Si encuentra datos incompatibles, se detendrá y se informará el conteo afectado para decidir una corrección explícita.

La migración se creará con `supabase migration new`, se probará primero mediante PGlite y se aplicará al proyecto remoto únicamente después de que la puerta local esté verde.

No se modifica la regla de una entrega por estudiante ni la compatibilidad de códigos existentes.

## 7. Errores y privacidad

- `400`: forma, tipo o valor inválido;
- `401`: sesión estudiantil inexistente, expirada o inválida;
- `403`: cuenta autenticada sin rol docente;
- `409`: conflicto de versión o límite total del paralelo;
- `413`: cuerpo HTTP demasiado grande.

Los mensajes estudiantiles seguirán siendo genéricos cuando un detalle pudiera revelar la existencia de una persona, código, paralelo o sesión. Los detalles técnicos se registrarán solo en logs de servidor y nunca incluirán respuestas completas, tokens, códigos personales ni nombres.

## 8. Pruebas

La implementación seguirá ciclos RED–GREEN–REFACTOR.

### TypeScript y componentes

- límites exactos y un carácter por encima;
- contador de textarea y bloqueo en 5.000;
- pegado que haría superar el límite;
- nómina de 50 filas aceptada y 51 rechazada;
- 500 celdas aceptadas y 501 rechazadas;
- cliente de nómina usando la RPC y no inserción directa;
- validación de acceso en los límites definidos.

### Edge Functions

- `Content-Length` excesivo;
- cuerpo UTF-8 real excesivo sin cabecera;
- JSON malformado, arreglo o campos inesperados;
- cinco respuestas, pregunta duplicada, UUID inválido y texto de 5.001 caracteres;
- token, clave y campos de identidad excesivos;
- respuesta segura y código HTTP correcto.

### PostgreSQL con PGlite

- persistencia de exactamente 5.000 caracteres y rechazo de 5.001;
- rechazo de cinco respuestas y preguntas duplicadas;
- límites de evaluación equivalentes al cliente;
- importación de 50 estudiantes;
- rechazo atómico del estudiante 51, incluso en una importación posterior;
- rechazo de RPC para `anon`, `PUBLIC` y cuenta sin rol docente;
- ausencia de privilegio `INSERT` directo para `authenticated`;
- migraciones aplicadas desde cero y sobre el fixture vigente.

### Puerta final

```text
npm run verify
npx react-doctor@latest . --verbose --scope changed
```

Después se desplegarán la migración y las Edge Functions `validate-student`, `save-draft`, `submit-assessment` y `evaluate-submission`. Los smokes remotos serán no destructivos cuando sea posible y nunca imprimirán contenido sensible.

## 9. Infraestructura y cambios recientes de Supabase

La revisión del changelog oficial no muestra un cambio incompatible con estos contratos. La futura desactivación de exposición automática de tablas en Data API no afecta las tablas existentes, pero refuerza la decisión de declarar privilegios de forma explícita. La política reciente de límites para llamadas recursivas entre Edge Functions tampoco afecta este flujo porque estas funciones reciben solicitudes externas y no se invocan recursivamente.

La actualización de GitHub Actions advertida por Node.js 20 se tratará como un commit de mantenimiento separado después de este bloque. No se mezclará con la migración ni con los contratos educativos.

## 10. Criterios de aceptación

El bloque queda completo cuando:

1. ninguna capa acepta una respuesta de más de 5.000 caracteres;
2. ningún paralelo puede superar 50 estudiantes mediante el flujo de importación autorizado;
3. no existe inserción directa de estudiantes desde el navegador;
4. evaluación, pregunta y acceso aplican límites equivalentes en cliente y servidor;
5. cuerpos excesivos reciben `413` antes de ejecutar lógica de negocio;
6. errores no exponen datos personales ni secretos;
7. las migraciones y pruebas pasan desde una base limpia;
8. la base remota y las cuatro Edge Functions quedan desplegadas y verificadas;
9. GitHub Pages continúa funcionando sin cambios de flujo para docente o estudiante.
