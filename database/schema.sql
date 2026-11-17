-- Referencia PostgreSQL del ORM actual. NO ejecutar sobre una base existente.

-- Alembic 0001 -> 0002 -> 0003 -> 0004 es la fuente de migración.

-- No incluye datos ni credenciales; algunos defaults son aplicados por SQLAlchemy.



CREATE TABLE parroquias (
	id SERIAL NOT NULL,
	nombre VARCHAR(200) NOT NULL,
	codigo VARCHAR(40) NOT NULL,
	activa BOOLEAN NOT NULL,
	municipio VARCHAR(150),
	localidad VARCHAR(150),
	direccion VARCHAR(250),
	tipo VARCHAR(30) DEFAULT 'parroquia' NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (codigo)
);

CREATE TABLE sacramentos (
	id SERIAL NOT NULL,
	nombre VARCHAR NOT NULL,
	descripcion TEXT,
	PRIMARY KEY (id),
	UNIQUE (nombre)
);

CREATE INDEX ix_sacramentos_id ON sacramentos (id);

CREATE TABLE libros (
	id SERIAL NOT NULL,
	parroquia_id INTEGER NOT NULL,
	sacramento_id INTEGER NOT NULL,
	numero VARCHAR(100) NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_libro_custodia UNIQUE (parroquia_id, sacramento_id, numero),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id),
	FOREIGN KEY(sacramento_id) REFERENCES sacramentos (id)
);

CREATE INDEX ix_libros_parroquia_id ON libros (parroquia_id);

CREATE TABLE personas (
	id SERIAL NOT NULL,
	nombres VARCHAR NOT NULL,
	apellidos VARCHAR NOT NULL,
	fecha_nacimiento DATE,
	lugar_nacimiento VARCHAR,
	numero_identificacion VARCHAR,
	telefono VARCHAR,
	email VARCHAR,
	parroquia_id INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id)
);

CREATE INDEX ix_personas_id ON personas (id);

CREATE UNIQUE INDEX ix_personas_numero_identificacion ON personas (numero_identificacion);

CREATE INDEX ix_personas_parroquia_id ON personas (parroquia_id);

CREATE TABLE usuarios (
	id SERIAL NOT NULL,
	nombre VARCHAR NOT NULL,
	email VARCHAR NOT NULL,
	password_hash VARCHAR NOT NULL,
	rol VARCHAR,
	activo BOOLEAN,
	parroquia_id INTEGER,
	token_version INTEGER DEFAULT '0' NOT NULL,
	intentos_fallidos INTEGER DEFAULT '0' NOT NULL,
	bloqueado_hasta TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id)
);

CREATE UNIQUE INDEX ix_usuarios_email ON usuarios (email);

CREATE INDEX ix_usuarios_id ON usuarios (id);

CREATE INDEX ix_usuarios_parroquia_id ON usuarios (parroquia_id);

CREATE TABLE auditoria (
	id SERIAL NOT NULL,
	usuario_id INTEGER,
	accion VARCHAR NOT NULL,
	entidad VARCHAR NOT NULL,
	entidad_id INTEGER,
	fecha TIMESTAMP WITH TIME ZONE DEFAULT now(),
	detalle TEXT,
	parroquia_id INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id)
);

CREATE INDEX ix_auditoria_fecha ON auditoria (fecha);

CREATE INDEX ix_auditoria_id ON auditoria (id);

CREATE INDEX ix_auditoria_parroquia_id ON auditoria (parroquia_id);

CREATE TABLE registros_sacramentales (
	id SERIAL NOT NULL,
	persona_id INTEGER NOT NULL,
	sacramento_id INTEGER NOT NULL,
	fecha_celebracion DATE,
	lugar VARCHAR,
	ministro VARCHAR,
	libro VARCHAR,
	folio VARCHAR,
	numero VARCHAR,
	notas TEXT,
	parroquia_id INTEGER,
	datos JSON DEFAULT '{}' NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_asiento_custodia UNIQUE (parroquia_id, sacramento_id, libro, folio, numero),
	FOREIGN KEY(persona_id) REFERENCES personas (id),
	FOREIGN KEY(sacramento_id) REFERENCES sacramentos (id),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id)
);

CREATE INDEX ix_registro_fecha ON registros_sacramentales (fecha_celebracion);

CREATE INDEX ix_registro_persona ON registros_sacramentales (persona_id);

CREATE INDEX ix_registros_sacramentales_id ON registros_sacramentales (id);

CREATE INDEX ix_registros_sacramentales_parroquia_id ON registros_sacramentales (parroquia_id);

CREATE TABLE sesiones (
	id VARCHAR(64) NOT NULL,
	usuario_id INTEGER NOT NULL,
	expira TIMESTAMP WITH TIME ZONE NOT NULL,
	revocada BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_sesiones_usuario_id ON sesiones (usuario_id);

CREATE TABLE documentos (
	id SERIAL NOT NULL,
	registro_id INTEGER NOT NULL,
	tipo_documento VARCHAR NOT NULL,
	nombre_archivo VARCHAR NOT NULL,
	ruta_archivo VARCHAR NOT NULL,
	hash_sha256 VARCHAR NOT NULL,
	fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT now(),
	subido_por INTEGER,
	PRIMARY KEY (id),
	FOREIGN KEY(registro_id) REFERENCES registros_sacramentales (id),
	FOREIGN KEY(subido_por) REFERENCES usuarios (id)
);

CREATE INDEX ix_documentos_id ON documentos (id);

CREATE INDEX ix_documentos_registro ON documentos (registro_id);

CREATE TABLE notas_marginales (
	id SERIAL NOT NULL,
	registro_id INTEGER NOT NULL,
	usuario_id INTEGER NOT NULL,
	fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	motivo TEXT NOT NULL,
	anterior JSON NOT NULL,
	posterior JSON NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(registro_id) REFERENCES registros_sacramentales (id),
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE INDEX ix_notas_marginales_registro_id ON notas_marginales (registro_id);

CREATE TABLE solicitudes (
	id SERIAL NOT NULL,
	registro_id INTEGER NOT NULL,
	origen_id INTEGER NOT NULL,
	destino_id INTEGER NOT NULL,
	solicitante_id INTEGER NOT NULL,
	estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL,
	motivo TEXT NOT NULL,
	decision_motivo TEXT,
	responsable_id INTEGER,
	fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	fecha_decision TIMESTAMP WITH TIME ZONE,
	requiere_aprobacion_curia BOOLEAN DEFAULT 'false' NOT NULL,
	aprobado_curia_por INTEGER,
	fecha_aprobacion_curia TIMESTAMP WITH TIME ZONE,
	motivo_curia TEXT,
	PRIMARY KEY (id),
	CONSTRAINT ck_solicitud_estado CHECK (estado IN ('pendiente','aprobada','rechazada')),
	FOREIGN KEY(registro_id) REFERENCES registros_sacramentales (id),
	FOREIGN KEY(origen_id) REFERENCES parroquias (id),
	FOREIGN KEY(destino_id) REFERENCES parroquias (id),
	FOREIGN KEY(solicitante_id) REFERENCES usuarios (id),
	FOREIGN KEY(responsable_id) REFERENCES usuarios (id),
	FOREIGN KEY(aprobado_curia_por) REFERENCES usuarios (id)
);

CREATE INDEX ix_solicitudes_destino_id ON solicitudes (destino_id);

CREATE INDEX ix_solicitudes_origen_id ON solicitudes (origen_id);

CREATE INDEX ix_solicitudes_registro_id ON solicitudes (registro_id);

CREATE TABLE certificados (
	id SERIAL NOT NULL,
	numero VARCHAR(60) NOT NULL,
	registro_id INTEGER NOT NULL,
	solicitud_id INTEGER,
	emitido_por INTEGER NOT NULL,
	parroquia_id INTEGER NOT NULL,
	codigo_verificacion VARCHAR(100) NOT NULL,
	fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	instantanea JSON NOT NULL,
	estado VARCHAR(20) DEFAULT 'preparado' NOT NULL,
	autorizado_por INTEGER,
	fecha_autorizacion TIMESTAMP WITH TIME ZONE,
	requiere_aprobacion_curia BOOLEAN DEFAULT 'false' NOT NULL,
	aprobado_curia_por INTEGER,
	fecha_aprobacion_curia TIMESTAMP WITH TIME ZONE,
	motivo_curia TEXT,
	firmado_por INTEGER,
	fecha_firma TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id),
	CONSTRAINT ck_certificado_estado CHECK (estado IN ('preparado','autorizado','aprobado_curia','firmado','anulado')),
	UNIQUE (numero),
	FOREIGN KEY(registro_id) REFERENCES registros_sacramentales (id),
	FOREIGN KEY(solicitud_id) REFERENCES solicitudes (id),
	FOREIGN KEY(emitido_por) REFERENCES usuarios (id),
	FOREIGN KEY(parroquia_id) REFERENCES parroquias (id),
	UNIQUE (codigo_verificacion),
	FOREIGN KEY(autorizado_por) REFERENCES usuarios (id),
	FOREIGN KEY(aprobado_curia_por) REFERENCES usuarios (id),
	FOREIGN KEY(firmado_por) REFERENCES usuarios (id)
);

CREATE INDEX ix_certificados_parroquia_id ON certificados (parroquia_id);

CREATE INDEX ix_certificados_registro_id ON certificados (registro_id);

-- Revisión 0005. En bases existentes aplicar Alembic, no este archivo.
CREATE TABLE politicas_roles (
    rol VARCHAR(40) PRIMARY KEY,
    permisos JSON NOT NULL,
    revision INTEGER NOT NULL,
    actualizado TIMESTAMP WITH TIME ZONE,
    actualizado_por INTEGER REFERENCES usuarios(id)
);

CREATE TABLE configuracion_respaldos (
    id INTEGER PRIMARY KEY,
    frecuencia VARCHAR(15) NOT NULL,
    hora INTEGER NOT NULL,
    proximo TIMESTAMP WITH TIME ZONE,
    en_curso BOOLEAN NOT NULL,
    trabajo_id VARCHAR(32),
    latido TIMESTAMP WITH TIME ZONE
);

INSERT INTO configuracion_respaldos(id, frecuencia, hora, en_curso) VALUES (1, 'manual', 2, FALSE);

CREATE TABLE respaldos (
    id VARCHAR(32) PRIMARY KEY,
    origen VARCHAR(15) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    creado TIMESTAMP WITH TIME ZONE NOT NULL,
    terminado TIMESTAMP WITH TIME ZONE,
    usuario_id INTEGER REFERENCES usuarios(id),
    tamano BIGINT,
    sha256 VARCHAR(64),
    verificado TIMESTAMP WITH TIME ZONE,
    error VARCHAR(300)
);
