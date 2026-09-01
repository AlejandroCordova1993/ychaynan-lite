# Calibración pedagógica de la rúbrica diagnóstica para 15–17 años

**Tipo de documento:** auditoría pedagógica y propuesta de calibración
**Objeto auditado:** `rubric-v1.json` (versión 1.1) y `RUBRICA_DIAGNOSTICA_COMPLETA.md` (versión 1.1)
**Banda:** 15–17 años — Bachillerato General
**Área:** Lengua y Literatura
**Destinatario:** docente y responsable pedagógico. Este documento no produce retroalimentación para el estudiante.
**Estado:** propuesta documental. No modifica la rúbrica vigente ni ningún archivo del proyecto.

---

## 0. Alcance, método y advertencias

### 0.1. Qué es y qué no es este documento

Este informe audita la rúbrica vigente y propone su calibración. **No la reemplaza.** Mientras el responsable pedagógico no adopte formalmente las recomendaciones, la rúbrica operativa sigue siendo la versión 1.1 congelada en `rubric-v1.json`.

Ninguna de las recomendaciones aquí contenidas ha sido aplicada al código, al JSON operativo, a la base de datos ni a los documentos existentes. Cuando una recomendación exige tocar un archivo protegido, el informe lo declara de forma explícita y lo deja como decisión del responsable.

### 0.2. Fuentes utilizadas

| Fuente                                                             | Uso                                                                                                                     | Verificación                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `rubric-v1.json` v1.1                                              | Inventario operativo real de criterios, módulos activos, descriptores y códigos                                         | Leído íntegro                                                      |
| `RUBRICA_DIAGNOSTICA_COMPLETA.md` v1.1                             | Rúbrica humana: 12 criterios centrales, 8 módulos opcionales, inventario de 27 códigos, contrato de IA                  | Leído íntegro                                                      |
| `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md`                               | Decisiones de adaptación de banda (§2.4, §2.5), tabla de alineación (§9.3, §9.4), regla de no calificación única (§9.5) | Secciones pertinentes                                              |
| `GUIA_TECNICA_IMPLEMENTACION_YCHAYNAN_LITE.md`                     | Confirmación de que existe una prueba de contrato estructural sobre `rubric-v1.json`                                    | Referencias localizadas                                            |
| Currículo priorizado, Bachillerato General, 2025 (PDF ministerial) | Única fuente admitida para códigos curriculares                                                                         | Sección 8.1 «Lengua y Literatura», págs. 16–20, leída y transcrita |
| `Rubrica_Integral_360_Escritura.docx`                              | Antecedente teórico del instrumento; no es fuente curricular                                                            | Leído íntegro                                                      |

### 0.3. Regla de veracidad curricular aplicada

Todo código curricular citado en este informe fue localizado en el PDF ministerial y se indica su página. **No se ha inventado ningún código, destreza, indicador ni cita.** Cuando la relación entre un criterio de la rúbrica y el currículo no está escrita en el documento ministerial y proviene del razonamiento pedagógico, se marca literalmente como **inferencia pedagógica**.

### 0.4. Inventario curricular verificado

Fuente: Ministerio de Educación, Deporte y Cultura del Ecuador. _Currículo priorizado con énfasis en competencias comunicacionales, matemáticas, digitales y socioemocionales. Nivel de Bachillerato General_, 2025. Sección 8 «Mapas curriculares para el nivel de Bachillerato General», apartado 8.1 «Lengua y Literatura». En este tramo la numeración impresa coincide con la numeración de página del archivo PDF.

| Página | Contenido verificado                                                                                                                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16     | Objetivos de la asignatura `OG.LL.1` a `OG.LL.11`.                                                                                                                                                                                                                                                                                      |
| 17     | `CE.LL.5.1` (destrezas `LL.5.1.1`, `LL.5.1.2`; indicador `I.LL.5.1.1`); `CE.LL.5.2` (destrezas `LL.5.1.3`, `LL.5.1.4`; indicador referido `I.LL.5.2.1`); criterio de oralidad impreso como `E.LL.5.3` (destrezas `LL.5.2.1` a `LL.5.2.4`, con `LL.5.2.2` impresa como `L.5.2.2`; indicadores `I.LL.5.3.1`, `I.LL.5.3.2`, `I.LL.5.3.3`). |
| 18     | `CE.LL.5.4` con destrezas `LL.5.3.1`, `LL.5.3.2`, `LL.5.3.3`, `LL.5.3.4` y `LL.5.3.6`, e indicadores `I.LL.5.4.1` y `I.LL.5.4.2`. `CE.LL.5.5` con destrezas `LL.5.3.5`, `LL.5.3.7` y `LL.5.3.8`, e indicador `I.LL.5.5.1`.                                                                                                              |
| 19     | `CE.LL.5.6` con destrezas `LL.5.4.1`, `LL.5.4.2`, `LL.5.4.3`, `LL.5.4.4`, `LL.5.4.6`, `LL.5.4.7` y `LL.5.4.8`, e indicador `I.LL.5.6.1`, seguido de un párrafo referido como `I.LL.5.6.2`.                                                                                                                                              |
| 20     | `CE.LL.5.7` y `CE.LL.5.8` (literatura y recreación literaria), fuera del alcance de Ychayñan Lite.                                                                                                                                                                                                                                      |

Cuatro observaciones de exactitud, importantes porque afectan las citas que el docente registrará en cada pregunta:

1. **`LL.5.4.5` no aparece** en este currículo priorizado. La secuencia de destrezas de escritura salta de `LL.5.4.4` a `LL.5.4.6`. Ningún criterio debe citarla.
2. **`I.LL.5.6.2` no figura como indicador con enunciado propio**; aparece únicamente como referencia abreviada al final del bloque de `CE.LL.5.6` (pág. 19). Citarlo como indicador autónomo sería inexacto.
3. **`LL.5.3.6` pertenece a `CE.LL.5.4`**, no a `CE.LL.5.5` (pág. 18). La tabla §9.4 del documento maestro y la ficha M2 de la rúbrica humana agrupan `LL.5.3.5` y `LL.5.3.6` bajo una alineación mixta; la agrupación es defendible por contenido, pero la adscripción ministerial de cada destreza es la indicada aquí.
4. El PDF contiene dos erratas de impresión (`E.LL.5.3` por `CE.LL.5.3` y `L.5.2.2` por `LL.5.2.2`), ambas en la pág. 17 y ambas en el bloque de oralidad, que Ychayñan Lite no evalúa. No afectan a ningún criterio de la rúbrica, pero quedan registradas para que nadie las reproduzca como códigos válidos.

### 0.5. Relación con la rúbrica integral 360

`Rubrica_Integral_360_Escritura.docx` es el antecedente teórico del instrumento: 13 criterios en cinco dimensiones (textual, sociopragmática, cognitivo-procesal, crítico-discursiva, metalingüística), con ponderación porcentual y conversión a una nota sobre 10.

La rúbrica vigente de Ychayñan Lite **abandonó deliberadamente la ponderación y la nota única**, y esa decisión es correcta para un instrumento diagnóstico: una nota sobre 10 promedia comprensión con ortografía y borra exactamente las diferencias que el diagnóstico debe revelar. Esta auditoría confirma esa decisión y no propone revertirla.

El documento 360 se usa aquí solo como referencia conceptual en tres puntos: la distinción entre microestructura y macroestructura, que sostiene la separación de C7 y C8; la ubicación de registro y adecuación en una dimensión sociopragmática distinta de la textual, que sostiene la observación sobre C9; y la tipificación cualitativa de la revisión, que sostiene la lectura de M5. **El documento 360 no es fuente curricular** y ninguna alineación de este informe se apoya en él.

### 0.6. Objeto realmente auditado

`rubric-v1.json` contiene **14 elementos evaluables**: 12 criterios centrales y 2 módulos opcionales activos (`optional.proposito_punto_vista` y `optional.estructura_argumentativa`). Los seis módulos restantes existen solo en la rúbrica humana.

Este informe analiza **los 20 elementos** —los 14 operativos y los 6 documentados— porque un módulo documentado se activará en algún momento y su calibración no debe improvisarse entonces. Cada ficha declara si el elemento está o no en el JSON operativo.

### 0.7. Convención de las fichas

Cada ficha responde los doce puntos solicitados en el mismo orden. Los descriptores propuestos en el punto 6 son **texto alternativo sujeto a decisión**; cuando la ficha concluye «conservar», el descriptor propuesto reproduce el vigente y así se indica, para que la comparación con `rubric-v1.json` sea directa.

---

## 1. Síntesis ejecutiva

### 1.1. Estado general

La rúbrica vigente es un instrumento de calidad inusual para una aplicación de este tamaño. Sus aciertos estructurales —perfil analítico en lugar de nota, separación explícita de forma y contenido, `no_aplica` que nunca degrada a nivel 1, exigencia de evidencia textual por nivel, prohibición de atribuir causas mentales, congelación versionada por campaña— resuelven de antemano la mayoría de los errores que arruinan las rúbricas diagnósticas escolares.

Los problemas detectados no son de concepción. Son de **anclaje curricular desigual**, **umbrales de observabilidad no declarados** y **fiabilidad diferencial por criterio**. Ninguno impide el pilotaje; todos deben resolverse antes de que la aplicación proponga niveles automáticos.

### 1.2. Los tres grados de anclaje curricular

El hallazgo transversal más importante es que **los doce criterios no tienen el mismo respaldo ministerial**, y la rúbrica no lo declara con suficiente claridad.

| Grado                                   | Significado                                                                                            | Criterios                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **A. Anclaje directo**                  | Existe una destreza con criterio de desempeño que describe el desempeño del criterio                   | C4, C5, C6, C7, C8, C9 (mitad léxica), M1, M2, M3, M4, M5, M6 |
| **B. Anclaje solo en objetivo general** | No hay destreza; el respaldo es `OG.LL.8`, que es un objetivo de asignatura, no un desempeño evaluable | C10, C11, C12                                                 |
| **C. Sin anclaje explícito**            | El vínculo es razonamiento pedagógico del instrumento                                                  | C1, C2, C9 (mitad de registro), M7, M8                        |

Esto no invalida ningún criterio. Un instrumento diagnóstico puede y debe observar desempeños que el currículo da por supuestos. Lo que no puede hacer es **presentar un vínculo inferido como si fuera una cita ministerial**, porque el docente registrará esos códigos en la ficha de cada pregunta y esa ficha circula como documento pedagógico.

El caso más delicado es **C2**. La rúbrica lo alinea con `LL.5.3.1`, pero `LL.5.3.1` (pág. 18) no describe recuperación literal: describe valorar críticamente el contenido explícito de dos o más textos identificando contradicciones, ambigüedades y falacias. La recuperación literal es el prerrequisito habilitante de esa destreza, no su realización. En el currículo priorizado de Bachillerato **no existe una destreza de recuperación de información explícita**, porque a esta altura se da por adquirida. El criterio C2 debe conservarse —es diagnósticamente indispensable, y precisamente su ausencia curricular explica por qué conviene medirlo— pero su alineación debe declararse como inferencia.

### 1.3. Los siete hallazgos que exigen acción

1. **C2 está alineado con una destreza que describe otra operación** (§1.2). Corregir la declaración de alineación, conservar el criterio.
2. **C1 no es una destreza: es un criterio de validez de la muestra.** Si una respuesta está fuera de consigna, C2, C3, C4, C5 y C6 no pueden observarse; hoy nada impide que reciban nivel 1 por una razón que no es de comprensión. Falta una regla de habilitación.
3. **C9 fusiona dos construcciones con condiciones de observación distintas.** «Precisión léxica» tiene anclaje directo (`LL.5.4.6`, `LL.5.4.8`, pág. 19); «adecuación del registro» no lo tiene y solo es observable si la consigna declara destinatario y género. Hoy pueden confundirse en un único nivel.
4. **C7 y C8 comparten una sola destreza** (`LL.5.4.7`) y descriptores parcialmente permeables. La separación es correcta, pero la matriz debe declarar que la distinción entre coherencia global y cohesión local es inferencia pedagógica sobre una fuente compartida.
5. **C10, C11 y C12 usan descriptores de frecuencia sin umbral operativo** («frecuentes», «recurrentes», «ocasionales»). Es la mayor fuente de subjetividad y de posible sesgo contra variedad lingüística y contra estudiantes con menor velocidad de tecleo.
6. **`no_aplica` cubre dos situaciones que el diagnóstico necesita distinguir**: «la consigna no lo pedía» y «la respuesta fue demasiado breve para observarlo». La segunda es información pedagógica; la primera no lo es. Hoy se pierden ambas bajo la misma etiqueta.
7. **La puerta de fidelidad de fragmentos (95 %) es insuficiente para C11 y C12.** En esos criterios el fragmento _es_ la evidencia: un fragmento «silenciosamente corregido» no degrada la evidencia, la destruye. La puerta debe ser 100 % para esos dos criterios.

### 1.4. Vacíos de cobertura declarables

- **`LL.5.3.3`** (autorregulación de la comprensión mediante estrategias cognitivas y metacognitivas, pág. 18) pertenece a `CE.LL.5.4` y **no tiene ningún criterio correspondiente** en la rúbrica. Es correcto que no lo tenga: el formato de la campaña no recoge evidencia de proceso lector. Debe declararse como vacío consciente, no quedar como omisión silenciosa.
- **`LL.5.3.5`, `LL.5.3.7`, `LL.5.3.8`** (`CE.LL.5.5`, pág. 18) requieren consulta de fuentes digitales. Solo M2 los toca, y M2 no está en el JSON operativo.
- **`CE.LL.5.1`, `CE.LL.5.2`, `CE.LL.5.3`, `CE.LL.5.7`, `CE.LL.5.8`** están fuera de alcance por decisión ya documentada en §2.2 de la rúbrica humana. Esta auditoría lo confirma como correcto.

### 1.5. Fiabilidad diferencial de la evaluación asistida por IA

Ningún criterio es igualmente automatizable. La tabla siguiente resume la evaluación detallada del punto 10 de cada ficha.

| Viabilidad                                                     | Criterios                           | Condición                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alta** — el modelo puede proponer nivel con revisión ligera  | C2                                  | La respuesta es contrastable palabra por palabra contra la lectura fuente.                                                                    |
| **Media-alta** — proponer nivel, revisión sistemática          | C1, C11, C12                        | C11 y C12 son verificables por patrón, pero exigen fidelidad de cita del 100 %.                                                               |
| **Media** — proponer nivel, revisión obligatoria antes de usar | C3, C5, C7, C8, C9, C10, M1, M3, M6 | Dependen de juicio sobre suficiencia o adecuación.                                                                                            |
| **Baja — solo docente hasta calibración empírica**             | C4, C6, M2, M7, M8                  | Exigen juzgar la _validez_ de una razón, no su presencia. Es donde el sesgo de fluidez y de extensión del modelo es más difícil de controlar. |
| **No evaluable por IA en el formato actual**                   | M4, M5                              | Requieren evidencia de proceso que la aplicación no recoge.                                                                                   |

Tres sesgos de modelo, comunes y documentados, que la calibración de §15.1 debe medir explícitamente porque afectan a criterios distintos:

- **Sesgo de extensión.** El modelo tiende a asignar niveles más altos a respuestas largas. Afecta sobre todo a C5, C6, C7 y M3. La rúbrica ya lo prohíbe en el principio 5 y ya lo incluye entre las puertas de §15.1; la medición debe hacerse por criterio, no de forma global.
- **Sesgo de fluidez.** Una prosa bien construida y vacía puede recibir nivel 3 en C6 y en C4 sin que exista razonamiento verificable. Es el motivo por el que C4 y C6 se marcan como criterios de docente.
- **Sesgo contra variedad lingüística.** Rasgos regionales del castellano ecuatoriano y formas orales legítimas pueden registrarse como `LEX`, `REG` o `SINT`. Afecta a C9 y C10. La rúbrica ya prevé medirlo en §15.1, punto 4; esta auditoría recomienda que ese punto se convierta en una puerta con umbral, no en una observación cualitativa.

Además, el modelo presenta un modo de fallo específico y contraintuitivo en ortografía: **corrige inadvertidamente al citar**. Cita el fragmento con la tilde puesta y en la misma respuesta reporta la tilde ausente. La prohibición de §12.4 es correcta; lo que falta es la puerta de verificación que la haga exigible (hallazgo 7).

### 1.6. Condiciones para que el análisis longitudinal siga siendo posible

Ychayñan Lite recoge una línea base y no calcula progreso (§11 de la rúbrica humana). La comparación anual corresponderá a Ecuafuturo. Para que esa comparación futura sea válida, cualquier calibración adoptada ahora debe respetar cuatro reglas:

1. **Los identificadores de criterio no se reutilizan.** Si un criterio se divide o cambia de construcción, se retira su identificador y se crean identificadores nuevos. Reutilizar `core.lexico_registro` para un criterio que ya no mide registro haría que una serie histórica comparase cosas distintas bajo el mismo nombre, sin ningún aviso.
2. **Los criterios no se reordenan.** El orden actual está fijado por el contrato estructural; alterarlo sin cambiar la versión rompería la correspondencia entre resultados congelados y rúbrica.
3. **`no_aplica` nunca entra en un promedio ni se convierte en 1.** La regla ya existe y debe conservarse. Un criterio que se activa en la campaña 1 y no en la campaña 2 produciría un falso descenso si `no_aplica` contase como cero.
4. **Cada campaña deja constancia de qué módulos quedaron fuera de alcance.** Si la campaña 1 no activa M4 y M5 y la campaña 2 sí, la aparición de esos módulos no debe leerse como cambio de desempeño.

### 1.7. Unidad mínima de evidencia por criterio

Ningún criterio de esta rúbrica debería interpretarse a partir de una única pregunta, pero la exigencia no es igual para todos. La columna «mínimo para nivel» indica lo necesario para asignar un nivel en esa pregunta; la columna «mínimo para patrón» indica lo necesario para que el resultado se use como prioridad de planificación.

| Criterio                    | Mínimo para asignar nivel                                                | Mínimo para leerlo como patrón                                                   |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| C1 Pertinencia              | 1 respuesta con consigna recuperable                                     | 2 respuestas                                                                     |
| C2 Comprensión explícita    | 1 respuesta anclada a la lectura                                         | 2 respuestas de distinto tipo de dato                                            |
| C3 Comprensión inferencial  | 1 respuesta que exija inferencia                                         | **2 respuestas**: una inferencia aislada puede acertarse por conocimiento previo |
| C4 Lectura crítica          | 1 respuesta valorativa de extensión media                                | **2 respuestas**                                                                 |
| C5 Tesis o posición         | 1 respuesta extensa, o 2 breves                                          | 2 respuestas                                                                     |
| C6 Evidencia y razonamiento | 1 respuesta que exija justificar                                         | **2 respuestas**                                                                 |
| C7 Organización             | 1 respuesta de ≥ 80 palabras                                             | 2 respuestas extensas                                                            |
| C8 Cohesión                 | 1 respuesta con ≥ 2 proposiciones enlazadas                              | 2 respuestas                                                                     |
| C9 Léxico y registro        | 1 respuesta con elección léxica observable                               | 2 respuestas; registro exige consigna con destinatario declarado                 |
| C10 Sintaxis                | ≈ 100 palabras acumuladas                                                | 2 respuestas                                                                     |
| C11 Ortografía              | ≈ 150–200 palabras acumuladas para que la tasa por 100 sea interpretable | conjunto completo de la entrega                                                  |
| C12 Puntuación              | ≈ 100 palabras acumuladas                                                | conjunto completo de la entrega                                                  |

Los umbrales de palabras son **propuestas de calibración**, no reglas ministeriales ni verdades estadísticas. Su función es evitar que una tasa por 100 palabras calculada sobre 30 palabras se presente como si fuera comparable con una calculada sobre 400. El responsable debe fijarlos definitivamente durante el pilotaje.

---

## 2. Fichas de los criterios centrales

Los doce criterios centrales están todos presentes en `rubric-v1.json`.

---

### C1 — Pertinencia y cumplimiento de la consigna

**1. Nombre e identificador.** «Pertinencia y cumplimiento de la consigna» — `core.pertinencia`. Dimensión: respuesta y razonamiento. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** No mide una capacidad de lectura ni de escritura en sentido estricto. Mide la **capacidad de interpretar y ejecutar una demanda académica**: identificar la acción solicitada, reconocer las condiciones explícitas y mantener el foco. Es una competencia de gestión de tarea, cognitivamente real y escolarmente decisiva, pero de naturaleza distinta a la de los demás criterios.

**3. Evidencia observable.** La respuesta ejecuta el verbo de la consigna (explicar, comparar, justificar, resumir, tomar posición) sobre el objeto que la consigna nombra, y satisface las condiciones que la consigna declara (extensión mínima, uso de la lectura, número de razones). Es observable por contraste directo entre el enunciado y el texto producido; no requiere inferir intención.

**4. Adecuación para 15–17 años.** Adecuado. A esta edad el estudiante puede y debe descomponer una consigna de varias condiciones. Los descriptores vigentes son sobrios y no exigen nada propio de escritura universitaria.

**5. Ambigüedades y solapamientos.** Dos, ambos significativos.

El primero es con **C7** (organización y coherencia): «incluye digresiones que debilitan la respuesta» (nivel 2 de C1) y «cambian de tema sin una transición comprensible» (nivel 2 de C7) pueden aplicarse al mismo fragmento. La frontera correcta es: C1 juzga la relación entre la respuesta y **la consigna**; C7 juzga la relación entre las partes de la respuesta **entre sí**. Una respuesta puede ser internamente impecable y estar completamente fuera de consigna, y a la inversa.

El segundo es más grave y no está resuelto en la rúbrica vigente: **C1 condiciona la observabilidad de C2, C3, C4, C5 y C6**. Si el estudiante respondió a otra cosa, no hay evidencia de que comprenda o no comprenda la lectura; hay evidencia de que no ejecutó la tarea. Hoy nada impide que en esa situación los cinco criterios de comprensión y razonamiento reciban nivel 1, produciendo un perfil que atribuye a la comprensión un problema que es de interpretación de consigna. Esto contradice el espíritu del principio 3 de la rúbrica, pero el principio 3 solo cubre los criterios que la consigna no pide, no los que la respuesta impide observar.

**6. Descriptores propuestos para cuatro niveles.** Se conservan los vigentes sin cambio de redacción, porque son precisos y ya evitan el juicio de intención.

| Nivel                  | Descriptor                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | Responde a otro tema, omite la acción principal de la consigna o produce contenido insuficiente para reconocer una respuesta a la tarea.         |
| En desarrollo          | Aborda una parte de la consigna, pero omite una condición importante, cambia de foco o incluye digresiones que debilitan la respuesta.           |
| Adecuado para la banda | Responde directamente a la tarea, mantiene el foco y satisface las condiciones esenciales de contenido y formato.                                |
| Consolidado            | Responde con precisión, jerarquiza lo relevante, satisface todas las condiciones y desarrolla la tarea sin digresiones ni contenido innecesario. |

Lo que se propone añadir no es un descriptor sino una **regla de habilitación**, redactada como norma de aplicación:

> Cuando C1 se sitúa en nivel inicial, los criterios `core.comprension_explicita`, `core.comprension_inferencial`, `core.lectura_critica`, `core.tesis_posicion` y `core.evidencia_razonamiento` no se evalúan en esa pregunta: se registran como no observables y la entrega se marca para revisión docente. Los criterios de convenciones (C10, C11, C12) sí pueden evaluarse, porque el texto producido sigue siendo texto.

**7. Errores y dificultades típicas que permite detectar.** Lectura parcial del enunciado (se ejecuta la primera cláusula y se ignora la segunda); sustitución del verbo solicitado por uno más fácil (se resume cuando se pidió valorar, se opina cuando se pidió inferir); respuesta a la pregunta que el estudiante esperaba en lugar de la formulada; relleno por extensión ante una consigna no comprendida.

**8. Interpretación pedagógica para el docente.** Un nivel 1 o 2 recurrente en C1 con niveles adecuados en el resto es una de las señales más accionables del instrumento: indica que el problema no está en la lectura ni en la escritura, sino en la comprensión de enunciados académicos. Se enseña, y se enseña rápido. Antes de concluirlo, el docente debe revisar la consigna misma: una consigna con dos verbos, una condición escondida en subordinada o un vocabulario técnico no enseñado produce C1 bajo en todo el paralelo, y eso es un defecto del instrumento, no del estudiante.

**9. Riesgos de evaluación injusta.** Alto si la consigna está mal redactada: C1 mide entonces la calidad del enunciado. Alto también si el docente confunde «no respondió lo que yo esperaba» con «no respondió lo que se pidió»; el criterio debe aplicarse contra el texto de la consigna, no contra la respuesta ideal imaginada. Riesgo adicional en respuestas breves pero exactas: el principio 5 de la rúbrica lo protege, pero conviene recordarlo porque es la confusión más frecuente en la práctica escolar.

**10. Evaluación asistida por IA y límites.** Viabilidad **media-alta**. El modelo dispone de la consigna y de la respuesta y puede contrastarlas. Límites: tiende a ser indulgente cuando la respuesta es fluida y toca el tema general aunque no ejecute el verbo solicitado, y tiende a ser severo con respuestas correctas y muy breves. Ambos sesgos deben medirse en la calibración. La regla de habilitación propuesta en el punto 6 es especialmente importante si la IA propone niveles, porque un modelo que asigna 1 en C1 y 1 en C2 a la vez produce un perfil coherente en apariencia y falso en el fondo.

**11. Relación con el currículo ecuatoriano.** **Inferencia pedagógica.** No existe en el currículo priorizado de Bachillerato una destreza que describa el cumplimiento de una consigna académica. La alineación vigente con `LL.5.4.6` (pág. 19) es imprecisa: esa destreza describe expresar postura u opinión mediante el uso crítico del significado de las palabras, lo que corresponde a C9 y en parte a C4, no a la pertinencia. La alineación con `OG.LL.7` (pág. 16), objetivo de producción de textos con distintos propósitos en variadas situaciones comunicativas, es defendible como marco general, pero un objetivo de asignatura no es un desempeño evaluable.

**12. Recomendación.** **Conservar el criterio y modificar dos cosas fuera del criterio.** Primero, corregir su declaración de alineación: `OG.LL.7` como referente general y retirada de `LL.5.4.6`, con la marca explícita de inferencia pedagógica. Segundo, incorporar la regla de habilitación del punto 6 al documento humano y al contrato de IA. Los descriptores no cambian.

---

### C2 — Comprensión de información explícita

**1. Nombre e identificador.** «Comprensión de información explícita» — `core.comprension_explicita`. Dimensión: comprensión lectora. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Localizar en el texto la información que la pregunta requiere, reformularla con fidelidad y —en el nivel superior— seleccionarla y jerarquizarla. Es comprensión literal en sentido estricto: no exige que el estudiante añada nada al texto, exige que no lo deforme.

**3. Evidencia observable.** Correspondencia verificable entre lo que la respuesta afirma y lo que la lectura dice. Es el único criterio del instrumento **falsable palabra por palabra**: el fragmento citado existe o no existe en la fuente, y el dato coincide o no coincide.

**4. Adecuación para 15–17 años.** Adecuado, con una advertencia. A esta edad la recuperación literal ya no es un logro; es un piso. Su valor diagnóstico no está en el nivel 3, que se espera de casi todos, sino en el nivel 1 y en el contraste con C3 y C4. El descriptor de nivel 4 («selecciona, organiza y sintetiza… diferenciando ideas centrales, relaciones y detalles de apoyo») está bien calibrado precisamente porque no premia repetir más, sino organizar mejor.

**5. Ambigüedades y solapamientos.** El solapamiento con **C3** es el más importante del instrumento y la rúbrica ya lo gestiona con reglas de no aplicación cruzadas. La frontera operativa debe ser: si la información está en el texto y basta localizarla, es C2; si hay que construir una relación no escrita, es C3. El riesgo real aparece en las respuestas que **parafrasean tan libremente que introducen contenido nuevo**: técnicamente es C2 defectuoso (imprecisión), pero se lee como C3 (inferencia no justificada). Regla propuesta: si el contenido añadido contradice o excede el texto, se registra como C2 nivel 2 con código `INF` solo si la respuesta presenta ese añadido como si estuviera escrito en la lectura.

Solapamiento menor con **C1**: no recuperar el dato correcto porque no se entendió la pregunta es C1, no C2.

**6. Descriptores propuestos para cuatro niveles.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Confunde datos centrales, contradice información explícita o no identifica la información necesaria para responder.                 |
| En desarrollo          | Recupera información pertinente de manera parcial, pero mezcla detalles, omite relaciones importantes o introduce imprecisiones.    |
| Adecuado para la banda | Identifica y reformula con fidelidad la información explícita necesaria para resolver la pregunta.                                  |
| Consolidado            | Selecciona, organiza y sintetiza la información explícita relevante, diferenciando ideas centrales, relaciones y detalles de apoyo. |

**7. Errores y dificultades típicas.** Copia literal extensa sin selección (frecuente y engañosa: parece control y es evitación); recuperación del dato adyacente al correcto, que suele indicar lectura por localización de palabra clave y no por comprensión; pérdida de la relación entre dos datos correctamente recuperados por separado; sustitución del dato del texto por conocimiento previo del estudiante sobre el tema.

**8. Interpretación pedagógica.** El patrón más informativo de todo el instrumento es **C2 adecuado con C3 y C4 en nivel 1 o 2**: el estudiante lee, retiene y devuelve, pero no opera sobre lo leído. Es un perfil frecuente en Bachillerato y determina una enseñanza muy concreta. El patrón inverso —C2 bajo con C3 y C4 altos— casi siempre indica que el estudiante está respondiendo desde su conocimiento del tema sin apoyarse en la lectura, y exige verificar si llegó a leer el texto.

**9. Riesgos de evaluación injusta.** Bajo comparado con el resto, por su falsabilidad. Los dos riesgos reales son: penalizar una paráfrasis correcta por no reproducir las palabras del texto, y calificar como imprecisión lo que es una lectura legítima de un texto fuente ambiguo. El segundo obliga a revisar la lectura antes que la respuesta.

**10. Evaluación asistida por IA y límites.** Viabilidad **alta**, la mayor del instrumento, porque el modelo tiene la fuente y puede contrastar. Límite principal: cuando la lectura no se envía completa o se envía truncada, el modelo evalúa contra su propio conocimiento del mundo y la evaluación deja de ser diagnóstica sin dar señal de ello. El contrato de §12.1 ya exige enviar la lectura; conviene que la aplicación falle de forma visible si falta, en lugar de evaluar igualmente. Límite secundario: el modelo puede declarar «no está en el texto» sobre información que sí está en una parte del texto que no consideró.

**11. Relación con el currículo ecuatoriano.** **Inferencia pedagógica, con corrección de la alineación vigente.** La rúbrica y el documento maestro alinean C2 con `LL.5.3.1`. Esa destreza (pág. 18) describe valorar el contenido explícito de dos o más textos identificando contradicciones, ambigüedades y falacias: es una operación crítica, no de recuperación, y corresponde a C4. El currículo priorizado de Bachillerato **no contiene una destreza de recuperación de información explícita**, porque el nivel la presupone. C2 mide un prerrequisito habilitante de `LL.5.3.1` y de `I.LL.5.4.1` (pág. 18), y así debe declararse.

**12. Recomendación.** **Conservar el criterio, modificar la declaración de alineación.** Sustituir la afirmación de alineación por: prerrequisito habilitante de `LL.5.3.1` e `I.LL.5.4.1` (pág. 18) — inferencia pedagógica. Los descriptores no cambian. Registrar en el documento humano que la ausencia de destreza ministerial es la razón de su valor diagnóstico, no un defecto de la rúbrica.

---

### C3 — Comprensión inferencial

**1. Nombre e identificador.** «Comprensión inferencial» — `core.comprension_inferencial`. Dimensión: comprensión lectora. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Construir una conclusión que el texto no enuncia pero autoriza, a partir de pistas identificables, y **explicar el vínculo** entre las pistas y la conclusión. Los descriptores exigen las dos cosas: la inferencia y su justificación. Esto es correcto y conviene subrayarlo, porque una inferencia sin justificación es indistinguible de una suposición afortunada.

**3. Evidencia observable.** Un enunciado ausente del texto, compatible con él, acompañado de la mención de los elementos textuales que lo sostienen. Los tres componentes son observables por separado: existencia de la inferencia, compatibilidad con el texto, explicitación del vínculo.

**4. Adecuación para 15–17 años.** Adecuado y central. El nivel 4 («integra varias pistas… sin apartarse de los límites del texto») está bien situado: exige integración, no especulación, y la cláusula final protege contra premiar la interpretación más imaginativa.

**5. Ambigüedades y solapamientos.** Con **C2**, ya tratado. Con **C6** el solapamiento es estructural y no está del todo resuelto: el nivel 3 de C3 («explica cómo esas pistas conducen a la conclusión») y el nivel 3 de C6 («explica claramente cómo respalda la afirmación») describen la misma operación de explicitar un vínculo. La frontera propuesta es de **objeto**: C3 juzga si la conclusión es una inferencia válida _sobre el texto_; C6 juzga si la cadena que une afirmación, evidencia y conclusión es consistente, sea el objeto un texto o un tema. En una pregunta de inferencia explicada ambos se activan, y activarlos juntos es correcto siempre que el docente entienda que **no son dos evidencias independientes**: si el estudiante falla en explicitar el vínculo, ambos bajan por la misma razón, y contarlo dos veces en el perfil exagera la debilidad.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Formula una conclusión sin apoyo textual, interpreta de manera incompatible con las pistas disponibles o confunde una inferencia con información explícita inexistente. |
| En desarrollo          | Propone una inferencia plausible, pero la justifica de forma incompleta, depende de una pista débil o no explica claramente la relación con la conclusión.              |
| Adecuado para la banda | Construye una inferencia válida a partir de pistas pertinentes y explica cómo esas pistas conducen a la conclusión.                                                     |
| Consolidado            | Integra varias pistas, reconoce relaciones implícitas y formula una interpretación precisa o matizada sin apartarse de los límites del texto.                           |

**7. Errores y dificultades típicas.** Inferencia sustituida por conocimiento previo del tema; inferencia correcta sin justificación, que el estudiante considera evidente; sobreinterpretación que atribuye al autor intenciones no sostenidas por el texto; confusión entre lo que el texto implica y lo que al estudiante le parece razonable; inferencia formulada como si fuera literal («el texto dice que…» cuando el texto no lo dice).

**8. Interpretación pedagógica.** El diagnóstico más útil aquí no es el nivel sino **qué mitad falla**. Si la inferencia es válida y la justificación falta, se enseña a explicitar. Si la justificación es elaborada y la inferencia es incompatible con el texto, se enseña a controlar la lectura. Son enseñanzas distintas y el mismo nivel 2 puede corresponder a cualquiera de ellas. La razón registrada por criterio, que la rúbrica ya exige, es lo que hace utilizable este criterio.

**9. Riesgos de evaluación injusta.** Alto. Es el criterio con mayor variabilidad entre evaluadores humanos, porque exige juzgar si una inferencia «cabe» en el texto, y textos ricos admiten inferencias divergentes igualmente válidas. Riesgo específico: evaluar contra la inferencia esperada por el docente en lugar de contra el rango de inferencias que el texto autoriza. Mitigación: al preparar la pregunta, el docente debería registrar al menos dos inferencias válidas distintas; si no puede formular dos, la pregunta probablemente admite una sola respuesta y es de recuperación disfrazada.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo detecta bien la presencia de una inferencia y su compatibilidad general con el texto. Falla en dos puntos: acepta como válidas inferencias que provienen del conocimiento del mundo del propio modelo y no del texto entregado, y juzga la suficiencia de la justificación por su extensión y fluidez más que por su contenido. Requiere revisión docente sistemática. No debe usarse como criterio de decisión con una sola evidencia.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo con cobertura parcial declarada.** `LL.5.3.2` (pág. 18) describe valorar el contenido implícito de un texto con argumentos propios, contrastándolo con fuentes adicionales. La primera mitad corresponde exactamente a C3. La segunda —contraste con fuentes adicionales— **no es observable en el formato de la campaña**, que presenta una sola lectura. `CE.LL.5.4` e `I.LL.5.4.1` (pág. 18) son referentes correctos. La cobertura debe declararse como parcial: C3 realiza la mitad de `LL.5.3.2`.

**12. Recomendación.** **Conservar sin cambios en descriptores.** Modificar la declaración de alineación para hacer explícita la cobertura parcial de `LL.5.3.2`. Registrar en el documento humano que C3 exige dos evidencias antes de generar una prioridad de planificación, y que C3 y C6 activados en la misma pregunta no constituyen evidencias independientes.

---

### C4 — Lectura crítica y valoración

**1. Nombre e identificador.** «Lectura crítica y valoración» — `core.lectura_critica`. Dimensión: comprensión lectora. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Emitir un juicio sobre el texto —su calidad, su validez, su perspectiva, sus consecuencias, sus límites— sostenido en criterios verificables y anclado en el texto. El descriptor de nivel 3 incorpora además el reconocimiento de intención, perspectiva, consecuencia o problema «cuando la consigna lo requiere», lo que convierte a C4 en un criterio de amplitud considerable.

**3. Evidencia observable.** Una postura enunciada, al menos una razón que la sostiene, y una conexión identificable entre esa razón y un elemento del texto. La ausencia de cualquiera de los tres es observable sin interpretar la mente del estudiante.

**4. Adecuación para 15–17 años.** Adecuado en principio y **exigente en la práctica**. `CE.LL.5.4` sitúa efectivamente esta demanda en Bachillerato, de modo que la exigencia es curricularmente legítima. La dificultad es de observabilidad: el nivel 4 («considera matices, límites o perspectivas alternativas») requiere una tarea que ofrezca espacio para desarrollarlos. En una respuesta de cuatro líneas, el nivel 4 no es alcanzable por ausencia de oportunidad, no por ausencia de capacidad. Esto no se resuelve bajando el descriptor: se resuelve registrando `no_aplica` cuando la tarea no ofrece la oportunidad, en lugar de asignar 3 por defecto.

**5. Ambigüedades y solapamientos.** El criterio es **ancho**: cubre valoración, análisis de perspectiva, detección de contradicciones, ambigüedades y falacias, y reconocimiento de consecuencias. Solapa con **M1** en el eje de perspectiva e intención, y con **C6** en el eje de sustento de la valoración.

Con M1 la separación es clara cuando M1 está activo: M1 evalúa el análisis de propósito, contexto y punto de vista como objeto; C4 evalúa el juicio sobre el texto. Cuando M1 no está activo —lo será a menudo—, el nivel 3 de C4 absorbe la perspectiva, y el mismo desempeño se evalúa con distinto criterio según la configuración de la pregunta. **Esto compromete la comparabilidad longitudinal**: un estudiante puede parecer que mejora en C4 simplemente porque en la campaña siguiente M1 estaba activo y descargó parte de la exigencia.

Con C6 la separación es de objeto: C4 juzga la _valoración_, C6 juzga la _cadena de razonamiento_. En la práctica, una valoración sin sustento produce simultáneamente C4 nivel 1 y C6 nivel 1.

**6. Descriptores propuestos.** Se conservan los vigentes, con una precisión de aplicación.

| Nivel                  | Descriptor                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | Expresa gusto, rechazo, acuerdo o desacuerdo sin criterio verificable, o formula una valoración incompatible con la lectura.                                 |
| En desarrollo          | Presenta una postura pertinente, pero utiliza razones generales, poco desarrolladas o débilmente vinculadas con el texto.                                    |
| Adecuado para la banda | Sostiene una postura clara mediante razones y evidencia pertinente; reconoce intención, perspectiva, consecuencia o problema cuando la consigna lo requiere. |
| Consolidado            | Evalúa el texto con argumentos sólidos, considera matices, límites o perspectivas alternativas y mantiene un anclaje textual preciso.                        |

Precisión de aplicación propuesta: cuando la consigna o la extensión prevista no ofrecen espacio para desarrollar matices, límites o perspectivas alternativas, el nivel 4 no se propone y la ausencia se registra como falta de oportunidad, no como límite del estudiante. Cuando M1 está activo en la misma pregunta, C4 no evalúa el eje de perspectiva.

**7. Errores y dificultades típicas.** Valoración afectiva sin criterio («me pareció interesante»); criterio enunciado y no aplicado («no es objetivo», sin señalar dónde); adhesión al texto por autoridad, sin examen; crítica al tema en lugar de al texto; postura sostenida con conocimiento externo y ningún anclaje textual; confusión entre lo que el texto afirma y lo que el estudiante cree que el autor piensa.

**8. Interpretación pedagógica.** C4 bajo con C2 y C3 adecuados indica que el estudiante comprende y no evalúa: es el perfil que más directamente exige enseñanza de criterios de valoración. C4 alto con C6 bajo indica postura sin sustento: se enseña a justificar, no a opinar. Este criterio es el que con más frecuencia produce falsos negativos por consigna: una pregunta que dice «¿qué opinas?» sin pedir criterio autoriza una respuesta afectiva, y penalizarla sería evaluar al estudiante por un defecto del enunciado.

**9. Riesgos de evaluación injusta.** **El más alto del instrumento**, por tres vías. Primera, el sesgo de acuerdo: una postura que coincide con la del evaluador tiende a recibir nivel superior. Segunda, la confusión entre postura sofisticada y postura bien sostenida. Tercera, la penalización de posturas culturalmente distantes del evaluador, sostenidas con criterios legítimos que el evaluador no comparte. La única mitigación efectiva es exigir que la razón registrada por el evaluador cite el criterio del estudiante y no la conclusión: se evalúa cómo sostiene, no qué sostiene.

**10. Evaluación asistida por IA y límites.** Viabilidad **baja**. Debe marcarse como criterio de docente hasta que la calibración empírica demuestre lo contrario. Los modelos evalúan la _forma_ del argumento con notable competencia y su _validez_ con notable inconsistencia; ante una prosa fluida y bien conectada que no sostiene nada, tienden al nivel 3. Añaden el sesgo de acuerdo con la posición mayoritaria en sus datos, lo que en textos sobre temas socialmente disputados produce evaluaciones sistemáticamente desiguales. La IA sí puede aportar valor aquí de otro modo: extrayendo los fragmentos donde el estudiante enuncia postura y razón, para que el docente evalúe sobre evidencia localizada.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo, el más sólido del instrumento.** `CE.LL.5.4` (pág. 18) menciona explícitamente valorar contenidos explícitos e implícitos y aspectos formales en función del propósito comunicativo, el contexto sociocultural y el punto de vista del autor, e identificar contradicciones, ambigüedades y falacias. `LL.5.3.1` y `LL.5.3.4` (pág. 18) son las destrezas correspondientes. `I.LL.5.4.1` e `I.LL.5.4.2` (pág. 18) son los indicadores. Todas las citas de la alineación vigente son correctas y verificables.

**12. Recomendación.** **Conservar.** No dividir: aunque el criterio es ancho, dividirlo produciría criterios que rara vez se activarían juntos y multiplicaría los `no_aplica`. Modificar tres cosas de aplicación: marcarlo como `teacher_only` hasta superar la calibración de §15.1; declarar la regla de no evaluar el eje de perspectiva cuando M1 está activo; y exigir dos evidencias antes de generar una prioridad de planificación.

---

### C5 — Idea central, tesis o posición

**1. Nombre e identificador.** «Idea central, tesis o posición» — `core.tesis_posicion`. Dimensión: respuesta y razonamiento. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Formular una idea que organice la respuesta y mantenerla estable a lo largo del desarrollo. Los descriptores atienden cuatro atributos distintos: existencia, claridad, delimitación y estabilidad.

**3. Evidencia observable.** Un enunciado, explícito o reconstruible sin ambigüedad, al que las demás afirmaciones de la respuesta se subordinan. La estabilidad es observable por contraste entre el comienzo y el final de la respuesta.

**4. Adecuación para 15–17 años.** Adecuado. `CE.LL.5.6` y `LL.5.4.1` sitúan la formulación de tesis en Bachillerato de forma explícita. El nivel 2 («idea central implícita, amplia o inestable») describe con precisión el desempeño modal de la banda y es el descriptor más útil del criterio.

**5. Ambigüedades y solapamientos.** Tres.

Con **C7**: una idea central inestable produce a la vez C5 nivel 2 y C7 nivel 2. La frontera es que C5 juzga la existencia y estabilidad de _la idea_; C7 juzga la secuencia de _las partes_. Un texto puede tener una tesis nítida y una organización caótica.

Con **M3**: el nivel 1 de M3 dice «no presenta una tesis reconocible», que es literalmente el nivel 1 de C5. Cuando M3 está activo, C5 y M3 se solapan de forma casi total en el extremo inferior de la escala. **Recomendación:** cuando M3 esté activo, C5 debe evaluar únicamente claridad, delimitación y estabilidad de la idea, y M3 evaluar la articulación del conjunto tesis–argumentos–evidencia–conclusión.

Ambigüedad interna: «idea central» y «tesis» no son lo mismo. Un resumen tiene idea central y no tiene tesis; un texto argumentativo tiene tesis. El descriptor de nivel 3 los trata como intercambiables. En la práctica esto funciona porque el nivel se juzga contra lo que la consigna pide, pero conviene que el documento humano lo declare: **el criterio evalúa el tipo de idea organizadora que la tarea requiere, y no exige tesis argumentativa cuando la tarea no la pide.**

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | No se reconoce una idea organizadora o aparecen afirmaciones incompatibles sin una relación que las resuelva.               |
| En desarrollo          | Existe una idea central implícita, amplia o inestable que orienta solo una parte de la respuesta.                           |
| Adecuado para la banda | Presenta una idea central, tesis o posición clara y la mantiene de manera consistente durante el desarrollo.                |
| Consolidado            | Formula una posición precisa, delimitada y productiva que organiza el razonamiento y admite matices cuando son pertinentes. |

**7. Errores y dificultades típicas.** Tesis que reproduce el enunciado de la consigna sin comprometerse; tesis tan amplia que cualquier argumento la sostiene y ninguno la prueba; tesis anunciada al inicio y abandonada; dos tesis incompatibles en el mismo texto sin relación que las resuelva; tesis que aparece solo en la conclusión, señal de que el texto se escribió sin plan; enumeración de aspectos del tema en lugar de posición sobre él.

**8. Interpretación pedagógica.** El nivel 2 masivo en un paralelo es esperable y no constituye una alarma: la formulación de tesis delimitada es exactamente lo que la banda está aprendiendo. La señal accionable es la **distribución interna del nivel 2**: tesis ausentes indican que no se ha enseñado a formularlas; tesis amplias indican que se ha enseñado a formularlas pero no a delimitarlas; tesis inestables indican ausencia de planificación. Son tres enseñanzas distintas bajo un mismo nivel, y la razón registrada es lo que las distingue.

**9. Riesgos de evaluación injusta.** Moderado. El principal es exigir tesis explícita y enunciada al inicio, que es una convención escolar y no una exigencia curricular: `LL.5.4.1` pide formular la tesis, no situarla en la primera oración. Una tesis clara construida a lo largo del texto satisface el nivel 3. Riesgo secundario: penalizar una posición matizada como «inestable» cuando el matiz es deliberado; el descriptor de nivel 4 protege contra esto y debe leerse antes que el de nivel 2.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo identifica bien la presencia de una tesis y su ubicación. Es poco fiable juzgando delimitación —tiende a considerar delimitada cualquier tesis formulada con vocabulario preciso, aunque su alcance sea universal— y es sensible al sesgo de extensión, porque una respuesta larga ofrece más ocasiones de reafirmar la tesis y parece más estable. Requiere revisión docente.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `CE.LL.5.6` (pág. 19) menciona expresamente formular la tesis. `LL.5.4.1` (pág. 19) describe construir un texto argumentativo seleccionando el tema y formulando la tesis; `LL.5.4.2` (pág. 19), defender una tesis mediante diferentes tipos de argumento. `I.LL.5.6.1` (pág. 19) es el indicador correspondiente. La alineación vigente es correcta y verificable en su totalidad. Matiz: el currículo enuncia la tesis en contexto argumentativo; la extensión del criterio a «idea central» de textos no argumentativos es **inferencia pedagógica**.

**12. Recomendación.** **Conservar sin cambios en descriptores.** Añadir al documento humano dos precisiones: la regla de reparto con M3 y la declaración de que la extensión a «idea central» no argumentativa es inferencia pedagógica.

---

### C6 — Evidencia y razonamiento

**1. Nombre e identificador.** «Evidencia y razonamiento» — `core.evidencia_razonamiento`. Dimensión: respuesta y razonamiento. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Seleccionar evidencia pertinente y explicitar la relación entre afirmación, evidencia y conclusión. El acento de los descriptores está en la **explicación del vínculo**, no en la presencia de la evidencia, lo que es pedagógicamente acertado: citar es fácil, explicar por qué lo citado prueba algo es lo difícil.

**3. Evidencia observable.** Presencia de un elemento que funciona como evidencia; pertinencia de ese elemento respecto de la afirmación; presencia de un enunciado que explica la relación. Los tres son localizables en el texto.

**4. Adecuación para 15–17 años.** Adecuado y **es el criterio de mayor rendimiento diagnóstico del instrumento** en esta banda, porque es donde se sitúa el salto real entre la escritura escolar y la académica. El nivel 2 («explica el vínculo de forma parcial, repetitiva, implícita o con algún salto lógico importante») describe el desempeño modal de Bachillerato con exactitud.

**5. Ambigüedades y solapamientos.** El más denso del instrumento. Solapa con **C3** (explicitación del vínculo en inferencia), con **C4** (sustento de la valoración) y con **M3** (jerarquía de razones y evidencia). Tres criterios pueden bajar simultáneamente por la misma causa observable: el estudiante no explicó por qué lo que citó prueba lo que afirma.

Esto es un riesgo real de **inflación de la debilidad**: el perfil muestra tres o cuatro criterios en nivel 2 y sugiere un problema extenso, cuando la evidencia subyacente es una sola. La rúbrica ya lo mitiga parcialmente exigiendo evidencia por criterio, pero conviene una regla explícita:

> Cuando C3, C4, C6 o M3 bajan por el mismo fragmento y la misma razón, la prioridad de planificación se genera una sola vez, sobre el criterio que la consigna designó como principal.

Ambigüedad interna: el criterio fusiona **selección de evidencia** y **calidad del razonamiento**. Son separables —hay respuestas con evidencia impecable y razonamiento roto, y a la inversa— pero en respuestas de la extensión que produce esta campaña casi nunca se separan de hecho. No se propone dividirlo; se propone que la razón registrada indique cuál de las dos mitades falló, lo que ya permite el campo de razón existente.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | Formula afirmaciones sin evidencia, copia fragmentos sin explicar su función o utiliza evidencia que no respalda la idea presentada.             |
| En desarrollo          | Incorpora evidencia relacionada, pero explica el vínculo de forma parcial, repetitiva, implícita o con algún salto lógico importante.            |
| Adecuado para la banda | Selecciona evidencia pertinente y explica claramente cómo respalda la afirmación, inferencia o conclusión.                                       |
| Consolidado            | Selecciona evidencia estratégica, la interpreta con precisión, relaciona distintos elementos y construye una cadena de razonamiento consistente. |

**7. Errores y dificultades típicas.** Cita yuxtapuesta a la afirmación sin conector explicativo, dejando el vínculo a cargo del lector; evidencia que ilustra en lugar de probar; generalización a partir de un caso único; sustitución del razonamiento por reformulación de la tesis con otras palabras; evidencia correcta que prueba una afirmación distinta de la enunciada; encadenamiento de citas sin voz propia.

**8. Interpretación pedagógica.** Es el criterio que produce las prioridades de planificación más operativas, porque «explicar la relación entre evidencia y conclusión» es enseñable con procedimientos concretos. Un paralelo con C6 en nivel 2 y C2 en nivel 3 tiene un problema de escritura académica, no de comprensión, y la enseñanza correspondiente es de escritura. La confusión entre ambos diagnósticos es el error más costoso que puede cometerse con este instrumento, y es exactamente lo que la separación de dimensiones existe para impedir.

**9. Riesgos de evaluación injusta.** Alto. El razonamiento correcto pero expresado con recursos lingüísticos limitados se lee como razonamiento débil; el razonamiento vacío expresado con fluidez se lee como razonamiento sólido. La rúbrica separa forma y contenido en su principio 4, pero ese principio se refiere a ortografía; el riesgo aquí es más sutil, porque afecta a la sintaxis y al léxico, que sí son necesarios para expresar una relación causal. La mitigación practicable es de procedimiento: el evaluador debe poder reformular el razonamiento del estudiante en sus propias palabras antes de calificarlo; si puede, el razonamiento existe.

**10. Evaluación asistida por IA y límites.** Viabilidad **baja**. Junto con C4, debe marcarse como criterio de docente hasta la calibración. El modelo detecta con fiabilidad la presencia de evidencia y la presencia de un conector explicativo; no distingue con fiabilidad entre una explicación que efectivamente sostiene la afirmación y una que solo tiene la forma de una explicación. Es precisamente la distinción que define el criterio. El sesgo de fluidez opera aquí en su forma más pura. Uso recomendado de la IA en este criterio: localizar los pares afirmación–evidencia y señalar dónde falta un enunciado de vínculo, sin proponer nivel.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `CE.LL.5.4` (pág. 18) incluye elaborar argumentos propios y contrastarlos con fuentes adicionales. `CE.LL.5.6` e `I.LL.5.6.1` (pág. 19) enumeran tipos de argumento —de hecho, definición, autoridad, analogía, ejemplificación, experiencia, explicación, deducción—, lo que constituye el respaldo más concreto de este criterio en todo el currículo. `LL.5.3.2` (pág. 18) y `LL.5.4.2` (pág. 19) son las destrezas correspondientes. La alineación vigente es correcta.

Discrepancia detectada: `RUBRICA_DIAGNOSTICA_COMPLETA.md` incluye `I.LL.5.6.1` en la alineación de C6; la tabla §9.3 del documento maestro no lo incluye. La inclusión es la correcta, dado el enunciado del indicador.

**12. Recomendación.** **Conservar.** No dividir, pese a la ambigüedad interna, porque las dos mitades no se separan en respuestas de esta extensión y la división multiplicaría `no_aplica`. Marcar como `teacher_only` hasta la calibración. Incorporar la regla de no duplicación de prioridades del punto 5. Recomendar al responsable que armonice la discrepancia entre el documento maestro y la rúbrica humana respecto de `I.LL.5.6.1`.

---

### C7 — Organización y coherencia global

**1. Nombre e identificador.** «Organización y coherencia global» — `core.organizacion_coherencia`. Dimensión: organización discursiva. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Construir una secuencia de ideas reconstruible, con jerarquía, sin contradicciones ni digresiones, manteniendo el eje temático. Es macroestructura en el sentido del antecedente teórico del instrumento.

**3. Evidencia observable.** Progresión reconstruible entre las partes; ausencia de contradicciones internas; permanencia del eje temático; función identificable de cada párrafo o bloque.

**4. Adecuación para 15–17 años.** Adecuado, **condicionado a la extensión**. Un texto de cuarenta palabras no tiene macroestructura observable. El descriptor de no aplicación vigente («la respuesta esperada consta únicamente de una palabra, sintagma o dato aislado») es demasiado permisivo: deja dentro del ámbito evaluable respuestas de dos o tres oraciones, donde la organización global no es observable pero tampoco es obviamente inaplicable, y el evaluador tenderá a asignar 3 por ausencia de problemas visibles. Un 3 por ausencia de evidencia es un falso positivo, y en una serie longitudinal es peor que un `no_aplica`.

**5. Ambigüedades y solapamientos.** Con **C8** es el solapamiento más discutido del instrumento y merece tratamiento explícito.

C7 y C8 comparten una única destreza curricular (`LL.5.4.7`, pág. 19, que reúne coherencia, cohesión y precisión en distintos tipos de párrafo) y sus descriptores son parcialmente permeables: «algunas ideas o párrafos se aíslan» (C7 nivel 2) y «deja saltos locales que interrumpen la lectura» (C8 nivel 2) pueden aplicarse al mismo fragmento.

**La separación debe conservarse.** Son construcciones distintas y diagnósticamente independientes: un texto puede estar perfectamente conectado a nivel de oración y no ir a ninguna parte, y puede tener una arquitectura impecable expresada con conectores pobres. Enseñar una cosa y otra son intervenciones distintas. La separación no proviene del currículo, que las une en una destreza, sino del marco teórico del instrumento; debe declararse como **inferencia pedagógica sobre una fuente compartida**, no como dos alineaciones independientes.

Frontera operativa propuesta: C7 se juzga leyendo solo la primera oración de cada bloque y preguntando si la secuencia resultante progresa. C8 se juzga leyendo pares de oraciones consecutivas y preguntando si la relación entre ellas es recuperable. Es un procedimiento, no un descriptor, y por eso corresponde al documento humano y no al JSON.

Solapamiento menor con **C5** (idea inestable) y con **C1** (digresión respecto de la consigna), ya tratados.

**6. Descriptores propuestos.** Se conservan los vigentes, con endurecimiento de la regla de no aplicación.

| Nivel                  | Descriptor                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Las ideas aparecen fragmentadas, se contradicen o carecen de una secuencia que permita reconstruir el sentido global.               |
| En desarrollo          | Existe una secuencia básica, pero algunas ideas o párrafos se aíslan, se repiten o cambian de tema sin una transición comprensible. |
| Adecuado para la banda | Organiza las ideas en una progresión lógica, utiliza partes o párrafos con función reconocible y mantiene el eje temático.          |
| Consolidado            | Jerarquiza las ideas, desarrolla una progresión eficaz y utiliza la estructura para reforzar el propósito comunicativo.             |

Regla de no aplicación propuesta, en sustitución de la vigente: no se aplica cuando la respuesta contiene menos de tres unidades informativas encadenadas, aproximadamente ochenta palabras. Por debajo de ese umbral el criterio se registra como no observable, nunca como nivel 3.

**7. Errores y dificultades típicas.** Texto como enumeración de aspectos sin jerarquía; párrafo único que contiene tres ideas no articuladas; conclusión que introduce contenido nuevo; retorno cíclico al mismo punto sin avance; orden dictado por el orden de la lectura fuente en lugar de por el propósito de la respuesta; párrafos delimitados por longitud y no por función.

**8. Interpretación pedagógica.** C7 bajo con C8 adecuado indica ausencia de plan: el estudiante escribe bien de oración en oración y no sabe adónde va. Se enseña con esquemas previos. C7 adecuado con C8 bajo indica lo contrario: hay plan y faltan recursos de enlace. Se enseña con repertorio de conectores y trabajo de referencia. La distinción justifica por sí sola mantener los dos criterios separados.

**9. Riesgos de evaluación injusta.** Moderado, con un riesgo específico alto: **asignar nivel 3 por ausencia de problemas en un texto demasiado corto para tenerlos**. Es el falso positivo más probable del instrumento y contamina especialmente el análisis longitudinal, porque un estudiante que escribe poco acumula treses inmerecidos y luego, al escribir más, parece retroceder. La regla de umbral propuesta existe para esto. Riesgo secundario: penalizar una organización no canónica pero eficaz; el descriptor de nivel 3 pide progresión lógica y función reconocible, no el esquema escolar de introducción–desarrollo–conclusión.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo detecta razonablemente contradicciones internas y rupturas de eje temático. Es poco fiable juzgando jerarquía —tiende a leer como jerarquizado cualquier texto con marcadores ordinales— y presenta un fuerte sesgo de extensión: asigna niveles superiores a respuestas largas porque ofrecen más superficie de progresión. Requiere revisión docente, y la puerta de sesgo por extensión de §15.1 debe medirse específicamente sobre este criterio.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo con fuente compartida.** `LL.5.4.7` (pág. 19) describe desarrollar un tema con coherencia, cohesión y precisión en diferentes tipos de párrafo. `CE.LL.5.6` e `I.LL.5.6.1` (pág. 19) son los referentes de criterio e indicador. La alineación vigente es correcta. La separación entre C7 y C8 sobre esa misma destreza es inferencia pedagógica y debe declararse.

**12. Recomendación.** **Conservar el criterio y modificar su regla de no aplicación**, sustituyendo el umbral cualitativo vigente por un umbral de extensión que el responsable fije en el pilotaje. Declarar en la matriz curricular que la separación C7/C8 es inferencia pedagógica sobre `LL.5.4.7`. Incorporar al documento humano el procedimiento de lectura del punto 5.

---

### C8 — Cohesión y relaciones entre ideas

**1. Nombre e identificador.** «Cohesión y relaciones entre ideas» — `core.cohesion`. Dimensión: organización discursiva. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Hacer recuperables las relaciones entre oraciones y párrafos mediante conectores, referencias, elipsis y repeticiones controladas. Microestructura: relación local, no arquitectura global.

**3. Evidencia observable.** Presencia y adecuación de conectores; recuperabilidad de los referentes pronominales; ausencia de saltos que obliguen a releer. Todo verificable oración a oración.

**4. Adecuación para 15–17 años.** Adecuado. El nivel 4 («relaciones como causa, contraste, consecuencia, condición, concesión o énfasis») nombra un repertorio exigente pero enseñable, y no requiere terminología: se evalúa el uso, no la capacidad de nombrarlo. Esto es importante y está bien resuelto en la redacción vigente.

**5. Ambigüedades y solapamientos.** Con **C7**, tratado en la ficha anterior. Con **C10** (sintaxis) el solapamiento es real y menos evidente: un referente ambiguo puede computarse como problema de cohesión (`REF`) o como ambigüedad sintáctica (`SINT`). Frontera propuesta: si la ambigüedad se resuelve dentro de la oración, es C10; si exige recurrir a una oración anterior, es C8. Con **C12** (puntuación): una coma ausente que impide identificar la relación entre dos proposiciones es C12; la ausencia del conector que expresaría esa relación es C8.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Faltan referentes o conectores esenciales y las relaciones entre oraciones resultan ambiguas o difíciles de seguir.                                  |
| En desarrollo          | Utiliza algunos conectores y referencias, pero los repite, los emplea con imprecisión o deja saltos locales que interrumpen la lectura.              |
| Adecuado para la banda | Enlaza oraciones y párrafos mediante conectores, referencias, elipsis y repeticiones controladas que permiten seguir el razonamiento.                |
| Consolidado            | Utiliza recursos cohesivos variados y precisos para hacer explícitas relaciones como causa, contraste, consecuencia, condición, concesión o énfasis. |

**7. Errores y dificultades típicas.** Repertorio reducido a «y», «pero», «entonces»; conector de contraste usado para adición y a la inversa, que es el error más informativo porque revela que la relación lógica no está construida; pronombre sin antecedente recuperable; cadena de referencia rota a mitad de párrafo; repetición del sustantivo por temor a la ambigüedad, que es una estrategia de compensación y no un defecto; yuxtaposición sistemática sin marca de relación.

**8. Interpretación pedagógica.** El error de conector mal seleccionado —«pero» donde correspondía «además»— tiene mayor valor diagnóstico que el conector ausente, porque muestra que el estudiante busca marcar una relación y no dispone del recurso adecuado. Es enseñanza directa y de efecto rápido. La repetición del sustantivo debe interpretarse con cuidado: en muchos casos es una estrategia deliberada de claridad y no merece nivel 2.

**9. Riesgos de evaluación injusta.** Moderado. Dos riesgos concretos: penalizar la yuxtaposición cuando la relación es evidente por contenido y el uso de conector resultaría redundante; y premiar la acumulación de conectores como si fuera cohesión, cuando un texto sobrecargado de marcadores puede ser menos legible. El descriptor de nivel 4 pide «variados y precisos», no abundantes, y esa palabra debe pesar en la aplicación.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**, algo superior a la de C7 porque los recursos cohesivos son formalmente identificables. El modelo detecta bien la presencia, variedad y repetición de conectores. Es menos fiable juzgando **adecuación semántica** del conector al contexto, y comete un error específico: cuenta la variedad de marcadores como indicador de calidad, lo que puede llevar a nivel 4 un texto sobrecargado. Requiere revisión docente.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo con fuente compartida.** `LL.5.4.7` (pág. 19) nombra la cohesión de forma explícita, junto con la coherencia. `CE.LL.5.6` e `I.LL.5.6.1` (pág. 19) son referente e indicador. La alineación vigente es correcta. La separación respecto de C7 es inferencia pedagógica.

**12. Recomendación.** **Conservar sin cambios.** Declarar la fuente compartida con C7 en la matriz curricular. Registrar en el documento humano las fronteras con C10 y C12 del punto 5.

---

### C9 — Precisión léxica y adecuación del registro

**1. Nombre e identificador.** «Precisión léxica y adecuación del registro» — `core.lexico_registro`. Dimensión: organización discursiva. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Dos capacidades distintas bajo un solo identificador. La primera, **precisión léxica**: elegir la palabra que expresa el matiz pretendido, con variedad suficiente. La segunda, **adecuación del registro**: ajustar la variedad de lengua al propósito, destinatario y género.

**3. Evidencia observable.** Para la precisión: elecciones léxicas contrastables con alternativas más o menos exactas; repeticiones evitables; términos usados con sentido impropio. Para el registro: marcas de oralidad, coloquialismos o deícticos no contextualizados **en una tarea que declaró un destinatario y un género formales**.

**4. Adecuación para 15–17 años.** La mitad léxica es adecuada y está bien anclada. La mitad de registro es adecuada **solo si la consigna declara destinatario y género**. Sin esa declaración, el evaluador juzga contra un registro implícito que el estudiante no podía conocer, y eso es evaluar una convención tácita.

**5. Ambigüedades y solapamientos.** Este es el problema estructural más claro del instrumento.

Las dos capacidades tienen **condiciones de observación incompatibles**. La precisión léxica es observable en cualquier respuesta con al menos una elección significativa. El registro requiere una situación comunicativa declarada. Cuando no la hay, el criterio queda medio observable, y un único nivel debe resumir una mitad medida y otra no medida. Ese nivel no es interpretable, y en una serie longitudinal es directamente engañoso: no hay forma de saber si una variación entre campañas se debe al léxico, al registro o a que la consigna de una campaña declaraba destinatario y la de otra no.

Se añade un problema de dimensión. C9 está en «organización discursiva» junto a C7 y C8. La precisión léxica encaja razonablemente ahí. El registro no: es una competencia sociopragmática, ajena a la organización del discurso. El promedio de la dimensión mezcla entonces tres construcciones heterogéneas, y el descriptor de nivel 1 de C9 —«impide comprender ideas importantes»— arrastra ese promedio con fuerza.

Solapamiento adicional con **C10**: un uso impropio de preposición puede registrarse como `LEX` o como `PREP`. Frontera propuesta: si la palabra es semánticamente inadecuada, es C9; si la estructura que rige es la incorrecta, es C10.

**6. Descriptores propuestos.** Aquí la propuesta depende de una decisión del responsable y se presentan las dos opciones completas.

**Opción A — dividir el criterio.** Es la solución pedagógicamente correcta y la de mayor costo técnico: rompe el contrato estructural de doce criterios, exige nueva versión de rúbrica y nuevo snapshot congelado, y afecta a la prueba de contrato existente. Ninguno de esos archivos se modifica en este trabajo.

`core.lexico_precision` — Precisión y variedad léxica. Núcleo, dimensión organización discursiva.

| Nivel                  | Descriptor propuesto                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | El vocabulario impreciso o repetitivo impide comprender ideas importantes de la respuesta.                                                                  |
| En desarrollo          | El vocabulario permite comprender el mensaje, pero presenta repeticiones evitables, términos excesivamente generales o usos impropios que restan precisión. |
| Adecuado para la banda | Emplea vocabulario pertinente y suficientemente variado para expresar las ideas que la tarea requiere.                                                      |
| Consolidado            | Selecciona palabras precisas y controla matices de significado sin recurrir a sobrecarga terminológica.                                                     |

`optional.registro_adecuacion` — Adecuación del registro. Módulo opcional. **Activable solo cuando la consigna declara destinatario y género.**

| Nivel                  | Descriptor propuesto                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | El registro contradice de manera recurrente el declarado en la consigna, sin ajuste al destinatario ni al género solicitados.        |
| En desarrollo          | El registro es inestable: alterna con interferencias frecuentes de la oralidad o del uso coloquial.                                  |
| Adecuado para la banda | Mantiene un registro adecuado al propósito, destinatario y género declarados, con deslices puntuales que no comprometen el conjunto. |
| Consolidado            | Sostiene el registro de forma consistente y lo ajusta con eficacia, sin artificio ni rigidez.                                        |

Bajo esta opción, `core.lexico_registro` **se retira y su identificador no se reutiliza**, conforme a la regla de identidad longitudinal de §1.6.

**Opción B — conservar el criterio y condicionar su aplicación.** Costo técnico nulo sobre el JSON: los descriptores vigentes se mantienen y solo cambia el documento humano. Se añade esta regla de aplicación:

> Cuando la consigna no declara destinatario ni género, C9 evalúa exclusivamente precisión y variedad léxica. Ninguna marca de oralidad, coloquialismo o informalidad puede reducir el nivel en esa condición, y la razón registrada debe indicar que el eje de registro no fue observado.

La Opción B resuelve la injusticia inmediata y **no resuelve el problema longitudinal**: el mismo identificador seguirá designando una construcción variable según la consigna. Es aceptable como medida para el pilotaje, no como estado final.

**7. Errores y dificultades típicas.** Repetición del mismo sustantivo por falta de repertorio o por temor a la referencia ambigua; hiperónimo vacío en lugar del término específico («cosa», «aspecto», «tema»); término técnico usado por aproximación fonética o semántica; calco del vocabulario de la lectura fuente sin comprensión; marcas de oralidad en tarea formal; sobrecorrección con vocabulario elevado usado incorrectamente, que es un error de estudiante que sí está intentando ajustar el registro y merece lectura distinta.

**8. Interpretación pedagógica.** La distinción crítica es entre **pobreza de repertorio** y **error de selección**. La primera se enseña ampliando léxico en contexto; la segunda, trabajando matiz y campo semántico. Ambas producen el mismo nivel 2 y exigen enseñanzas distintas. La sobrecorrección merece interpretarse como intento de ajuste, no como error de vocabulario, y así debe registrarse en la razón.

**9. Riesgos de evaluación injusta.** **Alto, y es el riesgo de equidad más serio del instrumento.** Las marcas de variedad regional del castellano ecuatoriano y los rasgos de contacto con lenguas originarias pueden registrarse como `LEX` o `REG` y bajar el nivel. Eso convierte un criterio de precisión en un criterio de proximidad a una norma. El currículo ecuatoriano se posiciona expresamente en contra de esa lectura: `OG.LL.2` (pág. 16) plantea valorar la diversidad lingüística, y `CE.LL.5.2` (pág. 17) trata las variaciones lingüísticas socioculturales del Ecuador como objeto de análisis, no como desviación.

Regla propuesta, derivada de esa posición curricular: **una forma propia de una variedad regional o de contacto no constituye imprecisión léxica**. Solo se registra como error el uso que produce imprecisión de significado dentro de la propia variedad del estudiante.

**10. Evaluación asistida por IA y límites.** Viabilidad **media para precisión, baja para registro**. En precisión el modelo detecta repeticiones y usos impropios con razonable acierto. En registro presenta el sesgo más marcado: fue entrenado predominantemente sobre castellano peninsular y mexicano estándar, y tiende a marcar como inadecuación de registro formas ecuatorianas plenamente correctas. Es el punto donde la puerta de §15.1 sobre tratamiento de registro regional y variedad lingüística debe convertirse en **umbral con criterio de fallo**, no en observación cualitativa: si la calibración muestra marcas sistemáticas sobre formas regionales, el eje de registro no se automatiza.

**11. Relación con el currículo ecuatoriano.** **Mixto, y la rúbrica no lo declara.**

La mitad léxica tiene **anclaje directo**: `LL.5.4.6` (pág. 19) describe expresar postura u opinión mediante el uso crítico del significado de las palabras; `LL.5.4.8` (pág. 19), expresar matices y producir efectos determinados en los lectores mediante la selección de un vocabulario preciso; `CE.LL.5.6` e `I.LL.5.6.1` (pág. 19) confirman la selección precisa de palabras. Es de las alineaciones mejor sostenidas del instrumento.

La mitad de registro es **inferencia pedagógica**: ninguna destreza de `CE.LL.5.6` menciona registro, destinatario ni adecuación sociopragmática. `OG.LL.7` (pág. 16), al hablar de distintos propósitos y variadas situaciones comunicativas, ofrece un marco general, pero es un objetivo de asignatura.

Discrepancia detectada: la rúbrica humana incluye `OG.LL.7` en la alineación de C9; la tabla §9.3 del documento maestro no lo incluye. Dado que `OG.LL.7` es el único referente disponible para el eje de registro, la inclusión es la correcta.

**12. Recomendación.** **Dividir (Opción A) es la recomendación pedagógica.** Es el único cambio estructural que este informe propone en el núcleo, y se propone porque el criterio actual no es interpretable de forma estable entre consignas ni entre campañas.

Dado el costo técnico y la existencia de un contrato congelado, **la decisión corresponde al responsable**. Si opta por no dividir antes del pilotaje, debe adoptarse la Opción B como medida transitoria, con constancia escrita de que el identificador `core.lexico_registro` designa una construcción de alcance variable y de que las series construidas sobre él no serán plenamente comparables. En ambas opciones debe incorporarse la regla de variedad lingüística del punto 9.

---

### C10 — Construcción sintáctica y concordancia

**1. Nombre e identificador.** «Construcción sintáctica y concordancia» — `core.sintaxis_concordancia`. Dimensión: convenciones de escritura. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Construir oraciones completas, con concordancia funcional, relaciones sintácticas recuperables y variedad suficiente de estructuras para desarrollar las ideas.

**3. Evidencia observable.** Oraciones sin ruptura ni elemento faltante; concordancia de género, número y persona; relaciones sintácticas no ambiguas; presencia de estructuras subordinadas cuando el contenido las requiere.

**4. Adecuación para 15–17 años.** Adecuado. El nivel 4 («controla estructuras simples y complejas… sin sacrificar legibilidad») está bien calibrado: no premia la complejidad por sí misma, que es el error habitual de las rúbricas escolares en este punto.

**5. Ambigüedades y solapamientos.** Con **C8** (referencia ambigua) y con **C9** (régimen preposicional), tratados. Con **C12** el solapamiento es sustancial: una oración larga sin puntuación puede leerse como problema sintáctico o como problema de puntuación. Frontera propuesta: si al añadir los signos la oración resulta correcta, es C12; si sigue estando incompleta o mal construida, es C10.

Ambigüedad interna de los descriptores: todos los niveles se definen por **efecto sobre la lectura** («dificultan de manera recurrente la comprensión», «interrumpen la lectura en varios puntos») sin ningún anclaje de frecuencia. «Varios puntos» no es un umbral: depende por completo de la tolerancia del evaluador y de la longitud del texto. Es la fuente principal de subjetividad de este criterio.

**6. Descriptores propuestos.** Se conservan los vigentes, con adición de una regla de cómputo.

| Nivel                  | Descriptor                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | Las rupturas sintácticas, secuencias incompletas, ambigüedades o concordancias defectuosas dificultan de manera recurrente la comprensión. |
| En desarrollo          | Predominan oraciones comprensibles, aunque aparecen estructuras problemáticas o discordancias que interrumpen la lectura en varios puntos. |
| Adecuado para la banda | Construye oraciones completas y comprensibles, con concordancia funcional y variedad suficiente para desarrollar las ideas.                |
| Consolidado            | Controla estructuras simples y complejas con claridad, variedad y precisión, sin sacrificar legibilidad.                                   |

Regla de cómputo propuesta: el nivel debe apoyarse en el número de oraciones afectadas sobre el total de oraciones producidas, no en la impresión de lectura. La razón registrada debe indicar esa proporción. No se propone un umbral numérico fijo: fijarlo sin datos del pilotaje sería inventar precisión. El responsable debe establecerlo tras la calibración, y hasta entonces la proporción se registra y se interpreta cualitativamente.

**7. Errores y dificultades típicas.** Anacoluto por cambio de construcción a mitad de oración, típicamente en oraciones largas; oración sin verbo principal; concordancia rota por distancia entre sujeto y verbo; correlación temporal inconsistente entre principal y subordinada; subordinada sin principal; ambigüedad de adjunto; sobrecarga por subordinación acumulada, que suele indicar intento de escritura académica sin control de la estructura.

**8. Interpretación pedagógica.** Es útil distinguir **error por descontrol** de **error por ambición**. El anacoluto en una oración larga con tres subordinadas indica que el estudiante intenta una estructura compleja y pierde el hilo: se enseña segmentando. La secuencia de oraciones simples yuxtapuestas sin errores indica evitación de la complejidad: se enseña ampliando repertorio. La segunda situación puede recibir nivel 3 en C10 y ser diagnósticamente más preocupante que la primera con nivel 2. El descriptor de nivel 3 pide «variedad suficiente», y esa cláusula es la que permite detectarlo.

**9. Riesgos de evaluación injusta.** Alto por dos vías. Primera, la ausencia de umbral, ya señalada. Segunda, la **penalización de estructuras propias del castellano ecuatoriano** o del registro oral que son gramaticalmente sistemáticas dentro de su variedad. Se aplica aquí la misma regla propuesta para C9: una construcción sistemática en la variedad del estudiante no es error de construcción; lo es la ruptura que impide recuperar la relación sintáctica en cualquier variedad.

Riesgo adicional específico del medio digital: la escritura en pantalla con tiempo limitado produce oraciones truncadas por corrección incompleta, indistinguibles de rupturas sintácticas reales. El código `TIPO` cubre el caso ortográfico; **no existe un equivalente para la ruptura sintáctica por edición incompleta**, y convendría que la razón registrada pudiera consignarlo.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo detecta bien concordancias rotas y oraciones incompletas. Presenta dos fallos sistemáticos: marca como error construcciones dialectales correctas, y tiende a **sugerir la reescritura en lugar de describir el problema**, lo que en un instrumento diagnóstico es contraproducente y está prohibido por §12.4. El juicio sobre «variedad suficiente de estructuras» es poco fiable. Requiere revisión docente.

**11. Relación con el currículo ecuatoriano.** **Anclaje solo en objetivo general — inferencia pedagógica en el nivel de destreza.** `OG.LL.8` (pág. 16) plantea aplicar conocimientos sobre los elementos estructurales y funcionales de la lengua castellana en la composición y revisión de textos: es el respaldo correcto, y es un objetivo de asignatura, no un desempeño evaluable. **Ninguna destreza de `CE.LL.5.6` (pág. 19) menciona sintaxis ni concordancia.** La cita vigente de `LL.5.4.7` es indirecta: esa destreza habla de coherencia, cohesión y precisión, no de construcción sintáctica.

La rúbrica humana ya rotula este bloque como «alineación complementaria», lo que es honesto y debe conservarse. Esta auditoría propone reforzarlo con la marca explícita de inferencia pedagógica.

**12. Recomendación.** **Conservar.** Modificar la declaración de alineación: `OG.LL.8` como referente y retirada de `LL.5.4.7`, con marca de inferencia pedagógica. Incorporar la regla de cómputo por proporción de oraciones y la regla de variedad lingüística. Recomendar al responsable que evalúe habilitar el registro de ruptura por edición incompleta en la razón del criterio.

---

### C11 — Ortografía literal y acentuación

**1. Nombre e identificador.** «Ortografía literal y acentuación» — `core.ortografia_acentuacion`. Dimensión: convenciones de escritura. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Control de grafías y de tildes, considerando frecuencia, recurrencia por patrón y efecto sobre la comprensión.

**3. Evidencia observable.** Palabras con grafía o acentuación no normativas, agrupables por patrón, contabilizables y expresables como tasa por cada cien palabras.

**4. Adecuación para 15–17 años.** Adecuado y correctamente subordinado. El acierto principal de la rúbrica en este punto es el principio 4 —los errores ortográficos no reducen el nivel de comprensión, inferencia o razonamiento— y la prohibición explícita de §12.4 de usar la ortografía como sustituto de comprensión. Sin esas dos reglas, este criterio contaminaría todo el instrumento, que es lo que ocurre habitualmente en la evaluación escolar. Deben conservarse literalmente.

**5. Ambigüedades y solapamientos.** Con **C12** el reparto está bien definido: grafías y tildes en C11, signos y mayúsculas en C12. La rúbrica es de las pocas que separan los dos, y la separación es correcta porque las dificultades subyacentes son distintas.

La ambigüedad es interna y de dos tipos. Primero, los descriptores mezclan tres ejes —frecuencia, recurrencia por patrón y efecto sobre la comprensión— sin decir cuál prevalece cuando divergen. Un texto con dos errores que generan ambigüedad y un texto con quince errores que no la generan pueden acabar en el mismo nivel por caminos opuestos. **Propuesta: la frecuencia determina el nivel base; el efecto sobre la comprensión puede bajarlo un nivel, nunca subirlo.**

Segundo, la frontera entre error ortográfico y `TIPO` es de juicio. La regla especial vigente es correcta y prudente. Convendría añadir un indicio operativo: si la palabra aparece correctamente escrita en otro lugar de la misma entrega, la ocurrencia aislada se registra preferentemente como `TIPO`.

**6. Descriptores propuestos.** Se conservan los vigentes, con las dos reglas del punto 5.

| Nivel                  | Descriptor                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Los errores son frecuentes, afectan palabras de uso común, generan ambigüedad o dificultan de manera sostenida la lectura.              |
| En desarrollo          | Presenta errores recurrentes en patrones identificables, aunque el contenido general puede comprenderse sin esfuerzo excesivo.          |
| Adecuado para la banda | Mantiene un control funcional; los errores son ocasionales y no alteran el sentido global ni interrumpen de forma relevante la lectura. |
| Consolidado            | Demuestra control consistente incluso en vocabulario menos frecuente; los errores son excepcionales y de efecto comunicativo mínimo.    |

**7. Errores y dificultades típicas.** Tilde diacrítica; acentuación de formas verbales con pronombre enclítico; hiatos y diptongos; grafías homófonas; separación y unión de palabras; mayúscula inicial de oración; extranjerismos no adaptados. El valor diagnóstico está casi por completo en el **patrón**, no en el recuento: quince errores concentrados en tilde diacrítica constituyen una enseñanza; quince errores dispersos entre seis patrones distintos constituyen otra completamente diferente.

**8. Interpretación pedagógica.** Es el criterio de mayor riesgo de sobreinterpretación de todo el instrumento, y el documento humano hace bien en advertirlo. Un nivel 1 en C11 con niveles 3 en comprensión y razonamiento describe a un estudiante que comprende, infiere y argumenta y no controla la norma escrita. Es un perfil frecuente y perfectamente coherente. La confusión de ese perfil con «bajo rendimiento» es el error pedagógico que este instrumento existe para evitar; la separación por dimensiones lo hace visible y no debe suavizarse.

**9. Riesgos de evaluación injusta.** Alto, por tres vías distintas de las habituales.

Primera, **el medio**. Escribir en pantalla, con tiempo limitado y posiblemente en dispositivo poco familiar, produce errores que no reflejan conocimiento ortográfico. La regla `TIPO` mitiga pero no elimina, y la severidad del efecto depende del dispositivo, que varía entre estudiantes del mismo paralelo. Las condiciones de aplicación deben registrarse.

Segunda, **la extensión**. El conteo bruto penaliza al que escribe más. La regla de tasa por cien palabras de §9.3 lo corrige, y la condición de longitud mínima es lo que impide que la corrección se vuelva ruido: una tasa calculada sobre treinta palabras es aritméticamente válida y estadísticamente vacía.

Tercera, **el uso indebido del resultado**. La rúbrica lo prohíbe, y la prohibición debe sostenerse también en la lectura del panel: un dashboard que ordena estudiantes por C11 invita a la confusión que §12.4 prohíbe, por mucho que el texto de la rúbrica diga lo contrario.

**10. Evaluación asistida por IA y límites.** Viabilidad **media-alta con una condición estricta**.

El modelo detecta errores ortográficos con buen rendimiento y agrupa por patrón con utilidad real. Presenta un modo de fallo específico y peligroso en este criterio: **corrige inadvertidamente al citar**. Reporta la tilde ausente y transcribe el fragmento con la tilde puesta, de modo que la evidencia contradice la observación y el docente no puede verificarla. También puede alucinar errores en palabras correctas, sobre todo en nombres propios y en léxico regional.

Por eso la puerta de fidelidad de fragmentos del 95 % de §15.1 **es insuficiente para C11 y C12**. En los demás criterios el fragmento contextualiza la observación; en estos dos el fragmento _es_ la observación. **La puerta debe ser 100 % para C11 y C12**, verificable de forma automática comparando cada fragmento citado contra el texto original de la respuesta antes de mostrarlo al docente. Esta comprobación es determinista y no requiere juicio pedagógico.

**11. Relación con el currículo ecuatoriano.** **Anclaje solo en objetivo general — inferencia pedagógica.** `OG.LL.8` (pág. 16) es el referente. **Ninguna destreza ni indicador del bloque de escritura de `CE.LL.5.6` (pág. 19) menciona ortografía ni acentuación.** La cita vigente de `CE.LL.5.6` en la alineación de C11 no está sostenida por el texto de ese criterio de evaluación.

Que el currículo priorizado de Bachillerato no incluya una destreza de ortografía no significa que no importe: significa que se presupone adquirida en niveles anteriores. Un instrumento diagnóstico tiene razones legítimas para medir un presupuesto, y esa es exactamente la justificación que debe constar.

**12. Recomendación.** **Conservar el criterio y modificar su declaración de alineación**, dejando `OG.LL.8` como único referente, retirando `CE.LL.5.6` y marcando el vínculo como inferencia pedagógica sobre un aprendizaje presupuesto. Elevar a 100 % la puerta de fidelidad de fragmentos para este criterio. Incorporar la regla de prevalencia de la frecuencia sobre el efecto y el indicio operativo de `TIPO`. Fijar en el pilotaje la longitud mínima para calcular tasa.

---

### C12 — Puntuación, segmentación y mayúsculas

**1. Nombre e identificador.** «Puntuación, segmentación y mayúsculas» — `core.puntuacion_segmentacion`. Dimensión: convenciones de escritura. Presente en `rubric-v1.json`.

**2. Capacidad que pretende medir.** Delimitar oraciones, jerarquizar ideas y marcar relaciones mediante signos de puntuación y mayúsculas.

**3. Evidencia observable.** Límites oracionales identificables; comas que separan o unen conforme a la estructura; ausencia de ambigüedad derivada de la puntuación; mayúsculas normativas.

**4. Adecuación para 15–17 años.** Adecuado. El nivel 4 («control sintáctico y discursivo, favoreciendo precisión, énfasis, ritmo y fluidez») es exigente pero legítimo para el extremo superior de la banda, y no se exige a nadie: el estándar de la banda es el nivel 3.

**5. Ambigüedades y solapamientos.** Con **C10**, tratado. Con **C8**: la ausencia de coma que impide identificar una relación es C12; la ausencia del conector que expresaría esa relación es C8. Con **C7**: la segmentación en párrafos es un caso frontera. El descriptor de C12 menciona «segmentación» sin precisar si abarca el párrafo, y el inventario asigna el párrafo al código `PARA`, que la rúbrica no vincula explícitamente a un criterio. **Propuesta: la delimitación de párrafos es C7** (es una decisión de organización, no de puntuación), y `PARA` se asocia a C7. C12 cubre la segmentación oracional.

Ambigüedad interna: el criterio reúne tres subsistemas de dificultad muy desigual —punto y límite oracional, coma y jerarquía interna, mayúscula—. La mayúscula es de aprendizaje temprano y su fallo a esta edad suele indicar descuido o efecto del medio; la coma es de aprendizaje prolongado. Agruparlos en un nivel único puede ocultar cuál falla. No se propone dividir el criterio: se propone que la razón registrada indique el subsistema afectado, lo que el campo de razón ya permite.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | La ausencia o el uso inadecuado de signos impide reconocer límites oracionales, jerarquías o relaciones básicas entre ideas.                     |
| En desarrollo          | La segmentación general es reconocible, pero algunos usos de puntos, comas u otros signos producen ambigüedad, acumulación o ritmo entrecortado. |
| Adecuado para la banda | Utiliza puntuación y mayúsculas de manera funcional para segmentar, organizar y aclarar el texto.                                                |
| Consolidado            | Emplea la puntuación con control sintáctico y discursivo, favoreciendo precisión, énfasis, ritmo y fluidez.                                      |

**7. Errores y dificultades típicas.** Texto sin puntos, con todo el contenido en una sola secuencia; coma entre sujeto y verbo; coma en lugar de punto entre oraciones independientes; ausencia de coma en incisos y subordinadas antepuestas; puntuación por respiración en lugar de por estructura; mayúscula omitida tras punto; mayúscula en sustantivos comunes por transferencia de otras lenguas o de convenciones de rótulo.

**8. Interpretación pedagógica.** La puntuación por respiración es el hallazgo más informativo: revela que el estudiante puntúa según la oralidad y no según la estructura sintáctica, lo que explica simultáneamente la ausencia de comas obligatorias y la presencia de comas prohibidas. Es un patrón único con enseñanza única, y sin la razón registrada se leería como dos problemas distintos. La ausencia total de puntos en textos extensos suele acompañar a niveles bajos en C7 y C8 y conviene interpretarla junto a ellos.

**9. Riesgos de evaluación injusta.** Moderado-alto. La puntuación admite variación estilística legítima, sobre todo en el uso de la coma: penalizar una coma opcional ausente confunde norma con preferencia. Riesgo del medio: la escritura en pantalla favorece la omisión de signos por corrección incompleta. Riesgo de umbral: los mismos descriptores de frecuencia sin anclaje que en C10 y C11.

**10. Evaluación asistida por IA y límites.** Viabilidad **media-alta con la misma condición estricta que C11**: fidelidad de fragmento del 100 %, porque el fragmento es la evidencia y una cita «limpiada» invalida la observación.

Fallo específico de este criterio: el modelo tiende a marcar como error la ausencia de comas opcionales, aplicando una norma más estricta que la que rige. Esto produce un sesgo sistemático hacia niveles inferiores en C12 que la calibración debe medir por separado. En sentido contrario, detecta bien la ausencia de puntos y los límites oracionales, que es donde está el mayor valor diagnóstico.

**11. Relación con el currículo ecuatoriano.** **Anclaje solo en objetivo general — inferencia pedagógica.** `OG.LL.8` (pág. 16) es el referente. Ninguna destreza de `CE.LL.5.6` (pág. 19) menciona puntuación. La cita vigente de `LL.5.4.7` tiene un apoyo parcial y solo en el eje de párrafo, dado que esa destreza menciona diferentes tipos de párrafo; pero si la delimitación de párrafos se asigna a C7 conforme al punto 5, ese apoyo parcial se traslada a C7 y deja de sostener a C12.

**12. Recomendación.** **Conservar el criterio y modificar su declaración de alineación**, dejando `OG.LL.8` como único referente, retirando `CE.LL.5.6` y `LL.5.4.7`, y marcando el vínculo como inferencia pedagógica. Elevar a 100 % la puerta de fidelidad de fragmentos. Asignar la segmentación en párrafos y el código `PARA` a C7. Registrar el subsistema afectado en la razón.

---

## 3. Fichas de los módulos opcionales

Solo M1 y M3 están presentes en `rubric-v1.json`. M2 y M4 a M8 existen únicamente en la rúbrica humana y se analizan para que su eventual activación no se improvise.

---

### M1 — Propósito, contexto y punto de vista

**1. Nombre e identificador.** `optional.proposito_punto_vista`. **Presente en `rubric-v1.json` y activo.**

**2. Capacidad que pretende medir.** Identificar el propósito comunicativo, el destinatario o el punto de vista del texto, y explicar su relación con recursos, contenidos o contexto.

**3. Evidencia observable.** Enunciación del propósito o de la perspectiva; mención de elementos del texto que la sostienen; enunciado que conecta unos con otra.

**4. Adecuación para 15–17 años.** Adecuado, con el mejor anclaje curricular del instrumento junto con C4. `LL.5.3.4` sitúa esta demanda exactamente en esta banda.

**5. Ambigüedades y solapamientos.** Con **C4**, tratado en su ficha: cuando M1 está activo, C4 no debe evaluar el eje de perspectiva, o el mismo desempeño se contará dos veces. Con **C3**: identificar un punto de vista no declarado es una inferencia; la frontera es el objeto, no la operación —si el objeto es la perspectiva del autor, es M1; si es una relación de contenido, es C3.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Confunde el propósito o atribuye un punto de vista incompatible con la evidencia del texto.                                                                      |
| En desarrollo          | Reconoce de manera general el propósito o la perspectiva, pero ofrece evidencia insuficiente o no explica su relación con el contexto y las elecciones formales. |
| Adecuado para la banda | Identifica propósito, destinatario o punto de vista y explica su relación con recursos, contenidos o contexto pertinentes.                                       |
| Consolidado            | Analiza cómo propósito, contexto, perspectiva y decisiones formales interactúan para orientar la interpretación o producir un efecto.                            |

**7. Errores y dificultades típicas.** Confusión entre tema y propósito; atribución de intención al autor sin evidencia textual; identificación del propósito con la etiqueta de género («es informativo») sin explicación; confusión entre punto de vista narrativo y opinión del autor; propósito enunciado sin conexión con ningún elemento del texto.

**8. Interpretación pedagógica.** La distancia entre nivel 2 y nivel 3 es precisamente la explicación del vínculo, igual que en C3 y C6. Es el mismo aprendizaje transversal —explicitar la relación entre lo que se afirma y lo que lo sostiene— manifestándose en un objeto distinto. Un estudiante con nivel 2 en C3, C6 y M1 simultáneamente no tiene tres problemas: tiene uno.

**9. Riesgos de evaluación injusta.** Alto en el eje de intención: el criterio pide identificar propósito, y la frontera entre propósito inferido del texto y propósito atribuido al autor es fina. La rúbrica lo protege con el principio 9 (no atribuir causas mentales), pero ese principio se dirige al evaluador respecto del estudiante, no al estudiante respecto del autor. Conviene que el descriptor se lea siempre con la exigencia de evidencia textual, que el nivel 1 ya incorpora.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo identifica propósito con soltura, con frecuencia demasiada: propone lecturas de intención autorial elaboradas que exceden lo que el texto autoriza, y luego evalúa la respuesta del estudiante contra esa lectura propia. Requiere revisión docente y, cuando la pregunta admite varias lecturas legítimas del propósito, es preferible que el docente registre el rango admisible al preparar la evaluación.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `LL.5.3.4` (pág. 18) describe valorar los aspectos formales y el contenido del texto en función del propósito comunicativo, el contexto sociocultural y el punto de vista del autor. `CE.LL.5.4` (pág. 18) lo recoge en el criterio de evaluación e `I.LL.5.4.2` (pág. 18) en el indicador. La alineación vigente es correcta y verificable en su totalidad; es la más exacta del instrumento.

**12. Recomendación.** **Conservar sin cambios.** Añadir al documento humano la regla de reparto con C4.

---

### M2 — Comparación y confiabilidad de fuentes

**1. Nombre e identificador.** `optional.comparacion_fuentes`. **No presente en `rubric-v1.json`.** Documentado para implementación futura.

**2. Capacidad que pretende medir.** Comparar contenido y perspectivas de dos o más fuentes y valorar su confiabilidad con criterios observables.

**3. Evidencia observable.** Mención de al menos dos fuentes; enunciación de una coincidencia, diferencia o límite entre ellas; criterio explícito de confiabilidad aplicado a un caso concreto.

**4. Adecuación para 15–17 años.** Adecuado y curricularmente exigido —`CE.LL.5.5` lo sitúa en esta banda— pero **no observable en el formato de la campaña**, que presenta una sola lectura. La decisión de no activarlo es correcta.

**5. Ambigüedades y solapamientos.** Con **C4** en el eje de valoración crítica y con **M6** en el eje de identificación de fuentes. Si M2 y M6 se activaran juntos, M2 debería evaluar la comparación y M6 la integración y atribución.

**6. Descriptores propuestos.** Se conservan los vigentes; no procede recalibrarlos sin una tarea real que los ejercite.

| Nivel                  | Descriptor                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | Trata las fuentes como equivalentes sin examinarlas, confunde sus posturas o selecciona información no relacionada con el propósito.             |
| En desarrollo          | Reconoce alguna coincidencia, diferencia o señal de confiabilidad, pero compara de manera superficial o aplica criterios poco claros.            |
| Adecuado para la banda | Compara contenido y perspectivas, selecciona fuentes pertinentes y justifica su confiabilidad mediante criterios observables.                    |
| Consolidado            | Integra coincidencias, diferencias, límites e intereses de las fuentes y explica cómo estos factores afectan la conclusión que puede sostenerse. |

**7. Errores y dificultades típicas.** Yuxtaposición de fuentes sin comparación; criterio de confiabilidad reducido a la autoridad institucional o a la apariencia del sitio; selección de la fuente que confirma la posición previa; confusión entre coincidencia de dos fuentes y verdad.

**8. Interpretación pedagógica.** Requiere tarea multifuente. Su activación exigiría rediseñar la campaña, no solo la pregunta.

**9. Riesgos de evaluación injusta.** Alto si se activa sin garantizar acceso equivalente a las fuentes: mediría condiciones de conectividad y no competencia lectora.

**10. Evaluación asistida por IA y límites.** Viabilidad **baja**. El modelo tiene opinión propia sobre la confiabilidad de fuentes reales y la aplicará al evaluar, sustituyendo el criterio del estudiante por el suyo. Criterio de docente.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo, con una precisión de adscripción.** `CE.LL.5.5` (pág. 18) describe consultar bases de datos digitales y otros recursos de la web seleccionando fuentes según el propósito de lectura y valorando su confiabilidad y punto de vista; `LL.5.3.5` (pág. 18) es su destreza y `I.LL.5.5.1` (pág. 18) su indicador. `LL.5.3.6` (pág. 18) —recoger, comparar y organizar información consultada— **pertenece a `CE.LL.5.4`**, no a `CE.LL.5.5`, y así debe citarse. `LL.5.3.2` (pág. 18) aporta la cláusula de contraste con fuentes adicionales.

**12. Recomendación.** **Conservar documentado y no activar** mientras la aplicación no recoja dos o más fuentes. Corregir la adscripción de `LL.5.3.6` en la ficha del módulo.

---

### M3 — Estructura del texto argumentativo

**1. Nombre e identificador.** `optional.estructura_argumentativa`. **Presente en `rubric-v1.json` y activo.**

**2. Capacidad que pretende medir.** Articular tesis, argumentos, evidencia y conclusión en una estructura funcional al propósito.

**3. Evidencia observable.** Presencia y ubicación de cada componente; relación entre conclusión y desarrollo; jerarquía entre razones.

**4. Adecuación para 15–17 años.** Adecuado y curricularmente central. La regla vigente —el contraargumento solo se exige cuando la consigna o la extensión lo permiten— es correcta y protege contra la exigencia más habitual e injusta en este criterio.

**5. Ambigüedades y solapamientos.** Con **C5** en el extremo inferior, ya tratado: el nivel 1 de ambos describe la ausencia de tesis. Con **C6** en el eje de evidencia y con **C7** en el eje de organización. M3 es, en rigor, un criterio **integrador**: cuando está activo, gran parte de su contenido ya está cubierto por C5, C6 y C7.

Esto plantea una cuestión que corresponde al responsable: en una tarea argumentativa extensa, M3 puede aportar poco por encima de C5 + C6 + C7, y su activación produce cuatro criterios que suben y bajan juntos, inflando la señal. Su valor propio está en lo que los otros tres no cubren: **la articulación del conjunto y la derivación de la conclusión respecto del desarrollo**. Propuesta: cuando M3 esté activo, su razón registrada debe referirse a la articulación del conjunto, no a la calidad de la tesis (C5), ni a la de la evidencia (C6), ni a la progresión (C7).

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicial                | No presenta una tesis reconocible, enumera afirmaciones sin función argumentativa o concluye de manera incompatible con el desarrollo.                                   |
| En desarrollo          | Presenta tesis y alguna razón, pero el desarrollo es desigual, la conclusión repite sin integrar o falta una parte necesaria para la consigna.                           |
| Adecuado para la banda | Organiza tesis, argumentos, evidencia y conclusión de forma reconocible y funcional para el propósito.                                                                   |
| Consolidado            | Utiliza la estructura argumentativa estratégicamente, jerarquiza razones y evidencia, atiende objeciones pertinentes y construye una conclusión derivada del desarrollo. |

**7. Errores y dificultades típicas.** Conclusión que repite la tesis sin integrar el desarrollo; razones enumeradas sin jerarquía; argumento único desarrollado como si fueran varios; contraargumento enunciado y no refutado; estructura escolar aplicada como molde sin función; conclusión que introduce la verdadera tesis, señal de que el texto se escribió sin plan previo.

**8. Interpretación pedagógica.** El indicador de mayor rendimiento es la **relación entre conclusión y desarrollo**, porque distingue al estudiante que escribió un texto de aquel que rellenó un esquema. Un texto con todas las partes presentes y conclusión no derivada merece nivel 2 pese a su apariencia completa; un texto sin conclusión formal cuyo cierre integra el desarrollo puede merecer nivel 3.

**9. Riesgos de evaluación injusta.** Moderado-alto. El riesgo dominante es evaluar contra el molde escolar de cinco párrafos en lugar de contra la funcionalidad de la estructura. El descriptor de nivel 3 dice «reconocible y funcional para el propósito», no «canónica», y esa cláusula debe pesar. Riesgo secundario: exigir contraargumento fuera de las condiciones que la regla vigente establece.

**10. Evaluación asistida por IA y límites.** Viabilidad **media**. El modelo identifica los componentes de la estructura con fiabilidad alta, que es la parte mecánica. Es poco fiable juzgando si la conclusión se deriva del desarrollo, que es la parte que importa, y presenta un fuerte sesgo hacia el molde escolar: premia el esquema canónico y penaliza estructuras eficaces no convencionales. Requiere revisión docente.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `CE.LL.5.6` (pág. 19) describe la construcción de textos académicos argumentativos con selección del tema, formulación de tesis y tipos de argumento en párrafos apropiados. `LL.5.4.1` y `LL.5.4.2` (pág. 19) son las destrezas. `I.LL.5.6.1` (pág. 19) enumera los tipos de argumento. La alineación vigente es correcta y verificable.

**12. Recomendación.** **Conservar sin cambios en descriptores.** Incorporar al documento humano la regla de reparto con C5, C6 y C7 del punto 5, y advertir que la activación simultánea de los cuatro produce señal correlacionada que no debe leerse como cuatro evidencias independientes.

---

### M4 — Planificación observable

**1. Nombre e identificador.** `optional.planificacion`. **No presente en `rubric-v1.json`.**

**2. Capacidad que pretende medir.** Definir propósito e idea central, organizar las partes y anticipar razones, evidencia o recursos antes de redactar.

**3. Evidencia observable.** Un esquema, organizador o lista de ideas **conservado como artefacto**, con relación funcional identificable con el texto producido.

**4. Adecuación para 15–17 años.** Adecuado y curricularmente exigido por `LL.5.4.4`. No observable en el formato actual.

**5. Ambigüedades y solapamientos.** Solapamiento aparente con C7: un texto bien organizado sugiere planificación. La regla vigente —nunca se infiere planificación únicamente a partir del texto final— es la salvaguarda correcta y debe conservarse literalmente si el módulo se activa.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | No presenta evidencia de planificación solicitada o el material previo no guarda relación funcional con el texto producido.                       |
| En desarrollo          | Registra ideas o una secuencia básica, pero omite el propósito, la jerarquía, la evidencia o relaciones necesarias para orientar la redacción.    |
| Adecuado para la banda | Define propósito e idea central, organiza las partes principales y anticipa razones, evidencia o recursos necesarios.                             |
| Consolidado            | Construye una planificación flexible y estratégica, jerarquiza contenidos, anticipa al destinatario y ajusta el plan cuando la tarea lo requiere. |

**7. Errores y dificultades típicas.** Esquema producido después del texto para cumplir el requisito; lista de temas sin jerarquía ni propósito; plan detallado y abandonado en la redacción; planificación limitada al contenido sin considerar destinatario ni propósito.

**8. Interpretación pedagógica.** El contraste entre plan y texto final es más informativo que el plan aislado: un plan pobre con texto organizado indica planificación mental no registrada, y un plan rico con texto desorganizado indica dificultad de ejecución. Son diagnósticos opuestos.

**9. Riesgos de evaluación injusta.** Alto si se exige un formato específico de planificación. Se evalúa la función, no la forma: un esquema de tres líneas puede ser mejor plan que un organizador gráfico completo.

**10. Evaluación asistida por IA y límites.** **No evaluable en el formato actual**, por ausencia de la evidencia requerida. Si se recogiera el artefacto, la viabilidad sería media: el modelo puede contrastar plan y texto, pero no puede determinar el orden temporal de producción, que es justamente lo que distingue el nivel 1 del nivel 2.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `LL.5.4.4` (pág. 19) describe usar de forma habitual el procedimiento de planificación, redacción y revisión para autorregular la producción escrita. `CE.LL.5.6` (pág. 19) es el criterio de evaluación. La alineación vigente es correcta.

**12. Recomendación.** **Conservar documentado y no activar** mientras la aplicación no recoja artefactos de planificación. Conservar literalmente la regla de no inferencia.

---

### M5 — Revisión sustantiva

**1. Nombre e identificador.** `optional.revision`. **No presente en `rubric-v1.json`.**

**2. Capacidad que pretende medir.** Revisar forma y contenido entre versiones, con efecto verificable sobre ideas, orden, evidencia o claridad.

**3. Evidencia observable.** Dos versiones comparables o un registro explícito de cambios; naturaleza de los cambios (superficial, de contenido, estructural); efecto sobre el texto.

**4. Adecuación para 15–17 años.** Adecuado y curricularmente exigido por `LL.5.4.4`. No observable en el formato actual.

**5. Ambigüedades y solapamientos.** Con **M8**, que también compara versiones. La diferencia es el detonante: M5 evalúa la revisión autónoma; M8, la respuesta a marcas de corrección recibidas. Activarlos juntos sobre las mismas dos versiones evaluaría dos veces el mismo par de textos y debe evitarse.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | No realiza la revisión solicitada o la nueva versión conserva problemas centrales previamente identificados sin cambios observables.                |
| En desarrollo          | Corrige aspectos superficiales y realiza algún ajuste de contenido, pero mantiene vacíos importantes de organización, claridad o razonamiento.      |
| Adecuado para la banda | Revisa forma y contenido, corrige problemas relevantes y mejora ideas, orden, evidencia o claridad entre versiones.                                 |
| Consolidado            | Reconsidera decisiones sustantivas, reorganiza o reformula cuando es necesario y puede explicar cómo los cambios fortalecen el propósito del texto. |

**7. Errores y dificultades típicas.** Revisión limitada a ortografía; adición de contenido sin revisar la organización; cambios que introducen problemas nuevos; reescritura completa que abandona los aciertos de la primera versión; ausencia de cambios por considerar terminado el texto.

**8. Interpretación pedagógica.** El tipo cualitativo de revisión —superficial, mixta, estructural— es más informativo que su cantidad. La regla vigente de que una versión diferente no es automáticamente mejor es correcta y debe conservarse.

**9. Riesgos de evaluación injusta.** Alto si el tiempo asignado a la revisión es insuficiente: se mediría la gestión del tiempo. Alto también si el estudiante no recibió criterio alguno sobre qué revisar.

**10. Evaluación asistida por IA y límites.** **No evaluable en el formato actual.** Con dos versiones disponibles, viabilidad media-alta para clasificar el tipo de cambio, que es un contraste formal, y media-baja para juzgar si el cambio mejoró el texto.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `LL.5.4.4` (pág. 19) incluye la revisión dentro del procedimiento de autorregulación de la producción escrita. `CE.LL.5.6` (pág. 19) es el criterio. La alineación vigente es correcta.

**12. Recomendación.** **Conservar documentado y no activar.** Si se activa, excluir la activación simultánea con M8 sobre el mismo par de versiones.

---

### M6 — Integración, citación e identificación de fuentes

**1. Nombre e identificador.** `optional.citacion_fuentes`. **No presente en `rubric-v1.json`.**

**2. Capacidad que pretende medir.** Distinguir la voz propia de la información utilizada, integrar citas y paráfrasis, e identificar fuentes con el formato solicitado.

**3. Evidencia observable.** Marcas de atribución; integración sintáctica de la cita; correspondencia entre la cita y la fuente; consistencia del formato.

**4. Adecuación para 15–17 años.** Adecuado. `LL.5.4.3` lo sitúa expresamente en esta banda, con mención de rigor y honestidad académica. Solo aplicable si la tarea proporciona o permite fuentes.

**5. Ambigüedades y solapamientos.** Con **C6** en el eje de evidencia: C6 juzga si lo citado sostiene la afirmación; M6 juzga si está correctamente integrado y atribuido. Con **M2** en el eje de fuentes, ya tratado.

**6. Descriptores propuestos.** Se conservan los vigentes.

| Nivel                  | Descriptor                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | Reproduce contenido ajeno sin identificarlo, utiliza citas sin relación con el argumento o presenta una atribución que impide reconocer la fuente. |
| En desarrollo          | Identifica algunas fuentes, pero integra citas o paráfrasis de manera mecánica, incompleta o inconsistente.                                        |
| Adecuado para la banda | Distingue su voz de la información utilizada, integra citas o paráfrasis pertinentes e identifica las fuentes con el formato solicitado.           |
| Consolidado            | Integra y relaciona fuentes con criterio propio, selecciona la forma de atribución adecuada y mantiene rigor y consistencia durante todo el texto. |

**7. Errores y dificultades típicas.** Cita insertada sin marco sintáctico; paráfrasis tan próxima al original que no se distingue de la copia; atribución genérica sin dato que permita localizar la fuente; cita extensa que sustituye el desarrollo propio; formato inconsistente dentro del mismo texto.

**8. Interpretación pedagógica.** La paráfrasis excesivamente próxima al original es el hallazgo más frecuente y el que más cuidado exige: casi siempre indica falta de dominio de la técnica, no intención de ocultar. Debe enseñarse como técnica y registrarse como problema de integración.

**9. Riesgos de evaluación injusta.** **Alto y de consecuencias graves.** Es el único módulo cuyo mal uso puede derivar en una acusación de deshonestidad académica. La regla vigente es explícita y correcta: la aplicación no declara plagio sin evidencia externa verificable y registra únicamente coincidencias, ausencia de atribución o problemas de integración observables. **Debe conservarse literalmente y sin excepciones** si el módulo se activa.

**10. Evaluación asistida por IA y límites.** Viabilidad **media** para integración y formato. **Nula y prohibida para detección de plagio**: el modelo no dispone de las fuentes consultadas por el estudiante y produciría acusaciones no verificables. El descriptor de nivel 1 del documento 360 —que menciona plagio evidente— fue correctamente descartado por la rúbrica vigente y no debe reintroducirse.

**11. Relación con el currículo ecuatoriano.** **Anclaje directo.** `LL.5.4.3` (pág. 19) describe aplicar las normas de citación e identificación de fuentes con rigor y honestidad académica. `CE.LL.5.6` e `I.LL.5.6.1` (pág. 19) lo recogen. La alineación vigente es correcta.

**12. Recomendación.** **Conservar documentado y no activar** mientras la tarea no proporcione fuentes identificables. Conservar literalmente la prohibición sobre plagio.

---

### M7 — Reflexión metalingüística

**1. Nombre e identificador.** `optional.reflexion_metalinguistica`. **No presente en `rubric-v1.json`.**

**2. Capacidad que pretende medir.** Identificar decisiones lingüísticas propias y explicar su efecto sobre el sentido, la claridad o el propósito.

**3. Evidencia observable.** Respuesta a una pregunta que solicita explicar decisiones; identificación de una decisión concreta; enunciado que relaciona la decisión con un efecto; correspondencia entre lo explicado y el texto realmente producido.

**4. Adecuación para 15–17 años.** Adecuado, con una advertencia. El nivel 4 pide «metalenguaje preciso», y el metalenguaje se enseña: exigirlo a quien no lo ha recibido mide currículo impartido, no capacidad. El nivel 3 está mejor calibrado porque pide «lenguaje pertinente», no terminología.

**5. Ambigüedades y solapamientos.** Con **M8** en el eje de autorregulación. La diferencia es el objeto: M7 explica decisiones propias; M8 responde a marcas externas.

**6. Descriptores propuestos.** Se conservan los vigentes, con una precisión de aplicación.

| Nivel                  | Descriptor                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | No identifica una decisión concreta o presenta una explicación incompatible con el texto producido.                                                |
| En desarrollo          | Reconoce alguna decisión, pero la explica de forma general, imprecisa o sin relacionarla con su efecto comunicativo.                               |
| Adecuado para la banda | Identifica decisiones concretas y explica con lenguaje pertinente cómo contribuyen al sentido, la claridad o el propósito.                         |
| Consolidado            | Analiza varias alternativas, utiliza metalenguaje preciso y justifica por qué una elección resulta más eficaz para el propósito y el destinatario. |

Precisión de aplicación propuesta: el nivel 4 solo se propone si el metalenguaje correspondiente ha sido enseñado en el curso. En caso contrario, el techo observable es el nivel 3 y así debe registrarse.

**7. Errores y dificultades típicas.** Explicación que describe qué escribió en lugar de por qué; justificación por norma sin efecto («porque así se escribe»); terminología usada sin comprensión; explicación incompatible con el texto real; atribución de intención retrospectiva a decisiones que fueron automáticas.

**8. Interpretación pedagógica.** Una explicación incompatible con el texto producido es el hallazgo más informativo y el más delicado: puede indicar que el estudiante no controla lo que escribe, o que reproduce una explicación aprendida. La rúbrica prohíbe atribuir causas mentales, de modo que ambas lecturas deben quedar como hipótesis del docente, no como resultado.

**9. Riesgos de evaluación injusta.** **Alto.** Es el módulo que más depende de enseñanza previa específica y el que más fácilmente confunde competencia con vocabulario técnico. Un estudiante que escribe bien y no dispone de metalenguaje puede obtener nivel 1, lo que sería un resultado engañoso.

**10. Evaluación asistida por IA y límites.** Viabilidad **baja**. El modelo premia la terminología con notable facilidad y no verifica de forma fiable la correspondencia entre la explicación y el texto, que es el único indicador que distingue comprensión de recitado. Criterio de docente.

**11. Relación con el currículo ecuatoriano.** **Inferencia pedagógica.** `OG.LL.8` (pág. 16) sostiene la aplicación de conocimientos estructurales y funcionales de la lengua, y `LL.5.4.4` (pág. 19) la autorregulación de la producción escrita. **Ninguno de los dos describe explicar decisiones lingüísticas propias.** La alineación vigente ya está rotulada como complementaria, lo que es correcto; debe añadirse la marca de inferencia.

**12. Recomendación.** **Conservar documentado y no activar** salvo que el curso haya enseñado el metalenguaje correspondiente. Marcar la alineación como inferencia pedagógica. Incorporar la precisión de techo del punto 6.

---

### M8 — Autorregulación ante marcas de revisión

**1. Nombre e identificador.** `optional.autorregulacion_revision`. **No presente en `rubric-v1.json`.**

**2. Capacidad que pretende medir.** Interpretar marcas o códigos de corrección indirecta, aplicar las correcciones y reducir la recurrencia de los patrones señalados.

**3. Evidencia observable.** Borrador con marcas; versión posterior; correspondencia entre marcas y correcciones; comparación de recurrencia del mismo patrón entre versiones.

**4. Adecuación para 15–17 años.** Adecuado **solo si el código de corrección fue enseñado**. Es una condición absoluta: un estudiante que no conoce el código no puede interpretarlo, y el nivel 1 mediría desconocimiento del sistema de marcas, no capacidad de autorregulación.

**5. Ambigüedades y solapamientos.** Con **M5**, ya tratado: no activar ambos sobre el mismo par de versiones.

**6. Descriptores propuestos.** Se conservan los vigentes, con una precisión.

| Nivel                  | Descriptor                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicial                | No interpreta las marcas esenciales o repite los mismos problemas sin una corrección observable.                                              |
| En desarrollo          | Corrige algunos problemas evidentes, pero necesita apoyo frecuente o aplica las marcas de manera inconsistente.                               |
| Adecuado para la banda | Interpreta la mayoría de las marcas, corrige los problemas señalados y reduce la recurrencia de los patrones trabajados.                      |
| Consolidado            | Utiliza las marcas como punto de partida, revisa también problemas relacionados no señalados y explica los patrones que aprendió a controlar. |

Precisión propuesta: el descriptor de nivel 2 menciona «necesita apoyo frecuente», que es un juicio sobre el proceso de aula y no sobre el texto. Si el módulo se activa dentro de la aplicación, que solo dispone de artefactos escritos, ese fragmento no es observable y el nivel 2 debe apoyarse únicamente en la aplicación inconsistente de las marcas.

**7. Errores y dificultades típicas.** Corrección de la marca sin comprensión del patrón, que produce una corrección puntual y ninguna transferencia; corrección que introduce un error distinto; marcas ignoradas por no comprenderse; corrección de lo señalado y repetición del mismo error en un lugar no señalado, que es precisamente lo que separa el nivel 3 del nivel 4.

**8. Interpretación pedagógica.** El indicador de mayor valor es la **transferencia**: corregir donde no se señaló. Es la evidencia más directa de que el patrón fue comprendido y no solo obedecido.

**9. Riesgos de evaluación injusta.** **Alto.** Depende por completo de que el código haya sido enseñado, de que las marcas sean legibles y de que el tiempo de corrección sea suficiente. Cualquiera de las tres condiciones incumplida convierte el módulo en una medida de las condiciones y no del estudiante. La regla vigente —el código de corrección indirecta es una estrategia pedagógica opcional, no una exigencia ministerial— es correcta y debe conservarse.

**10. Evaluación asistida por IA y límites.** Viabilidad **baja**. El contraste entre versiones es mecánico y el modelo lo hace bien; el juicio sobre transferencia exige clasificar errores por patrón en ambas versiones con consistencia, que es donde el modelo es menos fiable. Criterio de docente.

**11. Relación con el currículo ecuatoriano.** **Inferencia pedagógica.** `LL.5.4.4` (pág. 19), autorregulación de la producción escrita, es el referente más próximo y no menciona marcas ni códigos de corrección. `OG.LL.8` (pág. 16) sostiene el marco general. La cita vigente de `OG.LL.5` (pág. 16) es la más débil del instrumento: ese objetivo se refiere a estrategias cognitivas y metacognitivas **de comprensión lectora**, no de producción escrita, y no sostiene este módulo.

**12. Recomendación.** **Conservar documentado y no activar.** Modificar la declaración de alineación retirando `OG.LL.5` y marcando el conjunto como inferencia pedagógica. Incorporar la precisión de observabilidad del punto 6.

---

## 4. Observaciones sobre el inventario de códigos

El inventario de 27 códigos no es una rúbrica y no asigna niveles, pero alimenta las prioridades de planificación y, en el futuro, cualquier serie longitudinal de patrones de error. Dos observaciones.

### 4.1. Pares confundibles sin regla de prioridad

Siete pares o grupos admiten más de una asignación para el mismo fenómeno. Sin una regla de prioridad, dos docentes producirán recuentos distintos sobre el mismo texto, y esos recuentos no serán comparables ni entre paralelos ni entre campañas.

| Grupo confundible                 | Frontera propuesta                                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PERT` / `COH`                    | `PERT` si el contenido no responde a la consigna; `COH` si no encaja con el resto de la respuesta.                                                                                                                          |
| `TESIS` / `COH`                   | `TESIS` si falta o es inestable la idea organizadora; `COH` si la idea existe y el desarrollo la contradice.                                                                                                                |
| `RAZ` / `INF` / `FAL`             | `INF` si el problema está en la relación pista–conclusión sobre el texto; `RAZ` si está en la cadena afirmación–evidencia–conclusión; `FAL` solo ante un patrón argumentativo reconocible, y siempre marcado para revisión. |
| `LEX` / `REP` / `REG`             | `REP` si el problema es la reiteración; `LEX` si es la elección de significado; `REG` solo si la consigna declaró destinatario y género.                                                                                    |
| `SINT` / `CONC` / `VERB` / `PREP` | `CONC`, `VERB` y `PREP` cuando el fenómeno se identifica con precisión; `SINT` solo cuando el problema es estructural y no reducible a los anteriores.                                                                      |
| `PARA` / `COH` / `PUNT`           | `PARA` para la delimitación y función del párrafo (asociado a C7); `PUNT` para la segmentación oracional (C12); `COH` para la ruptura del eje temático (C7).                                                                |
| `REF` / `AMB`                     | `REF` si el problema es un referente no recuperable; `AMB` si el enunciado admite dos lecturas incompatibles no resueltas por el contexto.                                                                                  |

### 4.2. Ausencia de un código para ruptura por edición incompleta

`TIPO` cubre la posible pulsación accidental en el nivel de la palabra. No hay equivalente para la oración truncada por corrección incompleta en pantalla, fenómeno frecuente en escritura digital con tiempo limitado y actualmente indistinguible de una ruptura sintáctica genuina en C10. No se propone añadir un código —el inventario está congelado en el contrato y su tamaño es una decisión del responsable—, pero sí que la razón registrada en C10 pueda consignar la sospecha, del mismo modo que `TIPO` la consigna en C11.

---

## 5. Recomendaciones consolidadas

### 5.1. Por criterio

| Criterio                                | Recomendación                                   | Alcance del cambio                                            |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| C1 `core.pertinencia`                   | Conservar                                       | Alineación + regla de habilitación (documento humano)         |
| C2 `core.comprension_explicita`         | Conservar                                       | Alineación (documento humano)                                 |
| C3 `core.comprension_inferencial`       | Conservar                                       | Alineación: cobertura parcial declarada                       |
| C4 `core.lectura_critica`               | Conservar                                       | Marcar `teacher_only`; regla de reparto con M1                |
| C5 `core.tesis_posicion`                | Conservar                                       | Regla de reparto con M3                                       |
| C6 `core.evidencia_razonamiento`        | Conservar                                       | Marcar `teacher_only`; regla de no duplicación de prioridades |
| C7 `core.organizacion_coherencia`       | Conservar                                       | Umbral de extensión para no aplicación; recibe `PARA`         |
| C8 `core.cohesion`                      | Conservar                                       | Declarar fuente compartida con C7                             |
| C9 `core.lexico_registro`               | **Dividir** (Opción A) o condicionar (Opción B) | **Decisión del responsable**; A afecta al contrato operativo  |
| C10 `core.sintaxis_concordancia`        | Conservar                                       | Alineación; regla de cómputo; regla de variedad lingüística   |
| C11 `core.ortografia_acentuacion`       | Conservar                                       | Alineación; fidelidad de fragmento al 100 %                   |
| C12 `core.puntuacion_segmentacion`      | Conservar                                       | Alineación; fidelidad al 100 %; cede `PARA` a C7              |
| M1 `optional.proposito_punto_vista`     | Conservar activo                                | Regla de reparto con C4                                       |
| M2 `optional.comparacion_fuentes`       | Conservar documentado, no activar               | Corregir adscripción de `LL.5.3.6`                            |
| M3 `optional.estructura_argumentativa`  | Conservar activo                                | Regla de reparto con C5, C6, C7                               |
| M4 `optional.planificacion`             | Conservar documentado, no activar               | Ninguno                                                       |
| M5 `optional.revision`                  | Conservar documentado, no activar               | Exclusión mutua con M8                                        |
| M6 `optional.citacion_fuentes`          | Conservar documentado, no activar               | Ninguno                                                       |
| M7 `optional.reflexion_metalinguistica` | Conservar documentado, no activar               | Alineación: inferencia; techo de nivel 4                      |
| M8 `optional.autorregulacion_revision`  | Conservar documentado, no activar               | Retirar `OG.LL.5`; precisión de observabilidad                |

**Ningún criterio se recomienda retirar ni fusionar.** La única división propuesta es la de C9.

### 5.2. Recomendaciones transversales

1. **Declarar el grado de anclaje curricular de cada criterio** (directo, solo objetivo general, inferencia pedagógica) en el documento humano y en la matriz curricular.
2. **Incorporar la regla de habilitación de C1**: una respuesta fuera de consigna no permite observar comprensión ni razonamiento.
3. **Fijar umbrales de extensión mínima** por criterio durante el pilotaje, en lugar de descriptores de frecuencia sin anclaje.
4. **Elevar a 100 % la puerta de fidelidad de fragmentos para C11 y C12**, con verificación automática y determinista antes de mostrar la observación al docente.
5. **Marcar C4 y C6 como criterios de docente** hasta que la calibración empírica demuestre acuerdo suficiente.
6. **Convertir la puerta de variedad lingüística de §15.1 en umbral con criterio de fallo**, no en observación cualitativa.
7. **Incorporar reglas de prioridad para los códigos confundibles** (§4.1), sin las cuales los recuentos no son comparables.
8. **Registrar en el acta de cada campaña** los módulos fuera de alcance y los vacíos curriculares conscientes, para proteger el análisis longitudinal futuro.
9. **Armonizar las discrepancias** entre `DOCUMENTO_MAESTRO_YCHAYÑAN_LITE.md` §9.3 y `RUBRICA_DIAGNOSTICA_COMPLETA.md` en las alineaciones de C6 (`I.LL.5.6.1`) y C9 (`OG.LL.7`).

### 5.3. Cambios que requieren decisión del responsable

Ninguno de estos cambios se ha aplicado. Cada uno afecta a archivos protegidos y su ejecución corresponde al responsable pedagógico y a quien implemente el circuito técnico.

| #   | Decisión                                                                 | Afecta a                                                                 | Coste |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----- |
| 1   | ¿Se divide C9 en criterio léxico y módulo de registro?                   | `rubric-v1.json`, rúbrica humana, prueba de contrato, versión y snapshot | Alto  |
| 2   | ¿Se separa `no_aplica` en «no solicitado» y «sin evidencia suficiente»?  | Escala de niveles, JSON, contrato de IA, panel                           | Alto  |
| 3   | ¿Se fijan umbrales de extensión mínima y cuáles?                         | Documento humano y reglas de activación                                  | Medio |
| 4   | ¿Se eleva a 100 % la fidelidad de fragmentos en C11 y C12?               | §15.1 y validación técnica                                               | Bajo  |
| 5   | ¿Se marcan C4 y C6 como `teacher_only` en el pilotaje?                   | Configuración de campaña                                                 | Bajo  |
| 6   | ¿Se corrigen las alineaciones curriculares señaladas?                    | Rúbrica humana y documento maestro                                       | Bajo  |
| 7   | ¿Se congela un diccionario de prioridad de códigos?                      | Documento humano y prompt                                                | Bajo  |
| 8   | ¿Se declara en el acta de campaña el vacío de `LL.5.3.3` y de M2, M4–M8? | Documento humano                                                         | Bajo  |

Si el responsable acepta la decisión 1 o la 2, la versión de rúbrica debe pasar a 1.2 y los identificadores retirados no deben reutilizarse, conforme a la regla de identidad longitudinal de §1.6.

---

## 6. Comprobaciones realizadas

| Comprobación                                                           | Resultado                                                                                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los 12 criterios centrales de `rubric-v1.json` fueron analizados       | Sí — C1 a C12, fichas completas                                                                                                                                   |
| Los 2 módulos opcionales activos de `rubric-v1.json` fueron analizados | Sí — M1 y M3                                                                                                                                                      |
| Los 6 módulos documentados y no operativos fueron analizados           | Sí — M2, M4, M5, M6, M7, M8                                                                                                                                       |
| Cada ficha responde los 12 puntos solicitados                          | Sí, en las 20 fichas                                                                                                                                              |
| Cada relación curricular tiene fuente con página o marca de inferencia | Sí — verificado por criterio en §2, §3 y en la matriz                                                                                                             |
| Códigos curriculares localizados en el PDF ministerial                 | Sí — inventario en §0.4 con páginas 16 a 20                                                                                                                       |
| Códigos inventados                                                     | Ninguno. Se registran además tres inexistencias verificadas: `LL.5.4.5`, `I.LL.5.6.2` como indicador autónomo, y la ausencia de destreza de ortografía y sintaxis |
| Marcadores incompletos (`TODO`, `TBD`, «por definir», «pendiente»)     | Ninguno                                                                                                                                                           |
| Archivos existentes modificados                                        | Ninguno                                                                                                                                                           |
| Código, JSON, migraciones o pruebas modificados                        | Ninguno                                                                                                                                                           |

---

## 7. Límites de este informe

1. **No sustituye la calibración empírica.** Los umbrales de extensión, las puertas de acuerdo y las clasificaciones de viabilidad de IA son propuestas de diseño. Solo el pilotaje de 15 a 20 entregas reales previsto en §15.1 de la rúbrica puede confirmarlos o corregirlos.
2. **No aporta evidencia psicométrica.** No se ha calculado acuerdo entre evaluadores, consistencia interna ni validez de constructo, porque no existen datos de aplicación.
3. **La fuente curricular es una sola.** Se ha utilizado el currículo priorizado de Bachillerato General 2025 en su sección de Lengua y Literatura. No se han consultado el currículo completo de 2016, ni acuerdos ministeriales, ni lineamientos de evaluación que pudieran precisar alguna alineación.
4. **Las clasificaciones de viabilidad de IA son juicios de diseño**, basados en modos de fallo conocidos de los modelos de lenguaje aplicados a evaluación de texto. No proceden de una medición sobre este instrumento con este modelo y este prompt.
5. **No se ha evaluado el instrumento en uso.** Todo el análisis se apoya en los documentos, no en respuestas reales de estudiantes.

---

## 8. Documento relacionado

`MATRIZ_CURRICULAR_RUBRICA_15_17.md` presenta la tabla criterio–destreza–evidencia–tipo de pregunta–limitaciones–fuente exacta, con la marca de inferencia pedagógica donde corresponde.
