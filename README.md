# Ychayñan Lite

Aplicación diagnóstica de lectura y escritura para un solo docente. Ver `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` y `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` para la especificación completa.

## Desarrollo local

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` corre lint, formato, tipos, pruebas y build — debe pasar limpio antes de cualquier commit.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: del proyecto Supabase real. Sin un proyecto real, cualquier valor no vacío permite que la aplicación arranque (no se hará ninguna llamada de red hasta que algo la dispare).
- `VITE_ASSESSMENT_SLUG`: opcional.

En GitHub, estas mismas claves deben existir como **Repository variables** (Settings → Secrets and variables → Actions → Variables), no como secrets — la clave anónima de Supabase es pública por diseño; RLS es la frontera de seguridad real, no el secreto de esta clave.

## Cuenta docente y rol

La aplicación identifica al único docente mediante el claim `app_metadata.role = "teacher"` en su sesión de Supabase Auth (ver Row Level Security en `supabase/migrations/20260828000002_rls.sql`). Este campo **no se puede establecer desde el cliente** (es de solo lectura fuera del backend, por diseño de Supabase). Para activarlo en un proyecto real:

1. Crear la cuenta del docente (invitación o registro manual; el registro público está deshabilitado, ver `supabase/config.toml`).
2. Con la Service Role Key (nunca en el navegador), ejecutar una sola vez:

   ```js
   await supabaseAdmin.auth.admin.updateUserById(TEACHER_USER_ID, {
     app_metadata: { role: 'teacher' },
   });
   ```

Sin este paso, la cuenta puede iniciar sesión pero el panel docente mostrará "Esta cuenta no tiene rol docente".

## Despliegue

El `base` de Vite (`vite.config.ts`) está fijado a `/ychaynan-lite/`. Si el repositorio de GitHub se renombra, este valor debe actualizarse para que coincida con el nuevo nombre — GitHub Pages sirve el sitio bajo `https://<usuario>.github.io/<nombre-del-repositorio>/`.
