# Diagramas de ingeniería

Los `.puml` son fuentes UML PlantUML; `.mmd` es Mermaid entidad-relación. Los casos de uso emplean actores, asociaciones y casos dentro del límite del sistema, no flujogramas. El diagrama de actividad representa por separado la operación institucional.

| Archivo | Propósito |
|---|---|
| `01_casos_uso.puml` | Objetivos de actores y límite del sistema |
| `02_actores_asociaciones.puml` | Especialización de actores y asociaciones |
| `03_clases.puml` | Clases persistentes y multiplicidades |
| `04_secuencia_entrega.puml` | Interacción de solicitud, decisión y entrega |
| `05_secuencia_correccion.puml` | Corrección transaccional e historial |
| `06_actividades.puml` | Flujo con decisiones aprobada/rechazada |
| `07_componentes.puml` | Componentes y dependencias de software |
| `08_despliegue.puml` | Topología prevista de instalación autorizada |
| `09_entidad_relacion.mmd` y `.puml` | Tablas, columnas y FK generadas desde ORM |
| `10_estados_solicitud.puml` | Máquina de estados y decisiones terminales |

Se incluyen SVG y PNG renderizados de los once diagramas con PlantUML. Para regenerarlos con Java y PlantUML disponibles: `java -jar plantuml.jar -tsvg -Playout=smetana *.puml` y `java -jar plantuml.jar -tpng -Playout=smetana *.puml`. El ER PlantUML se genera desde los mismos metadatos que Mermaid y el diccionario. El diagrama ER se puede abrir en un visor Mermaid. Las fuentes son editables y no contienen datos personales. No se afirma instalación productiva por presentar un diagrama de despliegue. La ejecución del renderizador verifica sintaxis y genera las imágenes. Se inspeccionaron visualmente los once PNG; el diagrama de estados se ajustó y volvió a renderizar para separar etiquetas. El detalle del ER puede ampliarse en SVG para conservar legibilidad.

## Imágenes listas para consultar

- [01_casos_uso (SVG)](01_casos_uso.svg) · [PNG](01_casos_uso.png) · [Fuente UML](01_casos_uso.puml)
- [02_actores_asociaciones (SVG)](02_actores_asociaciones.svg) · [PNG](02_actores_asociaciones.png) · [Fuente UML](02_actores_asociaciones.puml)
- [03_clases (SVG)](03_clases.svg) · [PNG](03_clases.png) · [Fuente UML](03_clases.puml)
- [04_secuencia_entrega (SVG)](04_secuencia_entrega.svg) · [PNG](04_secuencia_entrega.png) · [Fuente UML](04_secuencia_entrega.puml)
- [05_secuencia_correccion (SVG)](05_secuencia_correccion.svg) · [PNG](05_secuencia_correccion.png) · [Fuente UML](05_secuencia_correccion.puml)
- [06_actividades (SVG)](06_actividades.svg) · [PNG](06_actividades.png) · [Fuente UML](06_actividades.puml)
- [07_componentes (SVG)](07_componentes.svg) · [PNG](07_componentes.png) · [Fuente UML](07_componentes.puml)
- [08_despliegue (SVG)](08_despliegue.svg) · [PNG](08_despliegue.png) · [Fuente UML](08_despliegue.puml)
- [09_entidad_relacion (SVG)](09_entidad_relacion.svg) · [PNG](09_entidad_relacion.png) · [Fuente UML](09_entidad_relacion.puml)
- [10_estados_solicitud (SVG)](10_estados_solicitud.svg) · [PNG](10_estados_solicitud.png) · [Fuente UML](10_estados_solicitud.puml)

- [11_estados_certificado (SVG)](11_estados_certificado.svg) · [PNG](11_estados_certificado.png) · [Fuente UML](11_estados_certificado.puml)

Revisión 28-10-2026: actores de los siete roles sin herencia administrador→párroco; secuencia/actividad con autorización, Curia y firma; clase Certificado con trazabilidad y máquina de estados de certificados. Los campos de Curia de Solicitud están documentados en ER/diccionario, pero no implican un endpoint de aprobación de solicitud que no existe.
