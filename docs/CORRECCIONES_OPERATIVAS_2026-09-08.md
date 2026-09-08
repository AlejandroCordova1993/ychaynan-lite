# Correcciones operativas — 8 de septiembre de 2026

## Alcance implementado

- Ingreso: distingue horario futuro, cierre y fallo del servicio de un rechazo de identidad. No revela si un estudiante o código existe; ignora detalles arbitrarios del servidor.
- Distribuir accesos: muestra disponibilidad efectiva y permite editar inicio/cierre de una evaluación publicada, sin cambiar su lectura, preguntas o rúbrica. Las horas editables corresponden a la zona horaria del equipo, indicada en pantalla.
- Cierre explícito: requiere confirmación; conserva respuestas y libera la única evaluación abierta. Impide nuevos ingresos y entregas. No se añade reapertura.
- Nómina: alta individual sin CSV/XLSX, con normalización canónica, bloqueo transaccional del paralelo, prevención de duplicados por nombre normalizado y límite compartido de 50 estudiantes.
- Distribución: permite incorporar otro paralelo o generar accesos para estudiantes añadidos después de publicar. La operación es idempotente: no cambia códigos, estados, sesiones ni respuestas de accesos existentes.

## Uso para un estudiante olvidado

1. En Paralelos y nómina, seleccionar el paralelo activo.
2. Escribir el nombre en Añadir un estudiante sin archivo y confirmar.
3. Si ya está publicada la evaluación, abrir Distribuir accesos, seleccionar el paralelo y pulsar Generar accesos faltantes.
4. Descargar la lista de códigos actualizada.

El alta y la generación de accesos son dos operaciones explícitas. Si la segunda falla, el estudiante permanece en la nómina y se puede reintentar sin duplicarlo. No volver a importar la nómina completa. Los homónimos reales requieren revisar la identidad; el alta individual rechaza una coincidencia normalizada y no decide automáticamente que sea otra persona.

## Despliegue del 8 de septiembre

Esta implementación no cambia el horario ni otros datos existentes en producción.

Migración `20260908195948_operational_assessment_management.sql` aplicada al proyecto `qwqugnbmncrwcemxwutc` y funciones `validate-student` y `manage-assessment-access` desplegadas. El frontend se publica por GitHub Actions con este cambio. La nueva interfaz no permite guardar un horario que el backend anterior no haya proporcionado.

Comprobación remota posterior: 20 migraciones, 35 estudiantes y 35 accesos; horario original conservado. El rol anon no puede ejecutar el alta individual y authenticated no puede invocar la emisión de códigos. Sigue pendiente una prueba de uso completo con datos ficticios autorizados; el despliegue no la sustituye.

Las nuevas RPC restringen el alta al docente autenticado y la emisión de códigos a service_role. No se habilita INSERT directo de estudiantes para el cliente ni se retira RLS. La migración no modifica registros existentes.

## Verificación local

- Suite completa: 642 pruebas aprobadas en 92 archivos con `npx vitest run --maxWorkers=2`.
- Lint, formato, TypeScript y compilación aprobados.
- La ejecución con concurrencia predeterminada agotó la memoria del equipo; no se considera una verificación válida. Se repitió toda la suite con dos procesos.
- React Doctor no encontró incidencias en los cambios rastreados inspeccionados. No sustituye las pruebas de los archivos nuevos.
- No se ejecutaron escrituras de prueba ni se consumió IA en producción.

## Pendientes que este bloque no cierra

- Resumen diagnóstico por paralelo y estudiante y exportación de resultados: siguen siendo rutas provisionales, no confundir con la descarga de códigos.
- Conciliación de una importación completa contra la nómina existente; actualmente se debe importar solo a las personas faltantes.
- Edición individual de nombres ya registrados.
- Cola persistente de IA y presupuesto global; el lote continúa coordinado desde el navegador.
- Calibración pedagógica y prueba integral de producción con datos ficticios.

La solicitud de corregir la auditoría se entrega por bloques; no afirmar que toda la auditoría está cerrada.
