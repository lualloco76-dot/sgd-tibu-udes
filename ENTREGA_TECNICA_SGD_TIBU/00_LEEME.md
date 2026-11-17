# Entrega técnica SGD Diócesis de Tibú

Inicio con doble clic: [ejecutable Windows para backend y frontend](22_LANZADOR_WINDOWS.md).

Última entrega de interfaz: [rediseño y ampliación funcional](21_REDISENO_Y_FUNCIONES.md), con migración 0004, indicadores, búsqueda y directorio actualizado.

Fecha de referencia: 28 de octubre de 2026. Esta entrega describe el código implementado y separa la validación sintética de la aceptación institucional. No certifica datos reales, producción ni aprobación de la Diócesis.

Actualización posterior: [PostgreSQL local conectado](17_CONEXION_POSTGRESQL_LOCAL.md). Se creó `parroquia`, se aplicaron las migraciones y se verificó la API. Los informes iniciales y ZIP anteriores conservan el estado previo a esta conexión.

Catálogo cargado: [13 parroquias activas disponibles en el login](20_CATALOGO_PARROQUIAS.md), según la lista suministrada por el responsable.

Última actualización: [contraseñas de mínimo 8 caracteres y acceso restablecido](19_PASSWORD8_Y_ACCESO.md), con verificación de login por HTTP.

Cambio posterior de acceso: [selector de parroquia en el login](18_LOGIN_POR_PARROQUIA.md), validado en interfaz, API y PostgreSQL local. El manual de usuario y OpenAPI incluyen el nuevo contrato.

| Artefacto | Contenido |
|---|---|
| [Diagnóstico](01_DIAGNOSTICO_CAMBIOS.md) | Hallazgos priorizados y correcciones |
| [Inventario](02_INVENTARIO_FUNCIONAL.md) | Alcance, permisos y pendientes |
| [Arquitectura](03_ARQUITECTURA.md) | Componentes, decisiones e integridad |
| [Diccionario](04_DICCIONARIO_DATOS.md) | Columnas, claves e índices obtenidos del ORM |
| [Endpoints](05_ENDPOINTS.md) | Rutas generadas desde OpenAPI |
| [Historias y backlog](06_HISTORIAS_BACKLOG.md) | Criterios de aceptación y RUP/Scrum |
| [Trazabilidad](07_TRAZABILIDAD.md) | Requisitos, código y comprobaciones |
| [Catálogo de pruebas](08_CATALOGO_PRUEBAS.md) | Casos automatizados identificados en el código |
| [Resultados](09_RESULTADOS_VALIDACION.md) | Ejecuciones reales y límites |
| [Manual técnico](10_MANUAL_TECNICO.md) | Instalación, configuración y recuperación |
| [Manual de usuario](11_MANUAL_USUARIO.md) | Operación básica por rol |
| [Evidencias](12_EVIDENCIAS_TESIS.md) | Guion de demostración y sustentación |
| [Diagramas](diagramas/README.md) | UML PlantUML y entidad-relación Mermaid |
| [OpenAPI](openapi.json) | Contrato REST sin datos reales |

Los resultados ejecutados prevalecen sobre las previsiones del backlog. La relación final de commits y archivos se incorpora al cierre de validación.

Para regenerar referencias, desde la raíz: `python ENTREGA_TECNICA_SGD_TIBU/generar_referencias.py`. El generador fuerza una URL SQLite en memoria antes de importar la aplicación y no abre conexiones.

No distribuir el respaldo original con la tesis: puede contener datos y configuración confidenciales. Las evidencias públicas deben usar exclusivamente datos sintéticos.

Documentos de consolidación: [RF/RNF y RUP + Scrum](13_REQUISITOS_RUP_SCRUM.md), [matriz de siete roles](14_MATRIZ_ROLES_PERMISOS.md), [PostgreSQL y migración segura](15_POSTGRESQL_Y_MIGRACION_SEGURA.md), [informe de modificaciones](16_INFORME_MODIFICACIONES_20261028.md) y [estado final y siguiente paso](../FINAL_PENDIENTES_Y_RESULTADOS.md).

`codigo-corregido.zip` contiene la fuente de esta revisión sin .env, bases, archivos subidos, dependencias ni respaldos. Su manifiesto y referencias de commits están en evidencias. El ZIP exterior de entrega incluye documentación, diagramas, evidencias y este paquete de código.
