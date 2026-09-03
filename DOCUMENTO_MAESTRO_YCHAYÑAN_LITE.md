# Documento maestro de Ychayñan Lite

**Versión:** 1.5  
**Fecha:** 29 de agosto de 2026  
**Estado:** especificación aprobada; cimentación local verificada; MVP aún no operativo  
**Responsable funcional y pedagógico:** docente propietario de la aplicación  
**Población objetivo:** estudiantes de 15 a 17 años  
**Naturaleza del producto:** aplicación web temporal con acceso estudiantil controlado y resultados privados

**Estado operativo verificable:** `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`

---

## 1. Función de este documento

Este documento es la fuente principal para diseñar, implementar, probar y operar Ychayñan Lite. Define el problema educativo, el alcance reducido, la experiencia de uso, las reglas de seguridad, el modelo de datos, la evaluación con inteligencia artificial, la rúbrica diagnóstica adaptada a estudiantes de 15 a 17 años, los reportes y el contrato de exportación hacia una futura integración con la aplicación educativa principal.

Cuando exista una contradicción, se aplicará este orden de autoridad:

1. La instrucción explícita y más reciente del docente responsable.
2. Este documento maestro para finalidad, alcance y reglas generales.
3. `RUBRICA_DIAGNOSTICA_COMPLETA.md` para significado pedagógico, criterios, descriptores y límites interpretativos.
4. `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md` para herramientas, arquitectura, contratos, seguridad, despliegue y operación.
5. La copia de `rubric-v1.json` congelada dentro de la evaluación para la ejecución técnica. Debe corresponder a la rúbrica humana; una diferencia bloquea el despliegue.
6. El código, las migraciones y las pruebas como evidencia del comportamiento implementado.
7. El Currículo Priorizado de Bachillerato vigente como referente oficial de alineación curricular.
8. `Base teórica.docx` y `Rubrica_Integral_360_Escritura.docx` como sustentos conceptuales y especializados, no como especificaciones operativas.

Ychayñan Lite no es una segunda plataforma educativa integral. Es una herramienta deliberadamente pequeña para recoger muestras auténticas, analizarlas de forma criterial y ayudar al docente a planificar la enseñanza de lectura y escritura.

---

## 2. Fuentes conceptuales y adaptación realizada

### 2.1. Fuente local inicial

El archivo `Base teórica.docx` aporta un marco amplio para evaluar la producción escrita desde:

- microestructura, macroestructura y superestructura;
- adecuación sociopragmática;
- procesos cognitivos de composición;
- pensamiento crítico y argumentación;
- planificación, textualización y revisión;
- corrección ortográfica, gramatical y discursiva.

El documento es valioso como base, pero no constituye todavía una rúbrica lista para usar. Contiene categorías académicas extensas, expectativas propias de escritores expertos, códigos de corrección parcialmente anglosajones y referencias internas del tipo `[cite: número]` sin una bibliografía consolidada. Esas referencias no deben presentarse como citas académicas verificadas hasta que se normalicen sus fuentes.

### 2.2. Currículo priorizado de Bachillerato

El archivo `Curriculo-Priorizado-Bachillerato.pdf` se incorpora como referente oficial para relacionar la evaluación diagnóstica con objetivos, criterios de evaluación, destrezas con criterios de desempeño e indicadores del área de Lengua y Literatura. La alineación no significa que Ychayñan Lite evalúe todo el currículo ni que la aplicación cuente con homologación o aprobación ministerial.

Los referentes principales para la primera versión son:

- `OG.LL.5`: lectura autónoma y estrategias cognitivas y metacognitivas según el propósito;
- `OG.LL.6`: selección y examen crítico de información y fuentes;
- `OG.LL.7`: producción de textos con propósitos y situaciones comunicativas diversas;
- `OG.LL.8`: aplicación de conocimientos de la lengua en composición y revisión;
- `CE.LL.5.4`: contenidos explícitos e implícitos, propósito, contexto, punto de vista, contradicciones, ambigüedades, falacias y contraste de fuentes;
- `CE.LL.5.5`: selección y valoración de fuentes por confiabilidad y punto de vista;
- `CE.LL.5.6`: proceso de escritura académica argumentativa, tesis, argumentos, párrafos, vocabulario preciso, citación e identificación de fuentes.

La aplicación no debe afirmar que mide integralmente Lengua y Literatura. La versión inicial no cubre de manera exhaustiva oralidad, diversidad lingüística, cultura digital, historia literaria, recreación literaria ni escritura creativa.

### 2.3. Rúbrica integral 360 de escritura

El archivo `Rubrica_Integral_360_Escritura.docx` aporta una matriz especializada para un ensayo argumentativo de 500 a 800 palabras desarrollado mediante planificación, borrador, corrección y versión final. Sus componentes de tesis, argumentación, fuentes, planificación, revisión, precisión léxica y autorregulación son pertinentes cuando la tarea produce evidencia suficiente.

No se adopta como rúbrica universal porque varias de sus dimensiones requieren una tarea extensa o múltiples productos. Tampoco se conservan descriptores que infieren sobrecarga cognitiva, intención interna o plagio no verificable. Sus aportes válidos se integran en los módulos opcionales de `RUBRICA_DIAGNOSTICA_COMPLETA.md`.

### 2.4. Decisiones de adaptación para 15–17 años

La rúbrica de Ychayñan Lite transforma la teoría en desempeños observables y apropiados para educación media. Se aplican estas decisiones:

- Se espera autonomía creciente, pero no dominio universitario.
- Se valoran tesis, razones, evidencia, contraste y matiz cuando la consigna los permite.
- No se exige intertextualidad multifuente si la evaluación presenta una sola lectura.
- No se infieren planificación, revisión profunda ni procesos mentales únicamente desde el texto final.
- Ortografía, acentuación y puntuación se analizan por separado del razonamiento.
- La extensión no se usa como sustituto de calidad.
- Una respuesta breve puede ser sólida si satisface la consigna con precisión.
- Una respuesta extensa puede ser débil si repite, se desvía o carece de evidencia.
- La IA no diagnostica trastornos, dificultades de aprendizaje, personalidad, inteligencia ni capacidad general.
- Los resultados describen desempeños observados en una situación concreta.

### 2.5. Banda educativa única inicial

La versión inicial trabaja con una sola banda confiable: **15–17 años**. Esta banda corresponde a una etapa de transición hacia mayor autonomía conceptual y discursiva. Se espera que el estudiante pueda:

- recuperar información explícita relevante;
- construir inferencias justificadas;
- formular una postura sobre el texto;
- seleccionar evidencia pertinente;
- explicar la relación entre evidencia y conclusión;
- organizar una respuesta con foco y progresión;
- utilizar un registro comprensible y adecuado;
- controlar de manera funcional sintaxis, ortografía y puntuación;
- reconocer matices o límites cuando la consigna y la lectura lo permitan.

No se espera automáticamente:

- argumentación especializada de nivel universitario;
- terminología lingüística técnica no enseñada ni solicitada;
- manejo de citación cuando la tarea no proporciona ni solicita fuentes;
- integración de múltiples fuentes cuando la evaluación presenta una sola lectura;
- refutación avanzada en toda respuesta;
- ausencia total de errores convencionales.

---

## 3. Propósito educativo

Ychayñan Lite permite obtener una línea base confiable para planificar la enseñanza. Debe ayudar al docente a responder preguntas como:

- ¿Qué comprende el estudiante de manera literal?
- ¿Qué inferencias puede construir y justificar?
- ¿Puede adoptar una postura crítica vinculada con la lectura?
- ¿Responde realmente a la consigna?
- ¿Organiza y desarrolla una idea central?
- ¿Relaciona afirmaciones, razones y evidencia?
- ¿Qué dificultades presenta en coherencia y cohesión?
- ¿Cómo utiliza vocabulario, registro y estructuras sintácticas?
- ¿Qué patrones aparecen en ortografía, acentuación y puntuación?
- ¿Qué fortalezas y necesidades predominan en cada paralelo?
- ¿Qué prioridades de enseñanza se desprenden de los datos?

El resultado no debe reducirse a una calificación. El producto principal es un perfil de fortalezas y necesidades por criterio, respaldado por evidencia observable.

---

## 4. Principios pedagógicos obligatorios

### 4.1. El texto es el ancla

Toda evaluación de comprensión debe usar la lectura proporcionada y la consigna exacta. La IA no debe introducir hechos externos como condición para considerar correcta una respuesta, salvo que la consigna solicite explícitamente una conexión con conocimientos previos.

### 4.2. Afirmación, evidencia y explicación son distintas

Una respuesta crítica o inferencial se analiza considerando:

1. qué afirma el estudiante;
2. qué evidencia selecciona;
3. cómo explica la relación entre la evidencia y su afirmación.

Copiar una frase no demuestra por sí solo comprensión. Dar una opinión sin ancla textual tampoco demuestra razonamiento lector.

### 4.3. El contenido y la forma se separan

Los errores ortográficos o tipográficos no deben ocultar una comprensión o argumentación válida. A la vez, una redacción superficialmente correcta no debe recibir una valoración alta si carece de pertinencia, razonamiento o evidencia.

### 4.4. La evaluación de IA es provisional

La IA produce un análisis privado para el docente. No asigna una decisión académica final, no modifica la respuesta original y no publica retroalimentación al estudiante. El docente puede confirmar, corregir o descartar cualquier análisis.

### 4.5. No se etiquetan estudiantes

Los informes deben usar expresiones como:

- “en esta respuesta no se identifica evidencia suficiente”;
- “presenta dificultad recurrente en la segmentación de oraciones”;
- “en dos de tres evaluaciones sostiene su postura con razones pertinentes”.

Se prohíben etiquetas como “mal lector”, “incapaz”, “perezoso”, “débil”, “poco inteligente” o diagnósticos clínicos.

### 4.6. El diagnóstico no produce retroalimentación estudiantil

La versión inicial no muestra al estudiante resultados, observaciones, puntajes ni recomendaciones. Después de entregar, el estudiante ve únicamente una confirmación de recepción.

---

## 5. Alcance funcional

### 5.1. Funciones incluidas

Ychayñan Lite debe permitir:

1. Iniciar sesión como único docente autorizado.
2. Crear y administrar paralelos.
3. Importar una nómina desde CSV o XLSX y confirmar una vista previa; en CSV puede revisar la codificación.
4. Corregir nombres y registrar variantes autorizadas.
5. Crear una evaluación diagnóstica.
6. Pegar o escribir una lectura corta.
7. Crear entre una y cuatro preguntas abiertas.
8. Asociar y congelar dentro de la evaluación una copia de `rubric-v1.json` con versión y hash.
9. Definir fecha y ventana de acceso.
10. Generar un código personal por estudiante y evaluación.
11. Permitir que el estudiante valide código y nombre completo.
12. Guardar borradores durante la sesión.
13. Aceptar una sola entrega por estudiante.
14. Conservar la escritura original sin correcciones automáticas.
15. Mostrar al docente pregunta, respuesta y metadatos operativos mínimos.
16. Solicitar evaluación con IA de una entrega.
17. Solicitar evaluación con IA de todas las entregas pendientes de un paralelo.
18. Reintentar únicamente análisis fallidos.
19. Revisar, editar, aprobar o descartar el análisis de IA.
20. Consultar un resumen por criterio, estudiante, pregunta y paralelo.
21. Asociar preguntas con criterios, destrezas e indicadores curriculares cuando corresponda.
22. Conservar y exportar las relaciones curriculares declaradas por pregunta, sin convertirlas en una métrica de cobertura.
23. Exportar datos en CSV y JSON.
24. Exportar datos y solicitar su eliminación mediante un procedimiento administrativo autorizado.

### 5.2. Generación asistida de preguntas

Por decisión posterior a la redacción inicial de este documento, se permite la **generación asistida de borradores de preguntas abiertas**. El docente entrega la lectura y un propósito, recibe una propuesta de título, propósito, instrucciones y preguntas con criterios sugeridos, y la revisa completa antes de aplicarla al formulario.

Continúan excluidas:

- la generación automática de lecturas;
- la publicación automática de cualquier propuesta;
- la sustitución del criterio docente.

Nada se guarda ni se abre a estudiantes sin una confirmación explícita del docente. La alineación curricular no la propone la IA: sigue siendo una decisión docente.

### 5.3. Funciones excluidas

La versión inicial no incluirá:

- cuentas de estudiantes;
- múltiples docentes;
- instituciones, licencias o planes;
- cursos con matrícula académica compleja;
- lector con progreso por capítulos;
- tutor conversacional;
- actividades cerradas o juegos;
- retroalimentación al estudiante;
- reintentos iniciados por estudiantes;
- calificación automática definitiva;
- mensajería o notificaciones;
- integración bidireccional con Google Sheets;
- generación automática de lecturas con IA;
- dashboards institucionales;
- predicción de rendimiento;
- perfiles psicológicos o diagnósticos de aprendizaje;
- análisis de pulsaciones de teclado;
- vigilancia mediante cámara o micrófono;
- detector de plagio o detector de textos generados por IA;
- procesamiento masivo diseñado para múltiples instituciones;
- seguimiento longitudinal dentro de Ychayñan Lite;
- sincronización automática con la aplicación principal;
- códigos QR;
- dashboard de cobertura curricular.

La aplicación se utilizará para una campaña diagnóstica puntual. La conservación anual, la comparación longitudinal y las funciones permanentes corresponderán a la futura implementación basada en Ecuafuturo. Ychayñan Lite solo debe preservar una exportación completa y verificable que pueda migrarse después.

---

## 6. Estructura recomendada de una evaluación diagnóstica

### 6.1. Lectura

La plantilla inicial recomienda:

- extensión aproximada de 600 a 1.000 palabras;
- vocabulario exigente pero comprensible por contexto;
- unidad temática clara;
- suficiente información para preguntas literales, inferenciales y críticas;
- ausencia de conocimientos especializados indispensables que no estén explicados;
- contenido culturalmente pertinente y respetuoso.

La longitud puede variar, pero debe ser compatible con una sesión total de 45 a 60 minutos.

### 6.2. Preguntas

La evaluación puede contener entre una y cuatro preguntas abiertas. La plantilla recomendada contiene tres:

1. **Comprensión y selección:** recuperar y organizar información relevante de la lectura.
2. **Inferencia explicada:** construir una conclusión a partir de pistas y explicar el vínculo.
3. **Respuesta crítica:** formular una postura, justificarla y usar evidencia textual.

La tercera pregunta debe ofrecer suficiente espacio para observar organización, argumentación y convenciones de escritura. Como referencia operativa, puede sugerir entre 250 y 400 palabras, sin penalizar mecánicamente una respuesta por no alcanzar una cantidad exacta.

Cada pregunta declara antes de publicarse:

- propósito diagnóstico;
- criterios centrales activos;
- módulos opcionales activos;
- códigos curriculares relacionados;
- evidencias que la consigna permite observar;
- extensión orientativa y fuentes permitidas;
- condiciones especiales de proceso, si existen.

La alineación curricular se registra mediante códigos de criterios de evaluación (`CE.LL`), destrezas con criterios de desempeño (`LL`) e indicadores (`I.LL`). El sistema puede mostrar descripciones comprensibles y asociar internamente los códigos para no convertir la creación de una evaluación en una tarea administrativa compleja.

### 6.3. Diseños diagnósticos ampliados

La plantilla de tres preguntas es el recorrido mínimo recomendado. Cuando el docente necesite evaluar aprendizajes adicionales puede crear:

- una comparación de dos textos para observar perspectiva, contraste y confiabilidad de fuentes;
- una respuesta argumentativa extensa para observar estructura del género;
- una actividad con esquema, borrador y versión final para observar planificación y revisión;
- una tarea con fuentes identificables para observar integración y citación;
- una autoevaluación escrita para observar reflexión metalingüística y autorregulación.

La campaña inicial de Ychayñan Lite implementa únicamente M1 y M3. Los demás diseños y módulos permanecen como referencia para Ecuafuturo y no deben ampliar el alcance de esta aplicación puntual.

### 6.4. Condiciones de escritura auténtica

Los campos de respuesta deben:

- desactivar autocorrección automática;
- desactivar capitalización automática cuando el navegador lo permita;
- desactivar sugerencias ortográficas del campo;
- conservar exactamente el texto enviado;
- guardar una copia de borrador sin alterar caracteres;
- informar antes de iniciar que la escritura debe ser individual;
- permitir al docente decidir si se bloquea pegar texto.

La evaluación se aplica únicamente de manera presencial y supervisada, con condiciones semejantes de dispositivo, tiempo e instrucciones entre paralelos. No se utiliza como tarea domiciliaria. Un error de digitación aislado no debe tratarse automáticamente como una dificultad ortográfica.

---

## 7. Identidad ligera y control de acceso

### 7.1. Nómina como identidad estable

Cada estudiante recibe un identificador interno estable que no depende de cómo escriba su nombre. Este identificador permite vincular preguntas, respuestas y resultados dentro de la campaña y exportarlos después a la aplicación principal.

Los datos mínimos de nómina son:

- identificador interno;
- dos nombres cuando existan;
- dos apellidos cuando existan;
- paralelo;
- variante autorizada opcional;
- estado activo o inactivo.

### 7.2. Código personal por evaluación

Para cada evaluación se genera un código aleatorio y específico para cada estudiante. El código:

- no se reutiliza entre evaluaciones;
- caduca cuando cierra la evaluación;
- se almacena como hash, no en texto visible permanente;
- no revela el nombre, paralelo ni identificador interno;
- puede imprimirse o entregarse individualmente;
- queda invalidado después de una entrega válida.

### 7.3. Coincidencia de nombre

El código identifica un único registro y el nombre completo funciona como segunda comprobación. La comparación aplica esta normalización:

1. Convierte mayúsculas y minúsculas a una forma común.
2. Elimina espacios al inicio y al final.
3. Reduce espacios internos repetidos a uno.
4. Considera equivalentes las vocales con y sin tilde.
5. Considera equivalentes `ü` y `u` para evitar rechazos de digitación.
6. Conserva `ñ` como letra distinta de `n`.
7. Convierte guiones y apóstrofos en separadores simples.
8. Elimina puntos y comas que no cambian el nombre.
9. Exige coincidencia exacta después de normalizar.
10. No aplica coincidencia aproximada entre nombres distintos.

Ejemplos:

- `JOSÉ  ANDRÉS MUÑOZ` coincide con `José Andrés Muñoz`.
- `Maria Fernanda  De-La-Cruz` puede coincidir con `María Fernanda De la Cruz`.
- `Pena` no coincide con `Peña`.
- Una persona sin segundo nombre se valida con la forma registrada en la nómina.

### 7.4. Protección frente a intentos indebidos

- La interfaz nunca muestra ni permite buscar la nómina completa.
- El error de acceso es genérico: “Los datos no coinciden o la evaluación no está disponible”.
- No se informa si falló el código, el nombre, la fecha o el estado.
- La coincidencia exacta del nombre se mantiene; no se acepta automáticamente una forma parcial después de varios fallos.
- El límite por dirección de red es generoso y nunca bloquea por sí solo a un estudiante, porque todo el aula puede compartir una misma IP.
- Los intentos por código y dispositivo reciben espera progresiva. Un bloqueo siempre es temporal.
- El docente puede ver el estado, desbloquear, autorizar una variante de nombre o regenerar el código.
- Una sesión iniciada recibe un token temporal de reanudación.
- No se permite mantener dos sesiones activas simultáneas para el mismo código.
- Después de entregar se ofrece “Finalizar y limpiar este equipo” para borrar sesión y borrador locales.

Este sistema reduce accesos accidentales o maliciosos, pero no garantiza identidad absoluta. Un estudiante puede compartir voluntariamente sus datos. La entrega individual del código y la supervisión en el aula siguen siendo controles necesarios.

---

## 8. Estados y reglas de entrega

### 8.1. Estados de participación

- `not_started`: el estudiante todavía no ha validado su acceso.
- `in_progress`: existe una sesión activa y un borrador recuperable.
- `submitted`: la entrega quedó cerrada.
- `submitted`: la entrega quedó cerrada; la versión Lite no reabre entregas.

### 8.2. Reglas

- Solo puede existir una entrega activa por estudiante y evaluación.
- Guardar borrador no cuenta como entregar.
- Recargar la página no crea otro intento.
- Cambiar de dispositivo no crea otro intento.
- Entregar bloquea nuevas modificaciones.
- El servidor, no el navegador, impone la unicidad.
- Una entrega enviada no se reabre en Lite; una nueva oportunidad se crea como otra evaluación para conservar el original.
- La respuesta original entregada queda inmutable y no se sustituye dentro de la misma evaluación.

### 8.3. Estados de análisis

- `pending`: todavía no se solicitó evaluación.
- `running`: una evaluación de IA está en curso.
- `completed`: existe un análisis provisional completo.
- `failed`: el análisis no pudo completarse y puede reintentarse.
- `reviewed`: el docente revisó el resultado.
- `discarded`: el docente descartó el resultado de IA.

---

## 9. Rúbrica diagnóstica analítica para 15–17 años

### 9.1. Fuente operativa

`RUBRICA_DIAGNOSTICA_COMPLETA.md`, versión 1.1, es la fuente operativa de criterios, descriptores, módulos opcionales, códigos curriculares, inventario de observaciones y contrato pedagógico de evaluación. Este documento maestro define cómo la aplicación utiliza y versiona la rúbrica, pero no duplica todos sus descriptores para evitar divergencias futuras.

La base de datos conserva una copia inmutable de la versión activa en cada evaluación. Un cambio posterior del archivo no modifica evaluaciones históricas.

### 9.2. Escala común

Cada criterio utiliza:

1. **Inicial:** el desempeño observado no resuelve la demanda central sin apoyo sustancial o presenta dificultades que impiden interpretar adecuadamente la respuesta.
2. **En desarrollo:** existe comprensión o control parcial, pero los vacíos afectan claridad, justificación, precisión o eficacia.
3. **Adecuado para la banda:** resuelve la demanda central con claridad y control funcional esperables entre los 15 y 17 años.
4. **Consolidado:** demuestra autonomía, precisión, integración o matiz superiores a lo necesario para resolver satisfactoriamente la demanda.
5. **No aplica:** la pregunta no solicita el desempeño o no proporciona evidencia suficiente para observarlo.

El nivel 3 representa el estándar esperado. El nivel 4 no exige perfección ni escritura universitaria. `no_aplica` se excluye de promedios e índices y nunca se convierte en nivel 1.

### 9.3. Criterios centrales

| Identificador | Criterio | Dimensión principal | Alineación curricular principal |
|---|---|---|---|
| `core.pertinencia` | Pertinencia y cumplimiento de la consigna | Respuesta y razonamiento | `OG.LL.7`, `LL.5.4.6` |
| `core.comprension_explicita` | Comprensión de información explícita | Comprensión lectora | `LL.5.3.1`, `I.LL.5.4.1` |
| `core.comprension_inferencial` | Comprensión inferencial | Comprensión lectora | `CE.LL.5.4`, `LL.5.3.2`, `I.LL.5.4.1` |
| `core.lectura_critica` | Lectura crítica y valoración | Comprensión lectora | `CE.LL.5.4`, `LL.5.3.1`, `LL.5.3.4`, `I.LL.5.4.1`, `I.LL.5.4.2` |
| `core.tesis_posicion` | Idea central, tesis o posición | Respuesta y razonamiento | `CE.LL.5.6`, `LL.5.4.1`, `LL.5.4.2`, `I.LL.5.6.1` |
| `core.evidencia_razonamiento` | Evidencia y razonamiento | Respuesta y razonamiento | `CE.LL.5.4`, `CE.LL.5.6`, `LL.5.3.2`, `LL.5.4.2` |
| `core.organizacion_coherencia` | Organización y coherencia global | Organización discursiva | `CE.LL.5.6`, `LL.5.4.7`, `I.LL.5.6.1` |
| `core.cohesion` | Cohesión y relaciones entre ideas | Organización discursiva | `CE.LL.5.6`, `LL.5.4.7`, `I.LL.5.6.1` |
| `core.lexico_registro` | Precisión léxica y adecuación del registro | Organización discursiva | `CE.LL.5.6`, `LL.5.4.6`, `LL.5.4.8`, `I.LL.5.6.1` |
| `core.sintaxis_concordancia` | Construcción sintáctica y concordancia | Convenciones de escritura | `OG.LL.8`, `CE.LL.5.6`, `LL.5.4.7` |
| `core.ortografia_acentuacion` | Ortografía literal y acentuación | Convenciones de escritura | `OG.LL.8`, `CE.LL.5.6` |
| `core.puntuacion_segmentacion` | Puntuación, segmentación y mayúsculas | Convenciones de escritura | `OG.LL.8`, `CE.LL.5.6`, `LL.5.4.7` |

### 9.4. Módulos opcionales

| Identificador | Módulo | Condición mínima de activación | Alineación curricular principal |
|---|---|---|---|
| `optional.proposito_punto_vista` | Propósito, contexto y punto de vista | La consigna solicita analizar intención, destinatario, contexto o perspectiva. | `CE.LL.5.4`, `LL.5.3.4`, `I.LL.5.4.2` |
| `optional.comparacion_fuentes` | Comparación y confiabilidad de fuentes | Existen dos o más textos o el estudiante puede seleccionar fuentes. | `CE.LL.5.4`, `CE.LL.5.5`, `LL.5.3.5`, `LL.5.3.6`, `I.LL.5.5.1` |
| `optional.estructura_argumentativa` | Estructura del texto argumentativo | La tarea exige una respuesta extensa con tesis y argumentos. | `CE.LL.5.6`, `LL.5.4.1`, `LL.5.4.2`, `I.LL.5.6.1` |
| `optional.planificacion` | Planificación observable | Se conserva un esquema u otra evidencia previa solicitada. | `CE.LL.5.6`, `LL.5.4.4` |
| `optional.revision` | Revisión sustantiva | Existen dos versiones comparables o un registro de cambios. | `CE.LL.5.6`, `LL.5.4.4` |
| `optional.citacion_fuentes` | Integración, citación e identificación de fuentes | La tarea proporciona, solicita o permite fuentes identificables. | `CE.LL.5.6`, `LL.5.4.3`, `I.LL.5.6.1` |
| `optional.reflexion_metalinguistica` | Reflexión metalingüística | Una pregunta solicita justificar decisiones lingüísticas o discursivas. | `OG.LL.8`, `LL.5.4.4` |
| `optional.autorregulacion_revision` | Autorregulación ante marcas de revisión | Existen marcas de revisión, oportunidad de corrección y una versión posterior. | `OG.LL.5`, `OG.LL.8`, `LL.5.4.4` |

Los módulos no se activan por inferencia de la IA. La configuración de la pregunta determina cuáles pueden evaluarse.

### 9.5. Perfil y no calificación única

La aplicación no debe ocultar los criterios dentro de una sola nota. El resultado principal es un perfil analítico. Puede calcularse un índice interno normalizado para ordenar o filtrar información, pero debe mostrarse junto con los criterios y no presentarse como diagnóstico global de capacidad, porcentaje de inteligencia, dominio total del currículo ni calificación ministerial.

Para cada criterio se conserva:

- nivel de 1 a 4 o `no_aplica`;
- razón breve;
- evidencia exacta tomada de la respuesta;
- nivel de confianza;
- observaciones asociadas;
- necesidad de revisión humana;
- decisión docente;
- versión de rúbrica.

---

## 10. Inventario de errores y observaciones

La rúbrica mide desempeño. El inventario registra fenómenos concretos para planificar enseñanza. Un mismo fragmento puede generar más de un código si contiene problemas distintos. La lista completa y las definiciones operativas se mantienen en `RUBRICA_DIAGNOSTICA_COMPLETA.md`; este resumen fija las categorías que el modelo de datos debe admitir.

| Código | Categoría | Uso diagnóstico |
|---|---|---|
| `TIPO` | Posible error tipográfico | Omisión, duplicación, inversión o pulsación posiblemente accidental. Se marca como posibilidad, no como certeza. |
| `ORT-L` | Ortografía literal | Sustitución, omisión o elección incorrecta de grafías. |
| `ORT-A` | Acentuación | Ausencia, presencia indebida o ubicación incorrecta de tilde. |
| `MAY` | Mayúsculas | Uso incorrecto u omisión en inicio, nombres propios u otros contextos normativos. |
| `PUNT` | Puntuación | Segmentación o jerarquización inadecuada mediante signos. |
| `CONC` | Concordancia | Discordancia de género, número, persona o estructura verbal. |
| `VERB` | Forma o correlación verbal | Conjugación, tiempo, aspecto o modo que altera la relación temporal o modal. |
| `PREP` | Régimen preposicional | Selección u omisión de preposición que afecta precisión o sentido. |
| `SINT` | Construcción sintáctica | Ruptura, secuencia incompleta, ambigüedad o sobrecarga estructural. |
| `REF` | Referencia | Pronombre, elipsis o referente léxico ambiguo o ausente. |
| `CONEC` | Conector | Omisión, repetición o selección inadecuada de relación lógica. |
| `LEX` | Selección léxica | Palabra imprecisa, impropia, redundante o semánticamente incompatible. |
| `REG` | Registro | Expresión que no se ajusta al propósito o destinatario de la consigna. |
| `REP` | Repetición innecesaria | Reiteración de palabras o ideas sin función explicativa, enfática o cohesiva. |
| `PARA` | Organización de párrafo | Párrafo sin función reconocible, con ideas no articuladas o segmentación inadecuada. |
| `COH` | Coherencia | Contradicción, digresión, vacío informativo o ruptura del eje temático. |
| `PERT` | Pertinencia | Contenido que no responde a la demanda específica. |
| `TESIS` | Tesis o idea central | Ausencia, amplitud excesiva, ambigüedad o inestabilidad de la posición organizadora. |
| `EVID` | Evidencia | Evidencia ausente, insuficiente, descontextualizada o no relacionada. |
| `RAZ` | Razonamiento | Salto lógico, generalización no sustentada o explicación incompleta. |
| `INF` | Inferencia | Conclusión incompatible con las pistas o relación inferencial no explicada. |
| `CRIT` | Valoración crítica | Juicio sin criterio, sustento o relación verificable con el texto. |
| `AMB` | Ambigüedad conceptual | Expresión que permite interpretaciones incompatibles y no se resuelve mediante el contexto. |
| `FAL` | Posible falacia | Patrón argumentativo problemático que exige confirmación docente. |
| `FUENTE` | Selección o confiabilidad de fuente | Fuente no pertinente, insuficientemente identificada o valorada sin criterios observables. |
| `CIT` | Citación o atribución | Cita, paráfrasis o información ajena sin integración o identificación adecuada. |
| `PERS` | Perspectiva o punto de vista | Confusión u omisión del punto de vista relevante para la consigna. |

Cada observación debe incluir:

- código;
- fragmento exacto;
- explicación privada para el docente;
- severidad: leve, moderada o alta según el efecto comunicativo;
- confianza;
- criterio de rúbrica relacionado;
- estado de revisión docente.

La frecuencia se reporta como conteo bruto y como tasa por cada 100 palabras. Esto evita concluir que una respuesta más larga es peor únicamente porque ofrece más oportunidades de error.

---

## 11. Contrato de evaluación con IA

### 11.1. Datos de entrada

Una llamada analiza la entrega completa de un estudiante y recibe únicamente:

- banda de 15–17 años;
- lectura completa o fragmento pertinente;
- preguntas e instrucciones ordenadas;
- criterios activos y módulos habilitados por pregunta;
- subconjunto pertinente del inventario de observaciones;
- respuestas originales del mismo estudiante;
- copia congelada de la rúbrica;
- códigos curriculares asociados como contexto pedagógico;
- borradores o evidencias de proceso solo cuando la aplicación realmente los haya recogido.

No se envían nombre, paralelo, identificador de estudiante, correo, código de acceso, dirección de red ni otro dato de identificación. El identificador de entrega se conserva localmente y se agrega al resultado después de la llamada.

### 11.2. Procedimiento exigido

La evaluación debe:

1. Determinar si la respuesta aborda la consigna.
2. Separar comprensión, razonamiento, organización y convenciones.
3. Evaluar únicamente criterios activos.
4. Citar fragmentos exactos como evidencia.
5. Distinguir error observable de inferencia incierta.
6. Registrar posibles errores tipográficos como hipótesis de baja fuerza.
7. Evitar premiar extensión, vocabulario rebuscado o tono seguro por sí mismos.
8. Admitir interpretaciones alternativas compatibles con el texto.
9. Señalar baja confianza o ambigüedad.
10. Registrar `no_aplica` cuando la consigna no permite observar el criterio.
11. No declarar plagio, intención, sobrecarga cognitiva ni otra causa no verificable.
12. Proponer prioridades de enseñanza para el docente, no mensajes para el estudiante.

### 11.3. Salida estructurada

Cada resultado contiene:

- identificador y versión de evaluación;
- versión de rúbrica;
- criterios evaluados;
- nivel 1–4 o `no_aplica` por criterio;
- módulos opcionales evaluados;
- códigos curriculares conservados como metadatos;
- razón por criterio;
- evidencia exacta por criterio;
- inventario de errores observados;
- fortalezas observadas;
- necesidades observadas;
- prioridades didácticas sugeridas;
- confianza global de 0 a 1;
- bandera de revisión obligatoria;
- advertencias sobre ambigüedad o contexto insuficiente;
- proveedor, modelo y versión de prompt para auditoría.

La confianza declarada por el modelo es una señal operativa para priorizar revisiones. No debe interpretarse como una probabilidad estadística calibrada mientras no exista una validación empírica con muestras evaluadas por el docente.

### 11.4. Revisión obligatoria

Toda evaluación de IA es provisional. Se debe destacar revisión prioritaria cuando:

- la confianza es inferior a 0,75;
- la respuesta admite más de una interpretación razonable;
- falta contexto textual;
- la respuesta es demasiado breve para aplicar un criterio;
- un criterio activo carece de la evidencia que la consigna debía producir;
- existe aparente contradicción entre puntaje y evidencia;
- la IA señala una posible falacia, problema de fuente o atribución que requiere juicio profesional;
- el análisis intenta inferir una condición personal o clínica;
- una variedad lingüística puede confundirse con un error.

### 11.5. Evaluación individual y por paralelo

“Evaluar todo el paralelo” no envía todas las entregas juntas. La aplicación realiza una llamada independiente por entrega, que contiene las respuestas de ese estudiante organizadas por pregunta. El resultado conserva niveles, evidencias y observaciones separados por pregunta y añade un resumen por dimensión.

El panel procesa un máximo de tres entregas simultáneas, persiste el estado de cada una y permite reintentar fallos individuales. Esto reduce llamadas repetidas, evita reenviar varias veces la lectura y la rúbrica y mantiene aislamiento entre estudiantes.

El resumen del paralelo se calcula después con datos estructurados. Si se utiliza IA para redactar una síntesis docente, recibe conteos y patrones anonimizados, no la nómina ni todas las respuestas crudas.

---

## 12. Revisión docente

La pantalla de revisión muestra:

- lectura o fragmento pertinente;
- pregunta;
- respuesta original sin modificaciones;
- cantidad de palabras;
- evaluación por criterios;
- módulos opcionales aplicables;
- alineación curricular de la pregunta;
- evidencias seleccionadas;
- errores y severidad;
- fortalezas y necesidades;
- confianza;
- advertencias.

El docente puede:

- confirmar un nivel;
- cambiar un nivel;
- marcar un criterio como `no_aplica`;
- editar la razón;
- eliminar un error mal identificado;
- añadir una observación;
- aprobar el análisis;
- descartarlo y solicitar uno nuevo;
- dejarlo pendiente.

Toda modificación docente conserva el valor sugerido originalmente para auditoría. La versión revisada es la fuente de verdad para reportes.

---

## 13. Reportes diagnósticos

### 13.1. Bandeja de respuestas

Debe permitir filtrar por:

- evaluación;
- paralelo;
- estudiante;
- pregunta;
- estado de entrega;
- estado de análisis;
- necesidad de revisión;
- criterio;
- nivel alcanzado;
- código curricular;
- módulo opcional.

### 13.2. Vista del estudiante

Muestra exclusivamente al docente:

- entrega y respuestas originales;
- perfil por las cuatro dimensiones;
- criterios activos desplegables;
- patrones de error observados;
- fortalezas;
- necesidades de enseñanza;
- estado provisional o revisado.

Ychayñan Lite no presenta comparación longitudinal. La futura aplicación basada en Ecuafuturo podrá importar esta línea base.

### 13.3. Vista del paralelo

Incluye:

- distribución por las cuatro dimensiones;
- criterios activos desplegables con promedio, mediana y cantidad de evidencias;
- porcentaje de estudiantes en nivel inicial o en desarrollo por criterio aplicable;
- frecuencia y tasa de errores por 100 palabras;
- fortalezas predominantes;
- necesidades predominantes;
- matriz estudiante × criterio;
- preguntas que produjeron mayor dificultad;
- prioridades didácticas sugeridas;
- códigos curriculares asociados a las preguntas como metadatos consultables y exportables.

Los códigos curriculares no se transforman en una métrica de cobertura ni en una calificación adicional.

### 13.4. Prioridades de planificación

Las prioridades se ordenan considerando:

1. cantidad de estudiantes afectados;
2. severidad del efecto sobre comprensión o comunicación;
3. recurrencia entre preguntas;
4. recurrencia entre evaluaciones;
5. relación con habilidades centrales de lectura y escritura.

Ejemplos de salidas válidas:

- “La mayoría identifica información explícita, pero requiere trabajo para explicar cómo una evidencia sostiene una inferencia”.
- “La puntuación afecta la segmentación de oraciones en 11 de 28 estudiantes; conviene trabajar límites oracionales antes de signos de mayor complejidad”.
- “El paralelo formula posturas claras, pero sus argumentos dependen de afirmaciones generales sin evidencia textual”.

---

## 14. Exportación y futura migración

Ychayñan Lite debe diseñarse para desaparecer sin perder la información útil.

### 14.1. Exportación CSV

Se generan archivos separados para:

- estudiantes;
- paralelos;
- evaluaciones;
- preguntas;
- entregas;
- respuestas;
- niveles por criterio;
- resultados de módulos opcionales;
- relaciones curriculares por pregunta;
- errores observados;
- revisiones docentes.

Los CSV deben abrirse correctamente en Excel y poder importarse en Google Sheets.

### 14.2. Exportación JSON

El paquete JSON conserva relaciones y versiones. Incluye:

- versión del esquema de exportación;
- identificadores estables;
- versión de rúbrica;
- versión curricular declarada;
- criterios, destrezas e indicadores asociados;
- módulos opcionales activos;
- texto original;
- evaluación de IA;
- revisión docente;
- metadatos mínimos de auditoría.

### 14.3. Identificadores

Las relaciones nunca dependen exclusivamente del nombre. Se utilizan UUID para:

- estudiante;
- paralelo;
- evaluación;
- pregunta;
- entrega;
- respuesta;
- evaluación de IA.

La rúbrica no tiene un UUID de tabla independiente: se identifica mediante versión de esquema y hash del snapshot congelado.

El futuro importador de la aplicación principal podrá mapear el UUID de Ychayñan Lite con el identificador definitivo sin confundir homónimos.

---

## 15. Modelo de datos conceptual

La versión inicial utiliza diez tablas. Supabase Auth contiene al único docente, identificado mediante `app_metadata.role = teacher`; no se crea una tabla de perfil adicional.

### `groups`

- identificador, nombre, año lectivo, estado y fechas.

### `students`

- identificador estable, nombres originales, nombre normalizado, variantes, paralelo, referencia de exportación, estado y fechas.

### `assessments`

- identificador, título, propósito, lectura, instrucciones, ventana, estado;
- configuración de pegado;
- `rubric_snapshot`, versión, hash y versión curricular.

### `questions`

- evaluación, orden, consigna, instrucciones y extensión orientativa;
- criterios activos, módulos habilitados y subconjunto de observaciones;
- relaciones curriculares exportables.

### `assessment_access`

- evaluación, estudiante, hash del código, estado, intentos, espera y fecha de uso; la expiración efectiva se deriva de la evaluación y la sesión;
- unicidad por evaluación y estudiante y por evaluación y hash del código.

### `student_sessions`

- acceso, hash del token, expiración, revocación y último uso.

### `access_rate_limits`

- evaluación, hash temporal de red o dispositivo, ventana, conteo y espera;
- nunca aplica un bloqueo individual únicamente por IP.

### `submissions`

- evaluación, estudiante, estado, inicio, entrega, clave idempotente y `draft_version integer not null default 0`;
- `draft_version` representa el borrador completo de la entrega, no una versión por pregunta, y tiene `CHECK (draft_version >= 0)`.

### `responses`

- entrega, pregunta, texto original, conteo de palabras, hash y fechas de guardado y entrega;
- la respuesta final queda bloqueada contra edición y eliminación.

### `ai_evaluations`

- entrega, estado, versión y hash de rúbrica, versión de prompt, proveedor y modelo;
- salida estructurada por pregunta, resumen por dimensión, confianza y errores seguros;
- salida original, ajustes, nota, identidad y fecha de revisión docente.

La versión utiliza exactamente diez tablas. No existen tablas separadas de versiones de rúbrica, `audit_events` ni una bitácora general de eventos. La rúbrica queda congelada en `assessments` y la trazabilidad mínima vive en `ai_evaluations`.

### Contrato objetivo de Edge Functions

La arquitectura objetivo contiene siete Edge Functions:

| Función                    | Estado                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `manage-assessment-access` | existe y está desplegada                                    |
| `validate-student`         | existe y está desplegada                                    |
| `save-draft`               | existe y está desplegada                                    |
| `submit-assessment`        | existe y está desplegada                                    |
| `generate-assessment-draft`| existe y está desplegada, en versión anterior al endurecimiento |
| `evaluate-submission`      | pendiente                                                   |
| `export-campaign`          | pendiente                                                   |

Cinco existen actualmente. `evaluate-submission` y `export-campaign` siguen pendientes, de modo que **la calificación de respuestas estudiantiles con IA continúa sin implementarse**: lo único que hoy usa el proveedor es la generación asistida de borradores de preguntas descrita en §5.2.

`manage-assessment-access` se ubica antes de `validate-student`. Requiere JWT docente y admite `open`, `regenerate` y `unblock`. Genera códigos aleatorios de ocho caracteres, calcula su HMAC con `ACCESS_CODE_PEPPER`, guarda solo el hash y devuelve el código en claro una sola vez al docente. `open` usa una operación SQL transaccional `security invoker` invocable solo por `service_role`; `PUBLIC`, `anon` y `authenticated` no reciben `EXECUTE`. `regenerate` sustituye el hash sin revelar el valor anterior y `unblock` retira un bloqueo temporal autorizado.

`save-draft` recibe `expectedDraftVersion`. Solo guarda cuando coincide con `submissions.draft_version`, incrementa la versión al éxito y devuelve conflicto sin sobrescribir cuando hay una versión más reciente.

---

## 16. Arquitectura técnica reducida

### 16.1. Componentes

- **React + TypeScript + Vite:** interfaz web del estudiante y panel docente.
- **Supabase PostgreSQL:** almacenamiento relacional.
- **Supabase Auth:** autenticación del único docente.
- **Supabase Edge Functions:** validación pública, entrega y llamadas privadas a la IA.
- **GitHub Pages:** publicación gratuita del frontend en el dominio `github.io`, sin dominio propio.
- **GitHub Actions:** compilación y despliegue automático del frontend.
- **Proveedor de IA intercambiable:** evaluación estructurada desde backend.

La aplicación utilizará `HashRouter` para que todas las rutas funcionen en GitHub Pages sin reescrituras de servidor. El repositorio será público, pero no contendrá datos estudiantiles, respuestas, credenciales, claves privadas ni documentos cuya publicación no haya sido autorizada. Supabase será un proyecto separado de la aplicación principal para aislar esta campaña diagnóstica.

### 16.2. Fronteras de seguridad

- El navegador nunca recibe la clave de IA.
- El navegador nunca recibe una clave privilegiada de Supabase.
- El estudiante no consulta tablas directamente.
- El estudiante solo interactúa con endpoints limitados para validar acceso, guardar borrador y entregar.
- El docente accede mediante sesión autenticada.
- Todas las tablas expuestas utilizan RLS y las políticas exigen el claim docente protegido.
- Los cambios sensibles se validan también en servidor.
- La respuesta original es inmutable después de entregar, salvo una nueva versión autorizada y auditada.

### 16.3. Procesamiento de lote simple

No se incorpora una cola externa en la primera versión. El panel docente:

1. identifica entregas pendientes;
2. inicia hasta tres evaluaciones simultáneas;
3. actualiza el estado de cada entrega;
4. espera o continúa con las siguientes;
5. permite reanudar el lote después de recargar;
6. reintenta únicamente fallos.

La persistencia del estado evita repetir evaluaciones ya completadas.

---

## 17. Pantallas de la versión inicial

### 17.1. Acceso docente

Formulario de inicio de sesión y recuperación segura.

### 17.2. Inicio docente

Resumen de evaluaciones recientes, entregas pendientes y análisis pendientes de revisión.

### 17.3. Paralelos y nómina

Crear paralelo, importar CSV o XLSX, revisar una vista previa y administrar nombres o variantes. En CSV permite detectar o seleccionar la codificación.

### 17.4. Crear evaluación

Título, lectura, preguntas, criterios centrales, módulos opcionales, alineación curricular, ventana de acceso y configuración diagnóstica. La interfaz muestra descripciones claras y permite consultar los códigos oficiales sin exigir que el docente los memorice.

### 17.5. Distribuir acceso

Lista imprimible o exportable con nombre y código personal.

### 17.6. Formulario estudiantil

Validación, instrucciones, lectura, preguntas, guardado automático, confirmación de entrega y cierre.

### 17.7. Respuestas

Tabla por paralelo con estados y acceso al detalle.

### 17.8. Revisión

Pregunta, respuesta, análisis de IA, criterios centrales, módulos opcionales, alineación curricular, evidencia, errores, confianza y controles docentes.

### 17.9. Resumen diagnóstico

Cuatro dimensiones como resumen principal, criterios desplegables, matriz del paralelo, patrones de error, prioridades didácticas y exportación.

---

## 18. Privacidad y conservación

- La aplicación almacena únicamente datos necesarios para el diagnóstico.
- Los nombres no se envían al proveedor de IA.
- Los códigos de acceso se almacenan como hash.
- Los resultados son visibles únicamente para el docente.
- No existe una página pública de resultados.
- Los registros de seguridad no conservan más información del dispositivo de la necesaria.
- Las exportaciones contienen datos personales y deben almacenarse en un lugar protegido.
- La aplicación permite exportar la información completa de un estudiante. La eliminación de entregas y resultados se mantiene fuera de la interfaz Lite y requiere un procedimiento administrativo autorizado después de exportar.
- Antes de abrir la campaña se define una fecha de eliminación. Las respuestas y evaluaciones se conservan durante el año lectivo y el periodo administrativo acordado; sesiones, códigos, límites y logs técnicos se eliminan en un máximo de 90 días.
- La exportación protegida puede conservarse según la política docente; las sesiones, códigos y límites se eliminan al cerrar la campaña.

---

## 19. Accesibilidad y experiencia

- Objetivo mínimo WCAG 2.2 AA.
- Navegación completa mediante teclado.
- Foco visible.
- Etiquetas asociadas a todos los campos.
- Mensajes de error comprensibles y no reveladores.
- Guardado automático anunciado sin interrumpir la escritura.
- Contraste suficiente.
- Diseño adaptable a computadora y teléfono, aunque se recomiende computadora para comparar condiciones.
- Área de escritura amplia y legible.
- Confirmación explícita antes de entregar.
- Protección frente a doble clic o doble envío.
- Recuperación del borrador ante una recarga.

---

## 20. Manejo de errores

### 20.1. Durante el acceso

Se muestra un mensaje genérico y se conserva la posibilidad de corregir datos dentro del límite de intentos.

### 20.2. Durante el guardado

El campo mantiene una copia local temporal. La interfaz indica si el servidor no confirmó el guardado y reintenta sin duplicar.

### 20.3. Durante la entrega

La aplicación usa una operación idempotente. Repetir la misma solicitud devuelve la confirmación existente y no crea otra entrega.

### 20.4. Durante la evaluación de IA

El fallo deja la evaluación de la entrega en estado `failed`, conserva todos los textos originales y permite reintentar. Ningún fallo de IA elimina o modifica una entrega.

### 20.5. Durante la exportación

El sistema valida cantidades y relaciones antes de generar archivos. La exportación incluye un manifiesto con fecha, versión del esquema y conteos.

---

## 21. Verificación y pruebas obligatorias

### 21.1. Identidad, red escolar e importación

- Acepta diferencias de mayúsculas y tildes, y conserva la diferencia entre `n` y `ñ`.
- No confunde homónimos con códigos diferentes ni acepta nombres parciales automáticamente.
- Rechaza códigos vencidos o ajenos sin revelar la nómina.
- Permite desbloqueo, variante autorizada y regeneración docente.
- Treinta accesos desde una misma IP no se bloquean colectivamente.
- La importación previsualiza UTF-8 y Windows-1252 sin corromper tildes ni `ñ`.

### 21.2. Entrega y recuperación

- Guarda el texto exacto en servidor y un borrador temporal en `localStorage`.
- Mantiene el token únicamente en `sessionStorage`.
- Recupera el borrador después de recargar o permanecer quince minutos sin red.
- Impide sesiones simultáneas y una segunda entrega.
- Tolera solicitudes repetidas sin duplicar.
- “Finalizar y limpiar” elimina sesión y borrador del equipo compartido.

### 21.3. Evaluación y calibración

- Una llamada evalúa una entrega completa y separa resultados por pregunta.
- Evalúa únicamente criterios activos y módulos habilitados.
- Usa solo observaciones relacionadas con la pregunta.
- Incluye evidencia verificable y normalizada por criterio.
- Una evidencia no encontrada marca ese criterio para revisión; no invalida toda la entrega.
- No envía identidad al proveedor ni produce diagnósticos personales.
- La calibración registra acuerdo exacto, adyacente, consistencia, fidelidad de evidencia, `no_aplica` y sesgos.
- Un criterio inestable queda `teacher_only` o en revisión prioritaria; no se elimina automáticamente.

### 21.4. Reportes y exportación

- El resumen principal usa cuatro dimensiones y permite desplegar criterios.
- Los conteos distinguen sin entrega, provisional y revisado.
- La revisión docente prevalece.
- No existe comparación longitudinal ni métrica de cobertura curricular.
- Los CSV abren con tildes y `ñ` correctas.
- Los UUID, versiones, hashes y conteos permiten reconstruir relaciones.

---

## 22. Criterios de aceptación de la primera versión

La versión inicial se considera funcional cuando:

1. El docente accede mediante autenticación y los estudiantes no tienen cuentas.
2. La nómina CSV o XLSX se previsualiza sin corrupción de caracteres.
3. Código y nombre completo exacto abren únicamente el registro correcto.
4. El aula completa puede entrar detrás de una misma IP.
5. Existe desbloqueo docente y limpieza del equipo compartido.
6. El borrador sobrevive a quince minutos sin conexión y la entrega es idempotente.
7. Un estudiante no puede entregar dos veces y el original queda inmutable.
8. La IA evalúa una entrega por llamada, separa preguntas y no recibe identidad.
9. El lote procesa hasta tres entregas simultáneas y reanuda fallos.
10. El docente revisa y modifica resultados.
11. La calibración define qué criterios permiten sugerencia automática.
12. El dashboard prioriza cuatro dimensiones y conserva criterios desplegables.
13. Los códigos curriculares se guardan y exportan sin afirmar cobertura.
14. Los datos se exportan en CSV y JSON con manifiesto, versiones y hashes.
15. Ningún resultado es visible para estudiantes y ninguna clave privada llega al navegador.

---

## 23. Secuencia de construcción

Las fases siguientes expresan la ruta completa del producto. No deben usarse como indicador de avance por sí solas. El estado comprobado de cada fase se registra en `ESTADO_REAL_PROGRESO_YCHAYNAN_LITE.md`.

### Fase 1: base segura

- proyecto independiente, autenticación docente, esquema reducido y RLS;
- paralelos, CSV y XLSX, previsualización, codificación CSV, normalización y variantes;
- pruebas con aula completa bajo una sola IP.

### Fase 2: calibración temprana

- crear `rubric-v1.json` y verificarlo contra la rúbrica humana;
- reunir 15–20 entregas anonimizadas o realizar un pequeño pilotaje;
- ejecutar dos corridas de IA y evaluación docente ciega;
- clasificar criterios como automáticos provisionales, revisión prioritaria o `teacher_only`.

### Fase 3: evaluación y entrega

- lectura, preguntas, códigos, acceso, borrador local y remoto;
- entrega única e idempotente;
- limpieza de equipo compartido;
- ensayo con quince minutos sin red.

### Fase 4: IA y revisión

- una llamada por entrega;
- salida por pregunta y dimensión;
- evidencia normalizada;
- lote de tres, reintentos y revisión docente.

### Fase 5: diagnóstico y salida

- dashboard mínimo;
- CSV, JSON y manifiesto;
- ensayo integral presencial;
- exportación, verificación y retiro.

---

## 24. Límites interpretativos

Los resultados permiten describir la respuesta observada, no explicar con certeza por qué ocurrió. En particular:

- Un error aislado puede ser tipográfico.
- Una respuesta breve puede deberse al tiempo, comprensión de la consigna, motivación o dificultad expresiva.
- La ausencia de evidencia puede reflejar comprensión parcial o desconocimiento de cómo justificar.
- Una estructura simple no demuestra por sí sola pensamiento simple.
- Un vocabulario complejo no demuestra por sí solo comprensión profunda.
- La velocidad de escritura no equivale a competencia.
- El uso de una variedad lingüística no normativa no debe penalizarse cuando no afecta el objetivo o la comprensión.
- La IA no puede confirmar autoría ni detectar de forma confiable que un texto fue generado por otra IA.

El docente debe interpretar los patrones junto con su conocimiento del contexto, la consigna, las condiciones de aplicación y otras evidencias educativas.

---

## 25. Decisiones consolidadas

- Un solo docente utiliza la aplicación.
- Los estudiantes no tienen cuentas.
- La identidad se apoya en nómina, código individual y nombre normalizado.
- Se conserva `ñ` como distinta de `n` y se ignoran tildes vocálicas para validar nombres.
- Solo existe una entrega por estudiante y evaluación; Lite no admite reaperturas posteriores.
- No hay retroalimentación estudiantil.
- La IA analiza para el docente y siempre queda sujeta a revisión.
- El diagnóstico separa comprensión, razonamiento, discurso y convenciones.
- `RUBRICA_DIAGNOSTICA_COMPLETA.md` define el significado pedagógico y `rubric-v1.json` será la fuente operativa validada.
- La rúbrica completa conserva doce criterios y ocho módulos; Ychayñan Lite implementa únicamente M1 y M3.
- La aplicación registra alineación con `CE.LL`, `LL` e `I.LL` sin afirmar evaluación integral del currículo.
- Planificación, revisión, citación y autorregulación quedan documentadas para Ecuafuturo y no se implementan en esta campaña Lite.
- Se conserva el historial de la campaña durante el año lectivo y hasta la fecha de eliminación definida; la exportación protegida permite migrarlo posteriormente a Ecuafuturo.
- Ychayñan Lite se utilizará en una campaña diagnóstica puntual; no implementará seguimiento longitudinal propio.
- La aplicación principal basada en Ecuafuturo asumirá las capacidades permanentes y la comparación del avance.
- Ychayñan Lite debe poder exportar y retirarse sin pérdida de datos.
- La arquitectura se reduce a diez tablas y siete Edge Functions; no incluye tabla de perfil, tabla de versiones de rúbrica, `audit_events`, una bitácora general ni función separada de lote. `manage-assessment-access` existe y está desplegada, y el conflicto optimista mediante `draft_version` ya está implementado; las funciones pendientes son `evaluate-submission` y `export-campaign`.
- El frontend se publicará gratuitamente en GitHub Pages mediante el enlace `github.io`; no se comprará dominio.
- El repositorio podrá ser público porque nunca almacenará datos, respuestas ni secretos.
- La base de datos y las funciones se alojarán en un proyecto Supabase separado y desechable después de exportar la campaña.

---

## 26. Mantenimiento del documento maestro

Este documento debe actualizarse cuando cambie cualquiera de los siguientes elementos:

- población o banda de edad;
- finalidad diagnóstica;
- rúbrica o descriptores;
- módulos opcionales y reglas de activación;
- currículo de referencia o códigos de alineación;
- política de acceso o intentos;
- salida de IA;
- visibilidad de resultados;
- modelo de reportes;
- retención de datos;
- contrato de exportación;
- arquitectura técnica;
- relación futura con la aplicación principal.

Cada cambio de rúbrica debe crear una nueva versión de `rubric-v1.json`. La evaluación aplicada conserva su snapshot y hash, y nunca se recalcula silenciosamente. Los cambios en `RUBRICA_DIAGNOSTICA_COMPLETA.md` deben reflejarse en este documento cuando afecten alcance, datos, interfaz, reportes, exportación o interpretación.

La alineación curricular también se versiona. Si el Ministerio publica una actualización, los códigos y descripciones se revisan antes de utilizarlos en nuevas evaluaciones; las relaciones históricas no se sustituyen de manera automática.

---

## 27. Resumen ejecutivo

Ychayñan Lite será una aplicación diagnóstica pequeña, de campaña puntual y con resultados privados. El docente carga una nómina, crea una lectura con preguntas, selecciona criterios centrales, módulos opcionales y alineación curricular, distribuye códigos personales y recibe una sola entrega auténtica por estudiante. La IA analiza cada entrega en una sola llamada y separa sus resultados por pregunta y por cuatro dimensiones: comprensión lectora, razonamiento, organización discursiva y convenciones. El docente conserva autoridad total, no se entrega retroalimentación al estudiante y los resultados se convierten en prioridades de planificación por estudiante y paralelo.

La rúbrica se alinea de forma explícita con objetivos, criterios, destrezas e indicadores pertinentes del Currículo Priorizado de Bachillerato, sin afirmar cobertura total ni homologación ministerial. La interfaz se publicará en GitHub Pages sin dominio propio y el backend aislado se ejecutará en Supabase. La aplicación se construye con una arquitectura mínima, mantiene datos exportables y no pretende sustituir a la plataforma educativa principal. Su valor reside en producir una línea base clara, auditable y pedagógicamente justa que pueda orientar la enseñanza y migrarse más adelante a Ecuafuturo.
