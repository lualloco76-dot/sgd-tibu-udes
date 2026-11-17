import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axiosConfig';
import { ROL_LABELS } from '../../context/AuthContext';
import { Detail, Notice } from './ConnectedUI';

export const absent = value => value === null || value === undefined || value === '' ? 'No registrado' : String(value);
export const date = (value, time = false) => {
  if (!value) return 'Información no disponible';
  const parsed = new Date(value.includes('T') ? (/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z') : value + 'T12:00:00-05:00');
  return Number.isNaN(parsed.getTime()) ? 'Información no disponible' : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}), timeZone: 'America/Bogota' }).format(parsed);
};
export const STATES = { preparado: 'Preparado', autorizado: 'Autorizado por el párroco', aprobado_curia: 'Aprobado por Curia', firmado: 'Firmado administrativamente', anulado: 'Anulado', pendiente: 'Pendiente de decisión', aprobada: 'Aprobada', rechazada: 'Rechazada' };
export const state = value => STATES[value] || 'Información no disponible';
export const actor = value => value?.nombre ? `${value.nombre}${ROL_LABELS[value.rol] ? ` · ${ROL_LABELS[value.rol]}` : ''}` : 'Información no disponible';
export const fullName = person => person ? `${person.nombres || ''} ${person.apellidos || ''}`.trim() : null;
const auditActions = {
  CREAR: 'Registro creado', MODIFICAR: 'Información modificada', CREAR_USUARIO: 'Cuenta creada', MODIFICAR_USUARIO: 'Cuenta modificada',
  RESTABLECER_PASSWORD: 'Contraseña restablecida', CAMBIAR_PASSWORD: 'Contraseña cambiada', LOGIN_FALLIDO: 'Inicio de sesión rechazado',
  INICIO_SESION: 'Inicio de sesión', CIERRE_SESION: 'Cierre de sesión', CAMBIAR_PERMISOS: 'Permisos actualizados',
  PROGRAMAR_RESPALDOS: 'Programación de copias actualizada', INICIAR_RESPALDO: 'Copia de respaldo iniciada',
  RESPALDO_COMPLETADO: 'Copia de respaldo completada', RESPALDO_FALLIDO: 'Copia de respaldo fallida', RESPALDO_INTERRUMPIDO: 'Copia de respaldo interrumpida',
  VERIFICAR_RESPALDO: 'Integridad del respaldo verificada', DESCARGAR_RESPALDO: 'Respaldo descargado',
  PREPARAR_CERTIFICADO: 'Certificado preparado', AUTORIZAR_CERTIFICADO: 'Certificado autorizado por el párroco',
  APROBAR_CURIA_CERTIFICADO: 'Certificado aprobado por Curia', FIRMAR_CERTIFICADO: 'Firma administrativa registrada',
  ANULAR_CERTIFICADO: 'Certificado anulado', DESCARGAR_CERTIFICADO: 'Certificado entregado',
  SUBIR_DOCUMENTO: 'Documento incorporado', DESCARGAR: 'Documento descargado', SOLICITAR: 'Solicitud enviada',
  APROBAR: 'Solicitud aprobada', RECHAZAR: 'Solicitud rechazada', NOTA_MARGINAL: 'Nota marginal incorporada', ASIGNAR_CUSTODIA: 'Custodia asignada',
};
export const auditAction = value => auditActions[value] || 'Actuación registrada';
export const auditArea = value => ({ registros_sacramentales: 'Partidas sacramentales', politicas_roles: 'Roles y permisos', sesiones: 'Acceso institucional', notas_marginales: 'Notas marginales', usuarios: 'Usuarios', personas: 'Personas', parroquias: 'Parroquias', libros: 'Libros', solicitudes: 'Solicitudes', certificados: 'Certificados', documentos: 'Documentos', respaldos: 'Respaldos' }[value] || 'Archivo institucional');
export function auditDetail(row) {
  if (!row.detalle) return 'Sin observaciones registradas';
  if (row.detalle === 'resultado=exitoso') return 'Operación completada';
  if (row.detalle === 'resultado=denegado') return 'Acceso denegado';
  if (row.accion === 'CAMBIAR_PERMISOS') return 'Configuración de permisos actualizada';
  if (row.accion === 'PROGRAMAR_RESPALDOS') return 'Frecuencia y horario de copias actualizados';
  if (row.entidad === 'respaldos' && row.detalle.startsWith('id=')) return 'Actuación de respaldo registrada';
  if (/^\s*[{[]/.test(row.detalle)) return 'Información histórica disponible para revisión administrativa';
  return row.detalle;
}
export function Fields({ items }) { return <dl className="detail-grid">{items.map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{typeof value === 'boolean' ? (value ? 'Sí' : 'No') : absent(value)}</dd></React.Fragment>)}</dl>; }
const extras = [['padre', 'Nombre del padre'], ['madre', 'Nombre de la madre'], ['padrino', 'Padrino'], ['madrina', 'Madrina'], ['referencia_bautismo', 'Referencia del bautismo'], ['testigo_1', 'Primer testigo'], ['testigo_2', 'Segundo testigo'], ['fecha_defuncion', 'Fecha de defunción'], ['causa', 'Causa consignada'], ['lugar_sepultura', 'Lugar de sepultura']];
export function RecordDetail({ row, catalogs, onClose }) {
  const spouse = catalogs.personas.find(p => p.id === row.datos?.conyuge_persona_id);
  return <Detail title={`Detalle de partida de ${row.sacramento?.nombre?.toLocaleLowerCase('es') || 'archivo'}`} onClose={onClose}>
    <section><h3>Datos de la persona</h3><Fields items={[
      ['Persona titular', fullName(row.persona)], ['Fecha de nacimiento', row.persona?.fecha_nacimiento ? date(row.persona.fecha_nacimiento) : null],
      ['Lugar de nacimiento', row.persona?.lugar_nacimiento],
    ]} /></section><section><h3>Datos sacramentales</h3><Fields items={[
      ['Tipo de partida', row.sacramento?.nombre], ['Fecha de celebración', row.fecha_celebracion ? date(row.fecha_celebracion) : null],
      ['Lugar de celebración', row.lugar], ['Ministro responsable', row.ministro],
      ...extras.filter(([key]) => row.datos?.[key] != null).map(([key, label]) => [label, key.startsWith('fecha_') ? date(row.datos[key]) : row.datos[key]]),
      ...(row.datos?.conyuge_persona_id ? [['Otra persona contrayente', fullName(spouse) || 'Información no disponible']] : []),
    ]} /></section><section><h3>Custodia y referencia documental</h3><Fields items={[
      ['Parroquia custodiante', catalogs.parroquias.find(p => p.id === row.parroquia_id)?.nombre], ['Libro', row.libro], ['Folio', row.folio], ['Número de partida', row.numero], ['Notas marginales', row.notas],
    ]} /></section>
  </Detail>;
}
export function PersonDetail({ row, parish, onClose }) {
  return <Detail title="Detalle de la persona" onClose={onClose}><section><h3>Identificación</h3><Fields items={[
    ['Nombre completo', fullName(row)], ['Identificación', row.numero_identificacion], ['Fecha de nacimiento', row.fecha_nacimiento ? date(row.fecha_nacimiento) : null], ['Lugar de nacimiento', row.lugar_nacimiento],
  ]} /></section><section><h3>Contacto y custodia</h3><Fields items={[
    ['Teléfono', row.telefono], ['Correo electrónico', row.email], ['Parroquia', parish],
  ]} /></section></Detail>;
}
function useRemote(path) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setData(null); setError(''); api.get(path, { signal: controller.signal }).then(r => { if (!controller.signal.aborted) setData(r.data); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }); return () => controller.abort(); }, [path]);
  return { data, error };
}
export function RecordHistory({ row, onClose }) {
  const { data, error } = useRemote(`/registros/${row.id}/historial`);
  return <Detail title="Historial de correcciones" onClose={onClose}><p>Partida {absent(row.numero)} · Libro {absent(row.libro)} · Folio {absent(row.folio)}</p><Notice message={error} error />
    {!data && !error && <p role="status">Consultando historial…</p>}
    {data?.length === 0 && <p>No hay correcciones registradas para esta partida.</p>}
    {data && <ol className="document-timeline">{data.map(event => <li key={event.id}><article><time>{date(event.fecha, true)}</time><h3>{event.accion || 'Corrección de partida'}</h3><Fields items={[
      ['Responsable', actor(event.responsable)], ['Motivo del cambio', event.motivo || 'Información no disponible'],
    ]} />{event.valores_autorizados === false && <p className="hint">Su rol puede consultar los campos afectados; los valores anteriores y nuevos requieren permiso de escritura o auditoría.</p>}
    {event.cambios?.length ? <div className="table-scroll"><table><thead><tr><th>Campo modificado</th>{event.valores_autorizados !== false && <><th>Antes</th><th>Después</th></>}</tr></thead><tbody>{event.cambios.map((change, i) => <tr key={i}><th scope="row">{change.campo}</th>{event.valores_autorizados !== false && <><td>{change.tipo === 'fecha' && change.anterior ? date(change.anterior) : absent(change.anterior)}</td><td>{change.tipo === 'fecha' && change.nuevo ? date(change.nuevo) : absent(change.nuevo)}</td></>}</tr>)}</tbody></table></div> : <p>Información de campos modificados no disponible.</p>}
    <p className="hint">Estado resultante: corrección incorporada al asiento. Los nombres vinculados corresponden al catálogo actual.</p></article></li>)}</ol>}
  </Detail>;
}
export function RequestDetail({ id, onClose }) {
  const { data: r, error } = useRemote(`/solicitudes/${id}`);
  return <Detail title="Detalle de la solicitud" onClose={onClose}><Notice message={error} error />{!r && !error && <p role="status">Consultando solicitud…</p>}{r && <>
    <section><h3>Referencia y custodia</h3><Fields items={[
      ['Parroquia solicitante', r.parroquia_origen], ['Parroquia custodiante', r.parroquia_destino], ['Libro', r.referencia?.libro], ['Folio', r.referencia?.folio], ['Número de partida', r.referencia?.numero], ['Estado actual', state(r.estado)],
    ]} /></section><section><h3>Solicitud y decisión</h3><Fields items={[
      ['Fecha de solicitud', date(r.fecha_creacion, true)], ['Solicitante', actor(r.solicitante)], ['Motivo institucional', r.motivo],
      ['Fecha de decisión', date(r.fecha_decision, true)], ['Responsable de decisión', actor(r.responsable)], ['Motivo de decisión', r.decision_motivo], ['Certificado vinculado', r.certificado?.numero],
    ]} /></section></>}
  </Detail>;
}
export function CertificateTrace({ id, onClose }) {
  const { data: c, error } = useRemote(`/certificados/${id}/trazabilidad`);
  const steps = ['preparado', 'autorizado', ...(c?.requiere_aprobacion_curia ? ['aprobado_curia'] : []), 'firmado'];
  return <Detail title="Trazabilidad del certificado" onClose={onClose}><Notice message={error} error />{!c && !error && <p role="status">Consultando trazabilidad…</p>}{c && <>
    <section><h3>{c.numero}</h3><Fields items={[
      ['Estado actual', state(c.estado)], ['Persona de la instantánea', c.persona || 'Información no disponible'], ['Parroquia de expedición', c.parroquia], ['Tipo de partida', c.tipo_partida],
      ['Libro', c.referencia?.libro], ['Folio', c.referencia?.folio], ['Número de partida', c.referencia?.numero], ['Solicitud interparroquial', c.solicitud_id ? `Solicitud vinculada al trámite` : 'No aplica'], ['Requiere Curia', c.requiere_aprobacion_curia], ['Motivo de Curia', c.motivo_curia],
    ]} />{!c.contenido_disponible && <p className="hint">Los datos personales se entregan a la parroquia solicitante después de la firma.</p>}</section>
    {c.solicitud && <section><h3>Solicitud interparroquial vinculada</h3><Fields items={[
      ['Parroquia solicitante', c.solicitud.origen], ['Parroquia custodiante', c.solicitud.destino], ['Fecha de solicitud', date(c.solicitud.fecha, true)], ['Decisión', state(c.solicitud.estado)], ['Fecha de decisión', date(c.solicitud.fecha_decision, true)], ['Responsable de decisión', actor(c.solicitud.responsable)], ['Motivo de decisión', c.solicitud.motivo_decision],
    ]} /></section>}
    <section><h3>Actuaciones registradas</h3><ol className="document-timeline">{c.eventos.map(event => <li key={event.id}><article><time>{date(event.fecha, true)}</time><h3>{event.accion}</h3><Fields items={[
      ['Responsable', actor(event.responsable)], ['Motivo', event.motivo || 'Información no disponible'], ...(event.estado ? [['Estado resultante', state(event.estado)]] : []),
    ]} /></article></li>)}</ol>
    {steps.filter(step => !c.eventos.some(e => e.estado === step)).map(step => <p className="timeline-pending" key={step}>{state(step)}: {c.estado === 'anulado' ? 'Trámite anulado; actuación no registrada.' : 'Actuación pendiente o información histórica no disponible.'}</p>)}
    {c.estado === 'anulado' && !c.eventos.some(e => e.estado === 'anulado') && <p>Anulación: información histórica no disponible.</p>}
    </section><p className="notice">La firma administrativa registrada en el sistema no es una firma digital criptográfica certificada. El certificado conserva la instantánea de su preparación.</p>
  </>}
  </Detail>;
}
