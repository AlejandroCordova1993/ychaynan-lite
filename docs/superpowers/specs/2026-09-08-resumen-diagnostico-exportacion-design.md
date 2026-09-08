# Resumen diagnóstico y exportación — diseño aprobado

Fecha: 8 de septiembre de 2026  
Producto: Yachayñan Lite  
Estado: especificación para revisión final antes del plan de implementación

## 1. Propósito y alcance

Este bloque sustituye las dos pantallas provisionales `Resumen diagnóstico` y `Exportar` por un circuito útil para la primera aplicación con estudiantes. Debe permitir al docente comprender los resultados de una evaluación por paralelo y por estudiante, y descargar la misma información en Excel o CSV.

El alcance incluye resultados de una evaluación diagnóstica ya aplicada, sus entregas, la última evaluación IA válida y las revisiones docentes. No incorpora gestión individual de estudiantes, seguimiento longitudinal, detección de autoría IA, telemetría de escritura, gráficos históricos ni retroalimentación estudiantil.

## 2. Principios de interpretación

1. La respuesta original nunca se modifica ni se reemplaza por una síntesis.
2. Una evaluación con estado `completed` es **provisional de IA**.
3. Una evaluación con estado `reviewed` utiliza como dato vigente el resultado original con los ajustes docentes superpuestos por posición e identificador de criterio o módulo.
4. Una evaluación `discarded` no aporta niveles, promedios, fortalezas ni falencias. Se conserva únicamente en los conteos de cobertura y estado.
5. Estados `pending`, `running` y `failed` no aportan niveles.
6. `no_aplica` y las preguntas omitidas no son ceros y se excluyen de promedios y distribuciones de niveles.
7. Las observaciones textuales continúan identificadas como hallazgos de IA, aun cuando el docente haya revisado niveles, porque el contrato vigente no permite aprobar o editar cada observación.
8. No se presenta una nota global única. Se priorizan las cuatro dimensiones, criterios y evidencia de cobertura.
9. Todos los cálculos se realizan en código determinista compartido por la pantalla y los archivos; la IA no calcula agregados del curso.

## 3. Selección y filtros

Ambas pantallas permiten seleccionar:

- evaluación aplicada, incluidos estados `open`, `closed` y `archived`;
- paralelo participante;
- fuente de resultados: `Todos los utilizables`, `Solo revisados` o `Solo provisionales`.

La selección inicial usa la evaluación aplicada más reciente. El resumen exige elegir un paralelo; no mezcla cursos por defecto. La exportación exige también un paralelo y no ofrece una descarga general accidental de todos los estudiantes.

`Todos los utilizables` muestra revisados y provisionales, pero conserva la procedencia de cada fila y muestra cuántos pertenecen a cada estado. Si hay al menos un resultado provisional, el resumen se etiqueta `Resultados mixtos: contienen evaluación provisional de IA`.

## 4. Modelo de reporte

El cargador obtiene, para una evaluación y un paralelo autorizados:

- metadatos de evaluación y paralelo;
- estudiantes que recibieron acceso;
- entrega y fecha de entrega;
- preguntas congeladas, criterios y módulos activos;
- respuesta original, conteo de palabras y omisión;
- última fila de `ai_evaluations` por entrega según `requested_at`;
- `result_json`, confianza, estado, limitaciones, ajustes, nota y fecha de revisión docente.

Las consultas se ejecutan con la sesión docente y las políticas RLS vigentes. El cliente no recibe códigos personales, hashes, tokens ni huellas. No se introduce `service_role` en el navegador. La capa de acceso valida cada respuesta con esquemas estrictos antes de calcular o exportar.

Para el máximo vigente de 50 estudiantes y cuatro preguntas, el cargador utiliza consultas acotadas y paralelas después de validar evaluación y paralelo. No agrega una segunda fuente de datos ni persiste una copia del informe.

### 4.1 Resultado efectivo

Para cada criterio o módulo evaluado:

- `completed`: nivel y razón proceden de `result_json`; fuente `provisional_ia`;
- `reviewed`: si existe un ajuste docente con la misma posición e identificador, se usa su nivel y razón; si no existe, se conserva el valor de `result_json`; fuente `revisado_docente`;
- otros estados: no existe resultado utilizable.

Los ajustes duplicados, desconocidos o estructuralmente inválidos provocan un error de contrato y bloquean el informe; nunca se aplican parcialmente.

### 4.2 Agregados

Se calculan estas unidades:

- **Cobertura:** estudiantes esperados, iniciados, entregados, sin evaluación utilizable, provisionales, revisados, descartados, fallidos y en curso.
- **Dimensión por estudiante:** media de todos sus niveles numéricos efectivos pertenecientes a la dimensión. Incluye cantidad de juicios aplicables para no ocultar baja cobertura.
- **Criterio por estudiante:** media de sus niveles efectivos para ese criterio entre las preguntas donde fue aplicado.
- **Criterio del paralelo:** media de los promedios por estudiante. Así cada estudiante pesa una vez, aunque un criterio aparezca en varias preguntas.
- **Distribución 1–4:** conteo de juicios efectivos individuales por nivel; se muestra junto al número de estudiantes evaluados y de juicios para evitar confundir ambas unidades.
- **Omisiones:** estudiantes y respuestas omitidas, separados del desempeño medido.
- **Observaciones frecuentes:** frecuencia por código y severidad; las marcadas `needs_evidence_review` se cuentan aparte y no se presentan como confirmadas.

Los valores se muestran con dos decimales. Los archivos conservan el valor numérico sin convertirlo en texto localizado. Si no existe ningún nivel numérico, el promedio es vacío, no cero.

## 5. Pantalla Resumen diagnóstico

Orden de lectura:

1. Encabezado, evaluación, paralelo, estado de la evaluación y fecha del corte.
2. Aviso de procedencia: revisado, provisional o mixto.
3. Tarjetas de cobertura: esperados, entregados, evaluados utilizables y revisados.
4. Tabla de cuatro dimensiones: promedio, estudiantes medidos, juicios aplicables y cobertura.
5. Tabla de criterios: etiqueta de rúbrica, promedio, niveles 1–4, `no_aplica`, estudiantes medidos y evidencia pendiente de revisión.
6. Falencias frecuentes: criterios ordenados por promedio ascendente y, en empate, por mayor cantidad de niveles 1–2. No se etiqueta una falencia cuando hay menos de tres estudiantes medidos; se muestra `Muestra insuficiente`.
7. Fortalezas: criterios ordenados por promedio descendente y cantidad de niveles 3–4, con la misma regla de muestra mínima.
8. Observaciones IA frecuentes: código, etiqueta legible, frecuencia, severidad y cantidad pendiente de comprobar.
9. Tabla por estudiante: estado de entrega/evaluación, preguntas respondidas y omitidas, cuatro promedios dimensionales y enlace al detalle existente.

La interfaz permite ordenar las tablas, pero no altera los cálculos. Incluye estados de carga, vacío, error y ausencia de resultados utilizables. Es navegable por teclado; tablas tienen encabezados y descripciones, y ningún estado depende únicamente del color.

## 6. Pantalla Exportar

La pantalla reutiliza exactamente la selección, filtros y motor del resumen. Antes de descargar muestra:

- evaluación y paralelo;
- estudiantes incluidos;
- resultados revisados y provisionales incluidos;
- advertencia de datos personales;
- fecha y hora del corte.

### 6.1 Excel

Un botón genera un archivo `.xlsx` con estas hojas, en este orden:

1. `Resumen`: metadatos, advertencia de procedencia, cobertura y dimensiones.
2. `Estudiantes`: una fila por estudiante; estado, fechas, cobertura y cuatro dimensiones.
3. `Criterios`: una fila por estudiante, pregunta y criterio/módulo, con nivel original, nivel efectivo, fuente, razón efectiva, confianza y revisión de evidencia.
4. `Respuestas`: una fila por estudiante y pregunta, con consigna, respuesta original, palabras, omisión y fecha.
5. `Observaciones`: una fila por observación IA, con estudiante, pregunta, código, fragmento, explicación, severidad y revisión pendiente.

Los encabezados quedan congelados, los filtros automáticos habilitados, las fechas son fechas reales y los promedios son números. No se añaden fórmulas dependientes de Excel: el motor compartido escribe resultados ya calculados. El archivo usa formato sobrio de Yachayñan y no contiene hojas ocultas.

### 6.2 CSV

El CSV es una tabla larga compatible con Google Sheets, una fila por estudiante, pregunta y criterio/módulo. Incluye metadatos de evaluación/paralelo, respuesta original, omisión, identificador y etiqueta del criterio, nivel original, nivel efectivo, fuente, razón, confianza y códigos de observación de esa pregunta.

Se codifica en UTF-8 con BOM para apertura directa en Excel, usa coma y comillas RFC 4180, neutraliza celdas que empiecen por `=`, `+`, `-` o `@` para impedir inyección de fórmulas y conserva ñ y tildes. El nombre sigue `yachaynan-diagnostico_<evaluacion>_<paralelo>_<fecha>.<xlsx|csv>` con segmentos saneados.

La librería de escritura de Excel se carga dinámicamente solo al solicitar `.xlsx`, queda fijada en `package-lock.json` y no interviene en la carga normal del dashboard. CSV utiliza código propio pequeño y probado.

## 7. Privacidad y seguridad

- Solo una sesión con `app_metadata.role=teacher` y las políticas RLS puede leer datos.
- La exportación se produce localmente en memoria; no se sube a Supabase ni a un tercero.
- No se envía información adicional al proveedor de IA.
- La pantalla advierte que el archivo contiene datos personales y debe almacenarse en un lugar autorizado.
- No se incluyen códigos de acceso, hashes, tokens, huellas, claves, textos de rúbrica completos ni campos técnicos innecesarios.
- El informe es de solo lectura; no modifica entregas, evaluaciones ni revisiones.
- Una falla en una consulta o validación impide descargar un archivo incompleto presentado como válido.

## 8. Arquitectura modular

- `src/lib/api/diagnosticReport.ts`: carga y validación de datos protegidos.
- `src/features/diagnostics/diagnosticModel.ts`: tipos normalizados y aplicación estricta de ajustes.
- `src/features/diagnostics/diagnosticMetrics.ts`: agregados puros y deterministas.
- `src/features/diagnostics/DiagnosticSummaryScreen.tsx`: filtros y presentación.
- `src/features/diagnostics/DiagnosticExportScreen.tsx`: previsualización y descargas.
- `src/features/diagnostics/diagnosticCsv.ts`: serialización segura.
- `src/features/diagnostics/diagnosticWorkbook.ts`: creación diferida de Excel.
- componentes pequeños para cobertura, dimensiones, criterios, observaciones y estudiantes.

El motor no conoce React, Supabase ni Excel. Recibe un reporte normalizado y produce una estructura de métricas. Dashboard, CSV y Excel consumen esa estructura o sus filas fuente; no recalculan reglas por separado.

## 9. Errores y consistencia

- Si cambia el filtro, se invalida el reporte anterior antes de mostrar el siguiente.
- Si una evaluación carece de snapshot o una salida IA viola el contrato, el reporte identifica las entregas afectadas y bloquea la exportación completa. El docente debe reevaluarlas o descartarlas desde el detalle existente y recargar el informe; no existe exclusión silenciosa de filas.
- Una entrega sin evaluación sigue apareciendo en cobertura y estudiantes, pero no en promedios.
- Una respuesta omitida aparece en `Respuestas` y CSV como omitida, sin nivel numérico.
- Si se cierra la sesión durante la carga, se muestra el flujo habitual de sesión inválida.
- La descarga solo se habilita después de una carga válida y conserva en el archivo la fecha exacta del corte.

## 10. Pruebas y aceptación

La implementación se realiza con pruebas antes del código. Como mínimo debe demostrar:

1. Ajustes docentes sustituyen exactamente el criterio indicado y no mutan el resultado original.
2. `no_aplica`, omisiones, descartados y fallidos no reducen promedios.
3. El promedio del paralelo pondera una vez a cada estudiante por criterio.
4. Provisionales y revisados nunca pierden su etiqueta de procedencia.
5. El último intento de evaluación se selecciona determinísticamente.
6. Los filtros no mezclan evaluaciones ni paralelos.
7. Resumen, Excel y CSV producen los mismos conteos y promedios.
8. CSV conserva tildes, comillas y saltos de línea y neutraliza fórmulas.
9. Excel tiene las cinco hojas, encabezados, tipos y filas esperadas.
10. Estados vacíos y errores impiden descargas engañosas.
11. RLS impide lectura anónima y el cambio no amplía privilegios de escritura.
12. La puerta completa `npm run verify`, React Doctor y compilación pasan.

Antes de usarlo con estudiantes se realiza un ensayo productivo autorizado con datos ficticios: una entrega revisada, una provisional, una omitida, una fallida y una descartada. Se compara manualmente el dashboard con ambos archivos y se elimina después el conjunto ficticio si su eliminación está autorizada.

## 11. Fuera de alcance y siguiente corte

Quedan fuera de esta implementación: eliminar o trasladar estudiantes; comparar campañas a lo largo del año; estadísticas inferenciales; detector de IA; telemetría de escritura; envío a Google Drive; exportación automática programada; PDF; gráficos decorativos; y cálculo de calificaciones finales.

Después de este bloque se realizará la primera prueba real y se corregirán defectos operativos antes de ampliar la administración de estudiantes.
