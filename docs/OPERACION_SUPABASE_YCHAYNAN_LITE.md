# Operación segura de Supabase para Ychayñan Lite

## Identidad del proyecto

- Nombre esperado: `ychaynan-lite`
- Project ref esperado: `qwqugnbmncrwcemxwutc`
- Nunca usar `edicionesecuafuturo Project` para esta aplicación.

Una conexión que liste o enlace otro proyecto detiene el procedimiento. No se ejecuta ninguna migración, reparación ni despliegue hasta corregir el vínculo y volver a comprobar identidad.

## Configuración local y remota

`supabase/config.toml` configura el stack local y conserva localhost. La URL de GitHub Pages se configura como Site URL en Auth remoto; localhost se permite como Redirect URL adicional de desarrollo.

La URL de producción es `https://alejandrocordova1993.github.io/ychaynan-lite/`. Antes de cerrar producción, las credenciales que se hayan expuesto deben rotarse, incluidas contraseñas y tokens personales que correspondan.

### Requisito de Auth para cambiar la contraseña

El formulario docente envía `current_password` al actualizar la contraseña. Esa comprobación solo se hace cumplir del lado servidor cuando el proyecto alojado tiene activado **Authentication → Sign In / Providers → Email → Require current password when updating**; el nombre puede aparecer traducido en el Dashboard. El contrato equivalente de GoTrue es `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true`.

Verificar este ajuste en el proyecto alojado antes de publicar o probar el flujo de cambio de contraseña. La validación del formulario en el navegador no sustituye esta protección del servidor.

## Reautenticación y vínculo seguro de la CLI

Después de revocar tokens, la CLI se presume no autenticada hasta completar de nuevo esta secuencia. No pegar un token en argumentos ni guardarlo en archivos del proyecto:

```powershell
npx supabase login
npx supabase link --project-ref qwqugnbmncrwcemxwutc
npx supabase projects list --output-format json
```

`npx supabase login` debe usar el flujo de navegador. No usar `--token` ni copiar un token a un archivo. Ejecutar `link` sin contraseña ni token como argumentos. El listado posterior debe contener únicamente `ychaynan-lite`, con `project_ref` `qwqugnbmncrwcemxwutc` y `linked: true`; cualquier diferencia detiene el procedimiento. Nunca continuar si aparece `edicionesecuafuturo Project` o cualquier otro proyecto.

## Comprobación de solo lectura

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Solo después de superar la comprobación de identidad anterior, interpretar el historial y el dry-run. El `--dry-run` no autoriza por sí mismo un despliegue: solo muestra qué migraciones se propondrían.

## Despliegue controlado

Después de comprobar la identidad, el historial de migraciones y el resultado esperado del `--dry-run`, y de obtener autorización explícita para mutar el proyecto remoto, ejecutar:

```powershell
npx supabase db push --linked
npx supabase migration list --linked
npx supabase db lint --linked --schema public --level warning --fail-on error
npx supabase db advisors --linked
```

Documentar únicamente resultados no secretos. Si el despliegue no propone exactamente la migración prevista, detenerse y revisar antes de aplicar cambios.

## Smoke posterior

Verificar login docente, rechazo de cuenta sin rol, rechazo anónimo de las diez tablas, carga de Pages y ausencia de secretos en el bundle.

## Prohibiciones

No registrar ni pegar contraseñas, tokens, `service_role` o pepper. No usar `--token` o `--password` en comandos ni crear archivos de tokens dentro del proyecto. No ejecutar `db reset`, `migration repair` ni smokes mutables en producción como comprobación rutinaria.
