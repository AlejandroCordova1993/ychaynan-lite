# Revisión docente individual

Implementada en la rama codex/teacher-review, desde master 287443f.
Este bloque es independiente de claude/recoverable-student-codes (e883486).

## Comportamiento

- La evaluación completada permite aprobar, ajustar nivel y justificación por criterio o módulo, o descartar con motivo obligatorio.
- Se confirma explícitamente antes de guardar. La revisión es definitiva en este primer bloque.
- La propuesta original, sus evidencias y sus promedios se conservan visibles y sin cambios; los niveles finales aparecen en la sección docente.
- Los ajustes se guardan como una lista de {position, id, level, reason} en teacher_adjustments; los criterios sin ajuste conservan su nivel original.
- teacher_note contiene la nota global; reviewed_by y reviewed_at se determinan en servidor.
- Los resultados descartados se conservan como evidencia y deben excluirse de futuros agregados.
- Actualizar evaluación permite consultar cambios o resolver un conflicto entre pestañas sin recargar la aplicación completa.
- No se muestra retroalimentación al estudiante.

## Base de datos e integración

La migración 20260905013429_teacher_evaluation_review.sql agrega una RPC SECURITY INVOKER bajo RLS y un trigger de validación.
Debe aplicarse antes de publicar el frontend de este bloque. No requiere otra Edge Function ni claves nuevas.
La actualización condicional completed -> reviewed/discarded impide que dos pestañas sobrescriban una revisión.
Solo se admiten criterios existentes en la salida original, niveles 1–4/no_aplica y razones no vacías.
El trigger protege también actualizaciones directas de una revisión ya cerrada.

## Verificación manual tras desplegar

1. Abrir una entrega ficticia con evaluación IA completada.
2. Cambiar un nivel y su justificación, confirmar y recargar: deben mantenerse los ajustes y la propuesta original.
3. En otra entrega, descartar con motivo; al recargar debe conservarse el original como descartado.
4. Abrir la misma evaluación en dos pestañas: tras aprobar en una, la segunda debe rechazar el guardado y permitir actualizar.
5. Comprobar que el estudiante sigue viendo únicamente su comprobante de entrega.

## Pendientes explícitos

Integración y despliegue, prueba autenticada en producción, edición de observaciones/evidencias y fortalezas como elementos individuales, reapertura con historial de revisiones si se requiere, evaluación masiva, dashboard con promedios recalculados a partir de niveles finales, exportaciones y control de consumo.
El resumen original de IA no debe reutilizarse como promedio definitivo si hay ajustes docentes.

## Evidencia local

- Lint, formato y TypeScript: correctos.
- Suite completa: 73 archivos, 371 pruebas aprobadas (11 pruebas nuevas).
- Build: correcto, 187 módulos.
- React Doctor sobre los siete archivos de código cambiados: 92/100, dos advertencias de complejidad en SubmissionEvaluationPanel y TeacherEvaluationReview; son deuda de mantenibilidad, sin errores detectados.
- Dos ejecuciones anteriores de verify fallaron por esperas de interfaz en App/ImportRosterPanel; la ejecución completa posterior de tests pasó sin cambiar esas pruebas.
- No se aplicó la migración remota ni se publicó el frontend; las pruebas de base usan PGlite.
