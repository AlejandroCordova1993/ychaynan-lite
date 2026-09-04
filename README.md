# Ychayñan Lite

Aplicación web diagnóstica de lectura y escritura para un solo docente. El estudiante no crea una cuenta: ingresa con su nombre completo, paralelo y código personal. No recibe calificación ni retroalimentación automática; la evidencia queda reservada al docente.

La especificación funcional está en `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`, la implementación en `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` y el corte verificable más reciente en `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`.

## Estado actual

El primer circuito vertical ya está implementado:

- autenticación y cambio de contraseña del docente;
- paralelos e importación de nómina;
- creación de evaluaciones con una lectura y entre una y cuatro preguntas;
- apertura de la evaluación y generación de códigos personales;
- acceso estudiantil sin cuenta, con normalización controlada del nombre;
- sesión temporal, autoguardado local/remoto y control de versiones;
- entrega definitiva, inmutable e idempotente;
- bandeja docente y detalle de las respuestas entregadas;
- evaluación individual con IA, provisional y visible solo en el detalle docente; la función está desplegada y la interfaz permanece en la rama de trabajo.

La base alojada tiene trece migraciones aplicadas y seis Edge Functions activas. GitHub Pages está publicado en [https://alejandrocordova1993.github.io/ychaynan-lite/](https://alejandrocordova1993.github.io/ychaynan-lite/).

`generate-assessment-draft` está desplegada en su versión endurecida y ya fue probada con una lectura no sensible. `evaluate-submission` está desplegada como versión 1 con verificación JWT y rechaza solicitudes sin autenticación; todavía falta el smoke autenticado contra una entrega alojada. Siguen pendientes la revisión y los ajustes docentes, el lote reanudable, el dashboard longitudinal, la exportación y un control persistente de consumo. La aplicación debe pasar un ensayo controlado antes de usarse con un curso completo.

## Desarrollo local

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` ejecuta formato, lint, tipos, pruebas y build. Debe terminar limpio antes de publicar.

## Variables del frontend

Copiar `.env.example` a `.env.local` y completar:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- `VITE_ASSESSMENT_SLUG`, opcional.

`.env.local` está ignorado. La clave `anon` es pública por diseño; la seguridad depende de RLS, privilegios mínimos y las funciones de servidor. En GitHub, las dos variables públicas de Supabase se configuran como **Repository variables** de Actions.

## Secretos de las Edge Functions

El proyecto remoto requiere:

- `ACCESS_CODE_PEPPER`: valor aleatorio privado para derivar los hashes de los códigos;
- `ALLOWED_ORIGINS`: orígenes permitidos separados por comas;
- `STUDENT_SESSION_MAX_MINUTES`: duración máxima de la sesión estudiantil;
- `DEEPSEEK_API_KEY`: clave privada usada únicamente por las funciones de IA;
- `DEEPSEEK_MODEL`: opcional; por defecto `deepseek-v4-flash`;
- `AI_GENERATION_TIMEOUT_MS`: opcional; entero entre 5000 y 120000.

Supabase proporciona automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Ningún valor privado debe guardarse en Git, `.env.local`, GitHub Pages ni el navegador.

Las funciones actuales son:

```bash
npx supabase functions deploy manage-assessment-access --project-ref <project-ref>
npx supabase functions deploy validate-student --project-ref <project-ref>
npx supabase functions deploy save-draft --project-ref <project-ref>
npx supabase functions deploy submit-assessment --project-ref <project-ref>
npx supabase functions deploy generate-assessment-draft --project-ref <project-ref>
npx supabase functions deploy evaluate-submission --project-ref <project-ref>
```

`manage-assessment-access`, `generate-assessment-draft` y `evaluate-submission` exigen JWT docente. Las tres funciones estudiantiles validan una sesión opaca de corta duración en el servidor y no exponen la rúbrica ni datos de otros estudiantes.

## Cuenta docente

La única cuenta docente debe tener `app_metadata.role = "teacher"`. Ese claim se asigna desde una operación administrativa de Supabase y nunca desde el cliente. El registro público permanece deshabilitado.

## Despliegue

Vite usa la base `/ychaynan-lite/` y `HashRouter`, compatibles con GitHub Pages sin dominio propio. Si cambia el nombre del repositorio, debe cambiarse también el `base` de `vite.config.ts`.

Antes de operar sobre Supabase, confirmar el proyecto y el `project_ref` indicados en `docs/OPERACION_SUPABASE_YCHAYNAN_LITE.md`. No ejecutar seeds, resets ni pruebas mutables contra producción sin autorización expresa.

### Asistente de borradores con IA

El endpoint `generate-assessment-draft` está desplegado en su versión endurecida. `DEEPSEEK_API_KEY` está configurada como secreto de Supabase y una generación real con lectura no sensible fue exitosa. La propuesta siempre requiere confirmación docente, se muestra completa antes de aplicarse y no se guarda ni se publica automáticamente.

La rama incorpora además `evaluate-submission`. Una llamada procesa una entrega completa, omite nombre, paralelo, código e identificadores estudiantiles del prompt, valida criterios y evidencias, persiste un resultado idempotente y lo muestra exclusivamente al docente como provisional. La función está activa en Supabase como versión 1 y conserva `verify_jwt = true`; aún debe probarse de extremo a extremo con una entrega ficticia autenticada antes de usarse con respuestas reales. La aprobación/edición docente y el límite persistente de consumo continúan pendientes.
