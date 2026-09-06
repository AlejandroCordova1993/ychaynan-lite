# Evaluación de entregas por paralelo

La pantalla Respuestas permite seleccionar una evaluación aplicada (incluidas las
cerradas y archivadas), un paralelo y un estado de entrega. El resumen cuenta
estudiantes, entregas, evaluaciones y revisiones del paralelo seleccionado. Los
resultados descartados no cuentan como evaluados. Estos contadores no sustituyen
un dashboard pedagógico por criterios de rúbrica.

## Uso docente

1. Abrir Respuestas y seleccionar la evaluación.
2. Seleccionar un paralelo. La vista Todos los paralelos es solo de consulta para
   la acción masiva.
3. Pulsar Evaluar entregas pendientes y confirmar la cantidad indicada.
4. Mantener la pantalla abierta hasta finalizar. Consultar Detalle del lote para
   revisar el resultado de cada solicitud.
5. Revisar individualmente los resultados provisionales antes de aprobarlos.

La acción procesa únicamente las entregas visibles pendientes o con evaluación
fallida. Omite trabajos ya evaluados, revisados, descartados o en curso. Cada
entrega usa su propia llamada al evaluador existente, con su contexto y rúbrica;
no se mezclan respuestas entre estudiantes. Se ejecutan hasta tres solicitudes
simultáneas desde esta pantalla. Esta limitación no es una cuota global entre
distintos navegadores.

Los errores individuales no cancelan las demás entregas. Una sesión inválida o
la pérdida de permiso detienen nuevos trabajos. Detener espera a las solicitudes
ya iniciadas; no cancela operaciones que el servidor esté procesando.

## Continuidad y límites

La cola se coordina en el navegador: no es un trabajo persistente en segundo plano.
Salir de la pantalla detiene el inicio de nuevas solicitudes. Las ya iniciadas
pueden continuar en servidor. Al regresar, actualizar las respuestas para leer
los estados persistidos antes de iniciar los pendientes o reintentar los fallidos.
Los trabajos pendientes o en curso no se reintentan automáticamente.

No se aprueban calificaciones automáticamente ni se envía retroalimentación al
estudiante. No se necesitan nuevas migraciones ni funciones de servidor: se
reutiliza evaluate-submission con las comprobaciones de autorización existentes.

## Verificación automatizada

Se cubren separación por paralelo, selección histórica, estados de evaluación,
elegibilidad, deduplicación, límite de concurrencia, fallos independientes,
detención y confirmación previa al consumo de IA.
