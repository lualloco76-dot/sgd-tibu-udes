import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Overview from './Overview';
import ParishDirectory from './ParishDirectory';
import Icon from './shared/Icon';
import RecordPicker, { recordReference } from './shared/RecordPicker';
import { exportCsv } from './shared/exportCsv';
import api, { downloadFile, errorMessage } from '../api/axiosConfig';
import { useAuth, ROLES, ROL_LABELS } from '../context/AuthContext';
import { Field, Notice, Page, Pagination, Table, parishOptions, useCatalogs, useList } from './shared/ConnectedUI';
import { CertificateTrace, RequestDetail, PersonDetail, date, state, actor, auditAction, auditArea, auditDetail } from './shared/DocumentDetails';

export function EntityPage({ title, path, fields, columns, writable = true, editable = writable, initial = {}, actions, searchable = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useList(path, searchable ? { q: searchParams.get('q') || '' } : {});
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const start = (row) => {
    setEditing(row || null);
    setForm(row ? { ...initial, ...Object.fromEntries(fields.map((field) => [field.name, row[field.name] ?? ''])) } : initial);
    setShowForm(true); setMessage(''); setFailure('');
  };
  useEffect(() => { if (searchParams.get('nuevo') === '1' && writable) { start(); const next = new URLSearchParams(searchParams); next.delete('nuevo'); setSearchParams(next, { replace: true }); } }, [searchParams, writable]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(''); setFailure('');
    const payload = Object.fromEntries(fields.filter((field) => (!field.onlyCreate || !editing) && (!field.onlyEdit || editing)).map((field) => {
      let value = form[field.name];
      if (value === '' || value === undefined) value = null;
      if (field.numeric && value !== null) value = Number(value);
      if (field.boolean) value = value === true || value === 'true';
      return [field.name, value];
    }));
    try {
      if (editing) await api.patch(`${path.replace(/\/$/, '')}/${editing.id}`, payload);
      else await api.post(path, payload);
      setShowForm(false); setMessage('Información guardada correctamente.'); list.reload();
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const allColumns = [...columns];
  if (editable || actions) allColumns.push({ key: 'acciones', label: 'Acciones', render: (row) => <div className="row-actions">{(typeof editable === 'function' ? editable(row) : editable) && <button onClick={() => start(row)}>Editar</button>}{actions?.(row, list.reload, setMessage, setFailure)}</div> });
  return <Page title={title} action={writable && <button onClick={() => start()}>Agregar</button>}>
    <Notice message={message} /><Notice message={failure} error />
    {showForm && <section className="panel"><h2>{editing ? 'Editar información' : 'Nuevo registro'}</h2><form onSubmit={save}><div className="form-grid">
      {fields.filter((field) => (!field.onlyCreate || !editing) && (!field.onlyEdit || editing)).map(({ numeric, boolean, onlyCreate, onlyEdit, ...field }) => <Field key={field.name} {...field} value={form[field.name]} onChange={change} />)}
    </div><div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" onClick={() => setShowForm(false)} disabled={busy}>Cancelar</button></div></form></section>}
    <section className="panel">{searchable && <form className="toolbar" onSubmit={event => { event.preventDefault(); setSearchParams(search ? { q: search } : {}); }}><label>Buscar por nombre<input name="buscar_persona" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /></label><button className="primary">Buscar</button><button type="button" onClick={() => { setSearch(''); setSearchParams({}); }}>Limpiar búsqueda</button></form>}<div className="toolbar"><button onClick={list.reload}><Icon name="refresh" size={16} />Actualizar</button><button disabled={list.loading || !list.rows.length} onClick={() => exportCsv(list.rows, columns, `${title.toLowerCase().replaceAll(" ", "-")}.csv`)}><Icon name="download" size={16} />Exportar página</button><span className="hint">{list.rows.length} registros en esta página</span></div><Table columns={allColumns} {...list} /><Pagination list={list} /></section>
  </Page>;
}

export function PersonasPage() {
  const { usuario, canWrite } = useAuth();
  const catalogs = useCatalogs();
  const [viewing, setViewing] = useState(null);
  const fields = [
    { name: 'nombres', label: 'Nombres', required: true, maxLength: 200 }, { name: 'apellidos', label: 'Apellidos', required: true, maxLength: 200 },
    { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' }, { name: 'lugar_nacimiento', label: 'Lugar de nacimiento', maxLength: 200 },
    { name: 'numero_identificacion', label: 'Identificación', maxLength: 50 }, { name: 'telefono', label: 'Teléfono', maxLength: 50 }, { name: 'email', label: 'Correo electrónico', type: 'email', maxLength: 254 },
    { name: 'parroquia_id', label: 'Parroquia', required: true, numeric: true, options: parishOptions(catalogs.parroquias).filter((item) => usuario.rol === 'administrador' || item.value === usuario.parroquia_id) },
  ];
  return <><Notice message={catalogs.error} error /><EntityPage title="Personas" path="/personas/" fields={fields} searchable writable={canWrite} actions={row => <button onClick={() => setViewing(row)}>Ver detalles</button>} initial={{ parroquia_id: usuario.parroquia_id || '' }} columns={[
    { key: 'nombres', label: 'Nombres' }, { key: 'apellidos', label: 'Apellidos' }, { key: 'numero_identificacion', label: 'Identificación' }, { key: 'fecha_nacimiento', label: 'Nacimiento', render: row => row.fecha_nacimiento ? date(row.fecha_nacimiento) : 'No registrada' },
  ]} />{viewing && <PersonDetail row={viewing} parish={catalogs.parroquias.find(p => p.id === viewing.parroquia_id)?.nombre} onClose={() => setViewing(null)} />}</>;
}

export function ParroquiasPage() { return <ParishDirectory />; }

export function UsuariosPage() {
  const { usuario, canManage, globalRead } = useAuth();
  const catalogs = useCatalogs();
  const [reset, setReset] = useState(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  if (!canManage) return <Page title="Usuarios"><Notice message="No tiene permiso para administrar usuarios." error /></Page>;
  const fields = [
    { name: 'nombre', label: 'Nombre', required: true, minLength: 2, maxLength: 200 }, { name: 'email', label: 'Correo electrónico', type: 'email', required: true, maxLength: 254, onlyCreate: true },
    { name: 'password', label: 'Contraseña inicial (mínimo 8 caracteres)', type: 'password', minLength: 8, maxLength: 72, required: true, onlyCreate: true, autoComplete: 'new-password' },
    { name: 'rol', label: 'Rol', required: true, options: (usuario.rol === 'administrador' ? ROLES : ['secretario_parroquial', 'consulta']).map((role) => ({ value: role, label: ROL_LABELS[role] })) },
    { name: 'parroquia_id', label: 'Parroquia (no aplica a roles diocesanos)', numeric: true, options: parishOptions(catalogs.parroquias).filter((item) => globalRead || usuario.rol === 'administrador' || item.value === usuario.parroquia_id) },
    { name: 'activo', label: 'Estado', boolean: true, onlyEdit: true, options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }] },
  ];
  const restore = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    try { await api.post(`/usuarios/${reset.id}/restablecer`, { password }); setReset(null); setPassword(''); setMessage('Contraseña restablecida. Comunique el acceso por un canal institucional seguro.'); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <><Notice message={message} /><Notice message={failure || catalogs.error} error />
    {reset && <section className="panel"><h2>Restablecer acceso de {reset.nombre}</h2><form onSubmit={restore} className="toolbar"><label>Nueva contraseña (mínimo 8 caracteres)<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" /></label><button className="primary" disabled={busy}>Restablecer contraseña</button><button type="button" onClick={() => setReset(null)}>Cancelar</button></form></section>}
    <EntityPage title="Administración de usuarios" path="/usuarios/" fields={fields} editable={(row) => usuario.rol === 'administrador' || ['secretario_parroquial', 'consulta'].includes(row.rol)} initial={{ activo: true, rol: 'consulta', parroquia_id: usuario.parroquia_id || '' }} columns={[
      { key: 'nombre', label: 'Nombre' }, { key: 'email', label: 'Correo' }, { key: 'rol', label: 'Rol', exportValue: row => ROL_LABELS[row.rol] || 'Rol no disponible', render: (row) => ROL_LABELS[row.rol] || 'Rol no disponible' }, { key: 'parroquia_id', label: 'Parroquia', exportValue: row => row.parroquia_id ? catalogs.parroquias.find(p => p.id === row.parroquia_id)?.nombre || 'No registrada' : 'Acceso diocesano', render: row => row.parroquia_id ? catalogs.parroquias.find(p => p.id === row.parroquia_id)?.nombre || 'No registrada' : 'Acceso diocesano' }, { key: 'activo', label: 'Estado', exportValue: row => row.activo ? 'Activo' : 'Inactivo', render: (row) => row.activo ? 'Activo' : 'Inactivo' },
    ]} actions={(row) => (usuario.rol === 'administrador' || ['secretario_parroquial', 'consulta'].includes(row.rol)) && <button onClick={() => { setReset(row); setPassword(''); }}>Restablecer acceso</button>} />
  </>;
}

export function SacramentosPage() {
  const list = useList('/sacramentos/');
  return <Page title="Catálogo de partidas"><section className="panel"><Table {...list} columns={[{ key: 'nombre', label: 'Tipo' }, { key: 'descripcion', label: 'Descripción' }]} /><Pagination list={list} /></section></Page>;
}

export function SolicitudesPage() {
  const { usuario, canWrite, canPrepareCert, globalRead } = useAuth();
  const catalogs = useCatalogs();
  const list = useList('/solicitudes/');
  const [query, setQuery] = useState({ parroquia_id: '', libro: '', folio: '', numero: '' });
  const [matches, setMatches] = useState([]);
  const [recordId, setRecordId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [originId, setOriginId] = useState('');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [viewing, setViewing] = useState(null);
  const [prepared, setPrepared] = useState({});
  const search = async (event) => {
    event.preventDefault(); setBusy(true); setFailure('');
    setRecordId(''); setMatches([]);
    try { const response = await api.get('/registros/buscar', { params: query }); setMatches(response.data); if (!response.data.length) setMessage('No se encontró una partida con esa referencia.'); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    try { await api.post('/solicitudes/', { registro_id: Number(recordId), motivo, ...(globalRead ? { origen_id: Number(originId) } : {}) }); setRecordId(''); setMotivo(''); setMessage('Solicitud enviada a la parroquia custodiante.'); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const decide = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    try { await api.post(`/solicitudes/${decision.row.id}/decision`, { estado: decision.estado, motivo: decisionReason }); setDecision(null); setDecisionReason(''); setMessage('Decisión registrada en la solicitud y en auditoría.'); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const issue = async (row) => {
    setBusy(true); setFailure(''); setMessage('');
    try { const response = await api.post('/certificados/', { registro_id: row.registro_id, solicitud_id: row.id }); setPrepared(current => ({ ...current, [row.id]: response.data })); setMessage(response.data.reutilizado ? `El certificado ${response.data.numero} ya está preparado. Continúe en Certificados.` : `Certificado ${response.data.numero} preparado. Continúe la autorización y firma en Certificados.`); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const parish = (id) => catalogs.parroquias.find((item) => item.id === id)?.nombre || 'Parroquia no disponible';
  return <Page title="Solicitudes entre parroquias" description="La parroquia custodiante revisa cada solicitud y autoriza la entrega documental.">
    <Notice message={message} /><Notice message={failure || catalogs.error} error />
    {canPrepareCert && <section className="panel"><h2>Nueva solicitud</h2><form className="toolbar" onSubmit={search}>
      {globalRead && <Field name="origen_id" label="Parroquia solicitante" value={originId} onChange={(_, value) => { setOriginId(value); setRecordId(''); }} required options={parishOptions(catalogs.parroquias)} />}
      <Field name="parroquia_id" label="Parroquia custodiante" value={query.parroquia_id} onChange={(name, value) => setQuery({ ...query, [name]: value })} required options={parishOptions(catalogs.parroquias).filter((item) => item.value !== usuario.parroquia_id)} />
      {['libro', 'folio', 'numero'].map((name) => <Field key={name} name={name} label={{ libro: 'Libro', folio: 'Folio', numero: 'Número de partida' }[name]} value={query[name]} onChange={(key, value) => setQuery({ ...query, [key]: value })} required maxLength={name === 'libro' ? 100 : 50} />)}
      <button disabled={busy}>Buscar referencia</button></form>
      <p className="hint">Los resultados externos muestran solo referencias de custodia. Los datos personales se entregan cuando la solicitud es aprobada.</p>
      <form onSubmit={create}><div className="form-grid"><Field name="registro_id" label="Referencia de la partida" value={recordId} onChange={(_, value) => setRecordId(value)} required options={matches.filter((row) => row.parroquia_id !== Number(globalRead ? originId : usuario.parroquia_id)).map((row) => ({ value: row.id, label: `${parish(row.parroquia_id)} · libro ${row.libro} · folio ${row.folio} · partida ${row.numero} · #${row.id}` }))} />
        <Field name="motivo" label="Motivo institucional" type="textarea" value={motivo} onChange={(_, value) => setMotivo(value)} required minLength={5} maxLength={1000} /></div><div className="form-actions"><button className="primary" disabled={busy || !recordId || (globalRead && !originId)}>Enviar solicitud</button></div></form>
    </section>}
    {decision && <section className="panel"><h2>{decision.estado === 'aprobada' ? 'Aprobar' : 'Rechazar'} solicitud #{decision.row.id}</h2><form onSubmit={decide}><Field name="motivo" label="Motivo de la decisión" type="textarea" value={decisionReason} onChange={(_, value) => setDecisionReason(value)} required minLength={5} maxLength={1000} /><div className="form-actions"><button className="primary" disabled={busy}>Confirmar decisión</button><button type="button" onClick={() => setDecision(null)}>Cancelar</button></div></form></section>}
    <section className="panel"><div className="toolbar"><button onClick={list.reload}>Actualizar solicitudes</button></div><Table {...list} columns={[
      { key: 'id', label: 'Solicitud' }, { key: 'referencia', label: 'Partida', render: row => recordReference(row.referencia) }, { key: 'origen_id', label: 'Origen', render: (row) => row.parroquia_origen || parish(row.origen_id) }, { key: 'destino_id', label: 'Custodiante', render: (row) => row.parroquia_destino || parish(row.destino_id) },
      { key: 'estado', label: 'Estado', render: (row) => <span className="badge">{state(row.estado)}</span> }, { key: 'fecha_creacion', label: 'Creación', render: row => date(row.fecha_creacion, true) }, { key: 'responsable_id', label: 'Responsable de decisión', render: row => actor(row.responsable) }, { key: 'fecha_decision', label: 'Fecha de decisión', render: row => date(row.fecha_decision, true) },
      { key: 'acciones', label: 'Acciones', render: (row) => <div className="row-actions"><button onClick={() => setViewing(row)}>Ver solicitud</button>
        {row.estado === 'pendiente' && canWrite && (usuario.rol === 'administrador' || usuario.parroquia_id === row.destino_id) && <><button onClick={() => { setDecision({ row, estado: 'aprobada' }); setDecisionReason(''); }}>Aprobar</button><button className="danger" onClick={() => { setDecision({ row, estado: 'rechazada' }); setDecisionReason(''); }}>Rechazar</button></>}
        {(prepared[row.id] || row.certificado) ? <Link to={`/certificados?certificado=${(prepared[row.id] || row.certificado).id}`}>Continuar certificado</Link> : row.estado === 'aprobada' && canPrepareCert && (globalRead || usuario.parroquia_id === row.destino_id) ? <button disabled={busy} onClick={() => issue(row)}>Preparar certificado</button> : <span className="hint">{row.estado === 'pendiente' ? 'Requiere decisión de la parroquia custodiante.' : row.estado === 'rechazada' ? 'Solicitud rechazada: no puede prepararse un certificado.' : !canPrepareCert ? 'Su rol no tiene permiso para preparar certificados.' : 'La parroquia custodiante debe preparar el certificado.'}</span>}
        {row.estado === 'aprobada' && usuario.parroquia_id === row.origen_id && <Link to="/certificados">Consultar entrega</Link>}</div> },
    ]} /><Pagination list={list} /></section>
    {viewing && <RequestDetail id={viewing.id} onClose={() => setViewing(null)} />}
  </Page>;
}

export function CertificadosPage({ approvals = false }) {
  const { usuario, canPrepareCert, canAuthorizeCert, canApproveCuria, canSignCert } = useAuth();
  const [searchParams] = useSearchParams();
  const list = useList('/certificados/', searchParams.get('certificado') ? { certificado_id: searchParams.get('certificado') } : {});
  const [recordId, setRecordId] = useState('');
  const [requestId, setRequestId] = useState('');
  const requests = useList('/solicitudes/', { registro_id: recordId, estado: 'aprobada' }, Boolean(canPrepareCert && recordId));
  const [curia, setCuria] = useState(false);
  const [curiaReason, setCuriaReason] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [viewing, setViewing] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const issue = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    try { const response = await api.post('/certificados/', { registro_id: Number(recordId), ...(requestId ? { solicitud_id: Number(requestId) } : {}), requiere_aprobacion_curia: curia, ...(curia ? { motivo_curia: curiaReason } : {}) }); setMessage(`Certificado ${response.data.numero} preparado. Requiere autorización y firma antes de descargarlo.`); setRecordId(''); setRequestId(''); setCuria(false); setCuriaReason(''); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const download = async (row) => {
    setFailure(''); setBusy(true);
    try { await downloadFile(`/certificados/${row.id}/pdf`, `${row.numero}.pdf`); setMessage('Documento descargado correctamente.'); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const actOnCertificate = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    try {
      await api.post(`/certificados/${action.row.id}/${action.path}`, { motivo: reason });
      setMessage(`Actuación «${action.label}» registrada para ${action.row.numero}.`);
      setAction(null); setReason(''); list.reload();
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const startAction = (row, path, label) => { setAction({ row, path, label }); setReason(''); setFailure(''); setMessage(''); };
  const owns = (row) => row.parroquia_id != null && row.parroquia_id === usuario.parroquia_id;
  return <Page title={approvals ? 'Aprobaciones y firma' : 'Certificados'} description="Preparación → autorización del párroco → aprobación de Curia cuando corresponda → firma → entrega.">
    <Notice message={message} /><Notice message={failure} error />
    {!approvals && canPrepareCert && <section className="panel"><h2>Preparar certificado</h2><form onSubmit={issue}><div className="form-grid"><RecordPicker value={recordId} onChange={value => { setRecordId(value); setRequestId(''); }} /><Field name="solicitud_id" label="Solicitud aprobada vinculada (opcional)" value={requestId} disabled={!recordId || requests.loading} onChange={(_, value) => setRequestId(value)} options={requests.rows.map(row => ({ value: row.id, label: `${row.parroquia_origen || 'Parroquia solicitante'} · ${row.motivo}` }))} />
      <Notice message={requests.error} error />
      <label><input type="checkbox" name="requiere_aprobacion_curia" checked={curia} onChange={(event) => setCuria(event.target.checked)} />Requiere aprobación de la Curia</label>
      {curia && <Field name="motivo_curia" label="Motivo de competencia de la Curia" type="textarea" value={curiaReason} onChange={(_, value) => setCuriaReason(value)} required maxLength={1000} />}</div><div className="form-actions"><button className="primary" disabled={busy}>Preparar certificado</button></div></form>
      <p className="hint">El PDF conserva el asiento al preparar el certificado. Solo se entrega después de la firma. El administrador prepara; el párroco custodio autoriza; el canciller aprueba y firma los trámites de Curia.</p></section>}
    {action && <section className="panel"><h2>{action.label} · {action.row.numero}</h2><form id="certificate-action-form" onSubmit={actOnCertificate}><Field name="motivo_actuacion" label="Motivo de la actuación" type="textarea" value={reason} onChange={(_, value) => setReason(value)} required maxLength={1000} /><div className="form-actions"><button className="primary" disabled={busy}>Confirmar actuación</button><button type="button" disabled={busy} onClick={() => setAction(null)}>Cancelar</button></div></form></section>}
    <section className="panel"><div className="toolbar"><button onClick={list.reload}>Actualizar certificados</button></div><Table {...list} columns={[
      { key: 'numero', label: 'Número' }, { key: 'referencia', label: 'Partida', render: row => recordReference(row.referencia) }, { key: 'parroquia', label: 'Custodia', render: row => row.parroquia || 'No registrada' }, { key: 'solicitud_id', label: 'Solicitud', render: row => row.solicitud_id ? 'Trámite entre parroquias' : 'Trámite de la parroquia' }, { key: 'estado', label: 'Estado', render: row => state(row.estado) }, { key: 'requiere_aprobacion_curia', label: 'Curia', render: (row) => row.requiere_aprobacion_curia ? 'Sí' : 'No' }, { key: 'fecha_emision', label: 'Preparación', render: row => date(row.fecha_emision, true) },
      { key: 'acciones', label: 'Acciones', render: (row) => <div className="row-actions">
        <button onClick={() => setViewing(row)}>Ver trazabilidad</button>
        {canAuthorizeCert && owns(row) && row.estado === 'preparado' && <button disabled={busy} onClick={() => startAction(row, 'autorizar', 'Autorizar')}>Autorizar</button>}
        {canApproveCuria && row.requiere_aprobacion_curia && row.estado === 'autorizado' && <button disabled={busy} onClick={() => startAction(row, 'aprobar-curia', 'Aprobar en Curia')}>Aprobar en Curia</button>}
        {canSignCert && ((usuario.rol === 'parroco' && owns(row) && !row.requiere_aprobacion_curia && row.estado === 'autorizado') || (usuario.rol === 'canciller' && row.requiere_aprobacion_curia && row.estado === 'aprobado_curia')) && <button disabled={busy} onClick={() => startAction(row, 'firmar', 'Firmar')}>Firmar</button>}
        {canSignCert && (usuario.rol === 'canciller' || owns(row)) && row.estado !== 'anulado' && <button className="danger" disabled={busy} onClick={() => startAction(row, 'anular', 'Anular')}>Anular</button>}
        {row.estado === 'firmado' && <button disabled={busy} onClick={() => download(row)}>Descargar PDF</button>}
        <span className="hint">{row.estado === 'anulado' ? 'Anulado: no puede entregarse.' : row.estado === 'firmado' ? 'Documento disponible para entrega autorizada.' : row.estado === 'preparado' ? 'Pendiente de autorización del párroco custodio.' : row.requiere_aprobacion_curia && row.estado === 'autorizado' ? 'Pendiente de aprobación y firma del canciller.' : 'Pendiente de firma del cargo autorizado.'}</span>
        <Link to={`/verificar/${row.codigo_verificacion}`} target="_blank" rel="noopener noreferrer">Verificar autenticidad</Link></div> },
    ]} /><Pagination list={list} /></section>
    {viewing && <CertificateTrace id={viewing.id} onClose={() => setViewing(null)} />}
  </Page>;
}

export function DocumentosPage() {
  const { canWrite } = useAuth();
  const list = useList('/documentos/');
  const [recordId, setRecordId] = useState('');
  const [type, setType] = useState('acta');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const upload = async (event) => {
    event.preventDefault(); setFailure(''); setMessage('');
    if (!file) { setFailure('Seleccione un archivo PDF.'); return; }
    const form = event.currentTarget;
    const data = new FormData(); data.append('archivo', file);
    setBusy(true);
    try { await api.post('/documentos/', data, { params: { registro_id: Number(recordId), tipo_documento: type } }); setMessage('Documento almacenado y vinculado a la partida.'); setFile(null); setRecordId(''); form.reset(); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const download = async (row) => {
    setFailure(''); setBusy(true);
    try { await downloadFile(`/documentos/${row.id}/descargar`, row.nombre_archivo); setMessage('Documento descargado.'); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <Page title="Gestión documental" description="Archivos PDF custodiados y vinculados a los asientos sacramentales.">
    <Notice message={message} /><Notice message={failure} error />
    {canWrite && <section className="panel"><form onSubmit={upload}><div className="form-grid"><RecordPicker value={recordId} onChange={setRecordId} />
      <Field name="tipo_documento" label="Tipo documental" value={type} onChange={(_, value) => setType(value)} required options={['acta', 'partida', 'soporte'].map((value) => ({ value, label: value }))} />
      <label>Archivo PDF *<input type="file" name="archivo" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files[0])} required /></label></div><div className="form-actions"><button className="primary" disabled={busy}>Subir documento</button></div></form></section>}
    <section className="panel"><button onClick={list.reload}>Actualizar documentos</button><Table {...list} columns={[
      { key: 'nombre_archivo', label: 'Nombre' }, { key: 'referencia', label: 'Partida', render: row => recordReference(row.referencia) }, { key: 'tipo_documento', label: 'Tipo', render: row => ({ acta: 'Acta', partida: 'Partida', soporte: 'Soporte' }[row.tipo_documento] || row.tipo_documento) }, { key: 'fecha_subida', label: 'Fecha', render: row => date(row.fecha_subida, true) },
      { key: 'acciones', label: 'Acciones', render: (row) => <button disabled={busy} onClick={() => download(row)}>Descargar PDF</button> },
    ]} /><Pagination list={list} /></section>
  </Page>;
}

export function AuditoriaPage() {
  const { canAudit } = useAuth();
  const list = useList('/auditoria/', {}, canAudit);
  if (!canAudit) return <Page title="Auditoría"><Notice message="No tiene permiso para consultar auditoría." error /></Page>;
  return <Page title="Auditoría" description="Eventos del servidor con usuario, recurso, fecha y resultado."><section className="panel"><button onClick={list.reload}>Actualizar auditoría</button><Table {...list} columns={[
    { key: 'fecha', label: 'Fecha', render: row => date(row.fecha, true) }, { key: 'usuario_id', label: 'Responsable', render: row => actor(row.responsable) }, { key: 'accion', label: 'Evento', render: row => auditAction(row.accion) }, { key: 'entidad', label: 'Área', render: row => auditArea(row.entidad) }, { key: 'parroquia', label: 'Parroquia' }, { key: 'detalle', label: 'Motivo / resultado', render: auditDetail },
  ]} /><Pagination list={list} /></section></Page>;
}

export function ReportesPage({ home = false }) { return <Overview home={home} />; }

export function ConfiguracionPage() {
  const { logout } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const changePassword = async (event) => {
    event.preventDefault(); setFailure(''); setMessage('');
    if (nueva !== confirmation) { setFailure('Las contraseñas nuevas no coinciden.'); return; }
    setBusy(true);
    try { await api.post('/auth/change-password', { actual, nueva }); setActual(''); setNueva(''); setConfirmation(''); await logout({ revoked: true }); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <><Page title="Configuración" description="Cuenta institucional y libros de custodia."><Notice message={message} /><Notice message={failure} error /><section className="panel"><h2>Cambiar contraseña</h2><form onSubmit={changePassword}><div className="form-grid">
    <Field name="actual" label="Contraseña actual" value={actual} onChange={(_, value) => setActual(value)} type="password" required autoComplete="current-password" maxLength={72} />
    <Field name="nueva" label="Nueva contraseña (mínimo 8 caracteres)" value={nueva} onChange={(_, value) => setNueva(value)} type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
    <Field name="confirmation" label="Confirmar contraseña" value={confirmation} onChange={(_, value) => setConfirmation(value)} type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
  </div><div className="form-actions"><button className="primary" disabled={busy}>Cambiar contraseña</button></div></form></section></Page>
    <LibrosPage />
  </>;
}

export function LibrosPage() {
  const { usuario, canWrite } = useAuth();
  const catalogs = useCatalogs();
  return <><Notice message={catalogs.error} error /><EntityPage title="Libros sacramentales" path="/libros/" writable={canWrite} editable={false} initial={{ parroquia_id: usuario.parroquia_id || '' }} fields={[
      { name: 'parroquia_id', label: 'Parroquia', numeric: true, required: true, options: parishOptions(catalogs.parroquias).filter((item) => usuario.rol === 'administrador' || item.value === usuario.parroquia_id) },
      { name: 'sacramento_id', label: 'Tipo de partida', numeric: true, required: true, options: catalogs.sacramentos.map((item) => ({ value: item.id, label: item.nombre })) },
      { name: 'numero', label: 'Número / referencia del libro', required: true, maxLength: 100 },
    ]} columns={[{ key: 'parroquia_id', label: 'Parroquia', exportValue: row => catalogs.parroquias.find(p => p.id === row.parroquia_id)?.nombre || 'No registrada', render: row => catalogs.parroquias.find(p => p.id === row.parroquia_id)?.nombre || 'No registrada' }, { key: 'sacramento_id', label: 'Tipo', exportValue: row => catalogs.sacramentos.find(s => s.id === row.sacramento_id)?.nombre || 'No registrado', render: row => catalogs.sacramentos.find(s => s.id === row.sacramento_id)?.nombre || 'No registrado' }, { key: 'numero', label: 'Libro' }]} />
  </>;
}

export function Verificacion() {
  const { codigo } = useParams();
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    let active = true; setResult(null); setFailure('');
    api.get(`/certificados/verificar/${encodeURIComponent(codigo)}`).then(({ data }) => { if (active) setResult(data); }).catch((error) => { if (active) setFailure(errorMessage(error)); });
    return () => { active = false; };
  }, [codigo]);
  return <main className="public-page"><Page title="Verificación de certificado" description="Diócesis de Tibú"><section className="panel"><Notice message={failure} error />
    {!result && !failure && <p role="status">Verificando código…</p>}
    {result && <><p className={`notice ${result.valido ? 'success' : 'error'}`} role="status">{result.valido ? 'Certificado registrado y válido.' : 'Certificado no válido.'}</p>{result.valido && <dl className="detail-grid"><dt>Número</dt><dd>{result.numero}</dd><dt>Expedición</dt><dd>{date(result.fecha_emision, true)}</dd><dt>Parroquia</dt><dd>{result.parroquia}</dd></dl>}<p className="hint">Por confidencialidad, esta consulta no revela nombres ni datos sacramentales. La autenticidad del contenido se contrasta con el documento expedido.</p></>}
    <Link to="/login">Acceso institucional</Link></section></Page></main>;
}

export { default as RespaldosPage } from './BackupCenter';
export { default as RolesPage } from './RolePermissions';
