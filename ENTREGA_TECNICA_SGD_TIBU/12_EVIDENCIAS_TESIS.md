# Evidencias para sustentación

| Evidencia | Fuente | Límite |
|---|---|---|
| Conservación inicial | Commit `b0bc7b7` y manifiesto local | No distribuir el respaldo con datos/configuración |
| Arquitectura y contratos | Código, OpenAPI, diccionario y UML | Describe implementación, no aceptación institucional |
| Validación automática | XML/logs y registro de resultados | Solo acredita casos ejecutados |
| Integridad y migración | Tests con filas artificiales | No certifica datos reales |
| PDF/QR | Archivo sintético, render y decodificación | No acredita firma o sello institucional |
| Aceptación | Acta con responsables autorizados | Pendiente; no se presume por pruebas técnicas |

## Guion de demostración

Usar una base nueva sintética, parroquias ficticias A/B/C y cuentas distintas por custodia. Rotular la demostración como artificial; no utilizar datos de feligreses reales.

1. Como B, registrar persona, libro y partida; consultar y comprobar persistencia.
2. Como A, buscar referencia exacta externa y comprobar ausencia de identidad personal.
3. Crear solicitud A → B; comprobar bandejas de ambos y ausencia en C.
4. Intentar decidir desde A/C y comprobar denegación.
5. Como B, aprobar con motivo; una segunda decisión debe producir conflicto.
6. Preparar desde B, autorizar como párroco B, firmar ordinario y descargar desde A; comprobar rechazo desde C. Repetir con competencia de Curia: autorizar B, aprobar y firmar como canciller. Mostrar que administrador y secretario no firman.
7. Decodificar/verificar QR y comprobar respuesta mínima.
8. Corregir la partida con motivo; comprobar historial e instantánea intacta del certificado anterior.
9. Repetir con solicitud rechazada y comprobar que no habilita emisión/descarga.
10. Revisar auditoría/reportes por alcance; cerrar sesión y comprobar token invalidado.

Las capturas de interfaz complementan las pruebas API; no reemplazan controles negativos. No se adjuntan capturas ficticias ni resultados atribuidos a usuarios reales sin su participación.

## Explicación académica

Distinguir autenticación, rol y custodia. Explicar decisiones terminales, actualización condicionada y certificado como instantánea. El diagrama UML de casos de uso usa actores y óvalos; el diagrama de actividad representa el flujo. No afirmar firma criptográfica ni inmutabilidad frente a un superusuario de BD.

Relacionar artefactos con disciplinas RUP y backlog Scrum de consolidación. No inventar sprints o reuniones anteriores. Exponer pendientes de aceptación institucional, legado y operación junto a la evidencia técnica lograda.

11. Anular con motivo como firmante autorizado y comprobar PDF bloqueado y verificación inválida.

Pendientes de sustentación: capturas y ejecución E2E con navegador conectado, acta de aceptación diocesana, definición de destino/conciliación de legado, política de firma/sello y evidencia de restauración/HTTPS. Las pruebas técnicas no acreditan esas actividades.
