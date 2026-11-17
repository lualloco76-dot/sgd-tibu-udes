# Diccionario de datos real

Generado desde `Base.metadata`; describe el modelo actual, no certifica el esquema de una base histórica. Las revisiones Alembic conservan columnas históricas adicionales. NULL de custodia significa pendiente de conciliación institucional.

## parroquias

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| nombre | VARCHAR(200) | No |  |  |
| codigo | VARCHAR(40) | No | UNIQUE |  |
| activa | BOOLEAN | No |  | True |
| municipio | VARCHAR(150) | Sí |  |  |
| localidad | VARCHAR(150) | Sí |  |  |
| direccion | VARCHAR(250) | Sí |  |  |
| tipo | VARCHAR(30) | No |  | parroquia |

Unicidad: codigo.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ninguno adicional.

## sacramentos

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| nombre | VARCHAR | No | UNIQUE |  |
| descripcion | TEXT | Sí |  |  |

Unicidad: nombre.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_sacramentos_id(id).

## libros

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| parroquia_id | INTEGER | No | FK → parroquias.id |  |
| sacramento_id | INTEGER | No | FK → sacramentos.id |  |
| numero | VARCHAR(100) | No |  |  |

Unicidad: parroquia_id,sacramento_id,numero.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_libros_parroquia_id(parroquia_id).

## personas

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| nombres | VARCHAR | No |  |  |
| apellidos | VARCHAR | No |  |  |
| fecha_nacimiento | DATE | Sí |  |  |
| lugar_nacimiento | VARCHAR | Sí |  |  |
| numero_identificacion | VARCHAR | Sí | UNIQUE |  |
| telefono | VARCHAR | Sí |  |  |
| email | VARCHAR | Sí |  |  |
| parroquia_id | INTEGER | Sí | FK → parroquias.id |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_personas_id(id); ix_personas_numero_identificacion(numero_identificacion); ix_personas_parroquia_id(parroquia_id).

## usuarios

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| nombre | VARCHAR | No |  |  |
| email | VARCHAR | No | UNIQUE |  |
| password_hash | VARCHAR | No |  |  |
| rol | VARCHAR | Sí |  | consulta |
| activo | BOOLEAN | Sí |  | True |
| parroquia_id | INTEGER | Sí | FK → parroquias.id |  |
| token_version | INTEGER | No |  | 0 |
| intentos_fallidos | INTEGER | No |  | 0 |
| bloqueado_hasta | DATETIME | Sí |  |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_usuarios_email(email); ix_usuarios_id(id); ix_usuarios_parroquia_id(parroquia_id).

## auditoria

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| usuario_id | INTEGER | Sí | FK → usuarios.id |  |
| accion | VARCHAR | No |  |  |
| entidad | VARCHAR | No |  |  |
| entidad_id | INTEGER | Sí |  |  |
| fecha | DATETIME | Sí |  | now() |
| detalle | TEXT | Sí |  |  |
| parroquia_id | INTEGER | Sí | FK → parroquias.id |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_auditoria_fecha(fecha); ix_auditoria_id(id); ix_auditoria_parroquia_id(parroquia_id).

## registros_sacramentales

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| persona_id | INTEGER | No | FK → personas.id |  |
| sacramento_id | INTEGER | No | FK → sacramentos.id |  |
| fecha_celebracion | DATE | Sí |  |  |
| lugar | VARCHAR | Sí |  |  |
| ministro | VARCHAR | Sí |  |  |
| libro | VARCHAR | Sí |  |  |
| folio | VARCHAR | Sí |  |  |
| numero | VARCHAR | Sí |  |  |
| notas | TEXT | Sí |  |  |
| parroquia_id | INTEGER | Sí | FK → parroquias.id |  |
| datos | JSON | No |  | {} |

Unicidad: parroquia_id,sacramento_id,libro,folio,numero.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_registro_fecha(fecha_celebracion); ix_registro_persona(persona_id); ix_registros_sacramentales_id(id); ix_registros_sacramentales_parroquia_id(parroquia_id).

## sesiones

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | VARCHAR(64) | No | PK |  |
| usuario_id | INTEGER | No | FK → usuarios.id |  |
| expira | DATETIME | No |  |  |
| revocada | BOOLEAN | No |  | False |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_sesiones_usuario_id(usuario_id).

## documentos

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| registro_id | INTEGER | No | FK → registros_sacramentales.id |  |
| tipo_documento | VARCHAR | No |  |  |
| nombre_archivo | VARCHAR | No |  |  |
| ruta_archivo | VARCHAR | No |  |  |
| hash_sha256 | VARCHAR | No |  |  |
| fecha_subida | DATETIME | Sí |  | now() |
| subido_por | INTEGER | Sí | FK → usuarios.id |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_documentos_id(id); ix_documentos_registro(registro_id).

## notas_marginales

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| registro_id | INTEGER | No | FK → registros_sacramentales.id |  |
| usuario_id | INTEGER | No | FK → usuarios.id |  |
| fecha | DATETIME | No |  | now() |
| motivo | TEXT | No |  |  |
| anterior | JSON | No |  |  |
| posterior | JSON | No |  |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: ninguna declarada en ORM.
Índices: ix_notas_marginales_registro_id(registro_id).

## solicitudes

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| registro_id | INTEGER | No | FK → registros_sacramentales.id |  |
| origen_id | INTEGER | No | FK → parroquias.id |  |
| destino_id | INTEGER | No | FK → parroquias.id |  |
| solicitante_id | INTEGER | No | FK → usuarios.id |  |
| estado | VARCHAR(20) | No |  | pendiente |
| motivo | TEXT | No |  |  |
| decision_motivo | TEXT | Sí |  |  |
| responsable_id | INTEGER | Sí | FK → usuarios.id |  |
| fecha_creacion | DATETIME | No |  | now() |
| fecha_decision | DATETIME | Sí |  |  |
| requiere_aprobacion_curia | BOOLEAN | No |  | false |
| aprobado_curia_por | INTEGER | Sí | FK → usuarios.id |  |
| fecha_aprobacion_curia | DATETIME | Sí |  |  |
| motivo_curia | TEXT | Sí |  |  |

Unicidad: solo claves indicadas.
Restricciones CHECK: estado IN ('pendiente','aprobada','rechazada').
Índices: ix_solicitudes_destino_id(destino_id); ix_solicitudes_origen_id(origen_id); ix_solicitudes_registro_id(registro_id).

## certificados

| Columna | Tipo ORM | Nulo | Clave / referencia | Valor predeterminado |
|---|---|---|---|---|
| id | INTEGER | No | PK |  |
| numero | VARCHAR(60) | No | UNIQUE |  |
| registro_id | INTEGER | No | FK → registros_sacramentales.id |  |
| solicitud_id | INTEGER | Sí | FK → solicitudes.id |  |
| emitido_por | INTEGER | No | FK → usuarios.id |  |
| parroquia_id | INTEGER | No | FK → parroquias.id |  |
| codigo_verificacion | VARCHAR(100) | No | UNIQUE |  |
| fecha_emision | DATETIME | No |  | now() |
| instantanea | JSON | No |  |  |
| estado | VARCHAR(20) | No |  | preparado |
| autorizado_por | INTEGER | Sí | FK → usuarios.id |  |
| fecha_autorizacion | DATETIME | Sí |  |  |
| requiere_aprobacion_curia | BOOLEAN | No |  | false |
| aprobado_curia_por | INTEGER | Sí | FK → usuarios.id |  |
| fecha_aprobacion_curia | DATETIME | Sí |  |  |
| motivo_curia | TEXT | Sí |  |  |
| firmado_por | INTEGER | Sí | FK → usuarios.id |  |
| fecha_firma | DATETIME | Sí |  |  |

Unicidad: numero; codigo_verificacion.
Restricciones CHECK: estado IN ('preparado','autorizado','aprobado_curia','firmado','anulado').
Índices: ix_certificados_parroquia_id(parroquia_id); ix_certificados_registro_id(registro_id).
