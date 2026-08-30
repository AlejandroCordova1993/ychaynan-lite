# Operación segura de Supabase para Ychayñan Lite

## Identidad del proyecto

- Nombre esperado: `ychaynan-lite`
- Project ref esperado: `qwqugnbmncrwcemxwutc`
- Nunca usar `edicionesecuafuturo Project` para esta aplicación.

Una conexión que liste o enlace otro proyecto detiene el procedimiento. No se ejecuta ninguna migración, reparación ni despliegue hasta corregir el vínculo y volver a comprobar identidad.

## Configuración local y remota

`supabase/config.toml` configura el stack local y conserva localhost. La URL de GitHub Pages se configura como Site URL en Auth remoto; localhost se permite como Redirect URL adicional de desarrollo.

La URL de producción es `https://alejandrocordova1993.github.io/ychaynan-lite/`. Antes de cerrar producción, las credenciales que se hayan expuesto deben rotarse, incluidas contraseñas y tokens personales que correspondan.

## Comprobación de solo lectura

```powershell
npx supabase projects list --output-format json
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Confirma el nombre y el `project_ref` antes de interpretar los demás resultados. El `--dry-run` no autoriza por sí mismo un despliegue: solo muestra qué migraciones se propondrían.

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

No registrar ni pegar contraseñas, tokens, `service_role` o pepper. No ejecutar `db reset`, `migration repair` ni smokes mutables en producción como comprobación rutinaria.
