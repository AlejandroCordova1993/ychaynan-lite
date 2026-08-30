# Estado real de progreso de Ychayñan Lite

**Fecha de corte:** 29 de agosto de 2026

**Alcance de la revisión:** repositorio local completo, documentación maestra, guía técnica, rúbrica operativa, código React, migraciones PostgreSQL, pruebas, dependencias y configuración de despliegue.

## 1. Conclusión ejecutiva

Ychayñan Lite tiene una cimentación local sólida y verificable, pero todavía no es un MVP utilizable con estudiantes.

El plan técnico acotado de nueve tareas quedó implementado en el árbol de trabajo. Incluye la estructura React, autenticación docente, esquema de diez tablas, RLS, invariantes de integridad, normalización de nombres, importación segura de nómina y contratos básicos de la rúbrica. Sin embargo, el producto completo necesita todavía el proyecto Supabase real, cinco Edge Functions y casi todo el circuito de evaluación.

No debe comunicarse que las Fases 0 y 1 integrales están terminadas. Lo que está terminado es el **recorte local y sin backend real** descrito en `docs/superpowers/plans/2026-08-28-fase0-fase1-base-segura.md`.

## 2. Estado de Git

- Rama actual: `master`.
- `HEAD`: `af7e063` (`fix: cerrar hallazgos de la revision final...`).
- Las correcciones posteriores, la documentación maestra y la rúbrica operativa están preparadas en el índice de Git, pero todavía no forman parte de un commit.
- No existe remoto configurado; GitHub Pages todavía no puede desplegarse.
- `Base teórica.docx` y `Rubrica_Integral_360_Escritura.docx` continúan fuera de seguimiento. No deben incluirse por accidente en un repositorio público sin decidir antes su licencia y necesidad de publicación.
- No hay archivos de datos estudiantiles en el repositorio. `.gitignore` excluye CSV, JSONL, bases locales, exportaciones, resultados y variables de entorno.

## 3. Evidencia técnica verificada

### Calidad local

- `npm run verify`: lint, formato, TypeScript, pruebas y build pasan.
- Pruebas: 16 archivos, 107 pruebas aprobadas.
- Migraciones: ocho archivos ejecutados de extremo a extremo en PGlite.
- React Doctor sobre `src`: 100/100, sin advertencias después de sustituir estado no leído durante el render y combinar los recorridos del parser. El escaneo de la raíz también inspecciona `dist` generado y migraciones históricas, donde informa falsos positivos que no representan un problema del código React ni una ausencia de RLS final.
- Build de Vite: exitoso; el chunk inicial quedó en 394.76 kB y las pantallas docentes pesadas se cargan en chunks diferidos.

### Seguridad y dependencias

- Las diez tablas tienen RLS y privilegios SQL explícitos.
- `anon` no tiene acceso directo a las tablas del dominio.
- Una cuenta autenticada sin `app_metadata.role = teacher` no obtiene acceso docente.
- Los privilegios de funciones se revocan a `PUBLIC`, `anon` y `authenticated`, salvo la comprobación de rol concedida expresamente al docente autenticado.
- La ventana de entrega, la entrega única y la inmutabilidad de respuestas cuentan con defensas de base de datos y pruebas.
- `npm audit` no informa vulnerabilidades en el árbol completo ni en dependencias de producción después de la actualización mayor de Router, Vite y Vitest. La instalación reproducible se confirmó con `npm ci`.

### Límite de esta evidencia

PGlite valida PostgreSQL e invariantes, pero no sustituye el entorno alojado de Supabase. Todavía no se han aplicado las migraciones a un proyecto real ni se han verificado allí Auth, RLS, Data API, CORS, secretos y Edge Functions.

## 4. Avance por fase de la guía técnica

| Fase                         | Estado real                | Evidencia                                                                           | Pendiente principal                                                                                         |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Fase 0. Preparación          | Parcial                    | Repositorio, CI local, rúbrica JSON y contrato estructural                          | Crear Supabase, configurar entornos, implementar cinco Edge Functions y confirmar semánticamente la rúbrica |
| Fase 1. Base segura          | Parcial avanzada en local  | Diez tablas, RLS, Auth docente, nómina, normalización, importador CSV e invariantes | Aplicar migraciones en Supabase real, completar controles de acceso, desbloqueo y ensayo NAT con aula       |
| Fase 2. Calibración          | No iniciada                | La rúbrica humana y el JSON están disponibles                                       | Reunir 15–20 muestras anonimizadas, dos corridas y evaluación docente ciega                                 |
| Fase 3. Evaluación y ensayo  | No iniciada funcionalmente | Existen tablas e invariantes preparatorias                                          | Editor, códigos, sesión estudiantil, borrador local/remoto, entrega y pruebas de desconexión                |
| Fase 4. IA y revisión        | No iniciada funcionalmente | Existe el modelo de datos para resultados                                           | Proveedor, contrato de salida, evaluación individual/lote, reintentos y revisión docente                    |
| Fase 5. Diagnóstico y salida | No iniciada                | Existen requisitos documentados                                                     | Dashboard, CSV, JSON, manifiesto, ensayo integral, exportación y retiro                                     |

## 5. Superficie funcional actual

El enrutador declara doce destinos de producto. Solo dos tienen contenido funcional propio:

1. `/docente/ingresar`: formulario y sesión docente.
2. `/docente/paralelos`: creación de paralelos e importación de nómina.

Los diez destinos restantes muestran una pantalla que anuncia una fase posterior:

- acceso del estudiante;
- respuesta del estudiante;
- confirmación de entrega;
- inicio docente;
- creación de evaluación;
- distribución de accesos;
- bandeja de respuestas;
- revisión individual;
- resumen diagnóstico;
- exportación.

Por tanto, el sistema aún no permite crear, aplicar, evaluar ni exportar una evaluación diagnóstica completa.

## 6. Componentes implementados

- React 18, TypeScript, Vite 8, React Router 7 y `HashRouter` para GitHub Pages.
- `ErrorBoundary` con mensaje general de recuperación.
- Cliente Supabase y validación de variables públicas.
- Inicio y cierre de sesión docente.
- Protección de rutas y comprobación del rol `teacher`.
- Creación y listado de paralelos.
- Importación CSV con UTF-8 y Windows-1252.
- Preservación de `ñ`, tolerancia a mayúsculas y tildes vocálicas, y rechazo de coincidencias entre `n` y `ñ`.
- Vista previa de filas válidas, duplicadas e inválidas; solo se importan filas válidas.
- Diez tablas de dominio y ocho migraciones reproducibles.
- RLS, privilegio mínimo, restricciones, triggers de congelación e inmutabilidad.
- Rúbrica humana completa y `rubric-v1.json` con doce criterios, módulos operativos M1/M3 y 27 códigos de observación.
- Parser y prueba de integración que comprueban que los identificadores operativos y los códigos de observación conservan el orden de la rúbrica Markdown; la equivalencia semántica de los descriptores sigue requiriendo revisión pedagógica.
- Imports diferidos para el formulario de ingreso y la pantalla de nómina, con medición del bundle inicial por debajo del umbral de Vite.
- Flujos de GitHub Actions para verificar y preparar GitHub Pages.

## 7. Riesgos y deudas abiertas

### Bloquean el uso real

1. No existe proyecto Supabase real ni cuenta docente real verificada.
2. No existe ninguna de las cinco Edge Functions previstas.
3. El estudiante no puede autenticarse mediante código y nombre.
4. No existen borrador, entrega, evaluación con IA, revisión, dashboard ni exportación.
5. No se ha realizado calibración pedagógica ni ensayo con estudiantes.
6. No existe remoto GitHub ni despliegue `github.io`.

### Deben resolverse antes de publicar

1. Aplicar migraciones en Supabase real y ejecutar pruebas positivas y negativas de RLS.
2. Verificar que las funciones públicas validen sesión, permisos, límites, idempotencia y secretos.
3. Confirmar manualmente la correspondencia semántica completa entre `RUBRICA_DIAGNOSTICA_COMPLETA.md` y `rubric-v1.json`; las pruebas actuales validan identificadores, orden y cardinalidad, no equivalencia pedagógica exhaustiva de cada descriptor.
4. Decidir si los dos documentos DOCX fuente se excluyen definitivamente del repositorio público.

### No bloquean la siguiente fase local

- El escaneo completo de React Doctor mantiene falsos positivos sobre el bundle generado y la separación histórica de migraciones; la medición válida del frontend es `--project src`, que está en 100/100.
- Las pantallas futuras deberán mantener imports diferidos para no volver a elevar el chunk inicial.

## 8. Próxima puerta de trabajo recomendada

Antes de escribir el circuito estudiantil, corresponde cerrar una etapa de integración real:

1. consolidar en Git el paquete ya verificado;
2. crear el repositorio remoto y el proyecto Supabase independiente;
3. aplicar y validar las ocho migraciones en Supabase real;
4. crear la cuenta docente y asignar `app_metadata.role = teacher`;
5. implementar y probar primero la función de acceso estudiantil, incluidos límites compatibles con NAT;
6. continuar con sesión, borrador y entrega idempotente;
7. iniciar la calibración antes de habilitar evaluación automática.

La siguiente fase no debe empezar por el dashboard ni por la IA. El mayor riesgo inmediato es demostrar que identidad, acceso y entrega funcionan de forma segura en el backend real.

## 9. Regla de actualización

Este archivo se actualiza después de cada recorte funcional o cambio de infraestructura. Solo puede marcarse una fase como completa cuando existen código, pruebas proporcionales y verificación en el entorno que esa fase requiere. Una prueba local aprobada no reemplaza una validación de despliegue real.
