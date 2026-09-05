# Gestión de cursos

La pantalla Paralelos y nómina incorpora Administrar cursos, con confirmación para eliminar, archivar y restaurar.

- Eliminar borra definitivamente el curso y su nómina solo si ninguno de sus estudiantes tiene accesos ni entregas, incluidos borradores. No elimina evaluaciones, preguntas, respuestas ni resultados.
- Archivar conserva todos los datos y retira el curso de las opciones de importación y asignación. Bloquea nuevos ingresos estudiantiles mediante la validación de acceso existente. No revoca las sesiones ya iniciadas.
- Restaurar permite volver a utilizar el curso.
- La base rechaza nuevas matrículas y nuevos accesos en cursos archivados, incluso desde una pestaña antigua.

La RPC manage_group utiliza SECURITY INVOKER, comprueba el rol docente y trabaja bajo RLS. El borrado es transaccional, con bloqueos y claves foráneas que impiden dejar huérfanos o borrar actividad concurrente. No se desactiva ningún disparador.

La migración 20260905161850_group_lifecycle.sql se aplicó el 5 de septiembre de 2026 al proyecto qwqugnbmncrwcemxwutc. No requiere una nueva Edge Function.

Verificación previa a publicación: npm run verify completo, 439 pruebas aprobadas en 80 archivos, lint, formato, tipos y compilación correctos. También se desplegó manage-assessment-access con la validación de la evaluación solicitada para conversión de códigos.

Las pruebas cubren permisos, conservación de historial, restricciones de borrado, bloqueo de importación/asignación, confirmación/cancelación y actualización del selector.
