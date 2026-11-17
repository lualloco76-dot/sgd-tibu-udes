import React, { useEffect, useState } from 'react';
import api, { downloadFile, errorMessage } from '../api/axiosConfig';
import { Notice, Page, Pagination, Table, useList } from './shared/ConnectedUI';
import Icon from './shared/Icon';

const date = (value) => value ? new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : 'Sin programar';
const bytes = (value) => value == null ? '—' : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
const states = { en_curso: 'En curso', completado: 'Completado', fallido: 'Fallido' };

export default function BackupCenter() {
  const list = useList('/respaldos/');
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({ frecuencia: 'manual', hora: 2 });
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = () => { list.reload(); setRevision((value) => value + 1); };
  useEffect(() => {
    let active = true;
    api.get('/respaldos/configuracion').then(({ data }) => { if (active) { setConfig(data); setForm({ frecuencia: data.frecuencia, hora: data.hora }); } })
      .catch((error) => { if (active) setFailure(errorMessage(error)); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!list.rows.length) return undefined;
    let active = true;
    api.get('/respaldos/configuracion').then(({ data }) => { if (active) setConfig(data); })
      .catch((error) => { if (active) setFailure(errorMessage(error)); });
    return () => { active = false; };
  }, [list.rows[0]?.id, list.rows[0]?.estado]);
  const running = config?.en_curso || list.rows.some((row) => row.estado === 'en_curso');
  useEffect(() => {
    const interval = window.setInterval(() => { list.reload(); }, running ? 3000 : 30000);
    return () => window.clearInterval(interval);
  }, [running, list.reload]);
  const act = async (key, action, success) => {
    setBusy(key); setFailure(''); setMessage('');
    try { await action(); setMessage(success); list.reload(); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(''); }
  };
  const create = () => act('create', async () => {
    await api.post('/respaldos/');
  }, 'Respaldo solicitado. El historial mostrará el resultado cuando termine.');
  const saveSchedule = (event) => {
    event.preventDefault();
    act('schedule', async () => {
      const { data } = await api.patch('/respaldos/configuracion', { ...form, hora: Number(form.hora) });
      setConfig((current) => ({ ...current, ...data }));
    }, 'Programación guardada correctamente.');
  };
  const latest = config?.ultimo_respaldo;
  return <Page title="Centro de respaldos" description="Protege el archivo diocesano con copias completas y verificadas." action={<button className="primary" disabled={Boolean(busy) || running || !config?.herramienta_disponible} onClick={create}><Icon name="plus" size={17} /> {busy === 'create' || running ? 'Respaldo en curso…' : 'Crear respaldo'}</button>}>
    <Notice message={message} /><Notice message={failure} error />
    <div className="admin-context"><span><Icon name="shield" size={18} /> Custodia y recuperación</span><button onClick={refresh} disabled={Boolean(busy)}><Icon name="refresh" size={15} /> Actualizar</button></div>
    <div className="backup-metrics">
      <article className="panel"><Icon name="clock" /><span>Última copia completada</span><strong>{latest ? date(latest.terminado) : !config ? 'Cargando…' : 'Sin copias completadas'}</strong><small>{latest ? `${bytes(latest.tamano)} · Integridad verificada` : 'Crea una copia para proteger tus datos'}</small></article>
      <article className="panel"><Icon name="refresh" /><span>Próxima copia automática</span><strong>{config ? date(config.proximo) : 'Cargando…'}</strong><small>Hora de Colombia · El servidor debe estar encendido</small></article>
      <article className="panel"><Icon name="document" /><span>Contenido del respaldo</span><strong>Base de datos + documentos</strong><small>Archivo ZIP con manifiesto y comprobación SHA-256</small></article>
    </div>
    {config && !config.herramienta_disponible && <Notice error message="Para crear copias de PostgreSQL, instale pg_dump en el servidor y configure PG_DUMP_PATH. Después, pulse Actualizar." />}
    <div className="backup-layout">
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">Automatización</span><h2>Programa tus copias</h2></div><Icon name="clock" /></div>
        {!config ? <p role="status">Cargando configuración…</p> : <form onSubmit={saveSchedule} className="backup-schedule">
          <label>Frecuencia<select name="frecuencia" value={form.frecuencia} disabled={Boolean(busy)} onChange={(event) => setForm({ ...form, frecuencia: event.target.value })}><option value="manual">Solo manual</option><option value="diario">Todos los días</option><option value="semanal">Cada domingo</option></select></label>
          <label>Hora de Colombia<select name="hora" value={form.hora} disabled={Boolean(busy) || form.frecuencia === 'manual'} onChange={(event) => setForm({ ...form, hora: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
          <p className="hint">Si el servidor estaba apagado, la copia pendiente se ejecutará al volver a estar disponible.</p>
          {!config.programador_activo && <p className="hint">El programador está deshabilitado en este servidor.</p>}
          <button type="submit" className="primary" disabled={Boolean(busy) || (form.frecuencia === config.frecuencia && Number(form.hora) === config.hora)}>{busy === 'schedule' ? 'Guardando…' : 'Guardar programación'}</button>
        </form>}
      </section>
      <section className="panel backup-guidance"><span className="permission-symbol"><Icon name="shield" size={25} /></span><span className="eyebrow">Un archivo protegido</span><h2>Una copia lista para custodiar</h2><p>Cada respaldo incluye la base de datos, los documentos registrados y una guía para recuperar la información.</p><ol><li>Crea una copia o activa una programación.</li><li>Verifica su integridad desde el historial.</li><li>Descárgala y guárdala en otro equipo o unidad segura.</li></ol><div className="admin-callout"><Icon name="lock" size={18} /><p>Las copias contienen información privada. Prueba la restauración en una base de pruebas antes de recuperar el sistema.</p></div></section>
    </div>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Trazabilidad</span><h2>Historial de respaldos</h2></div><span className="badge">{running ? 'Copia en curso' : 'Copias del servidor'}</span></div>
      <Table rows={list.rows} loading={list.loading} error={list.error} empty="Todavía no hay respaldos. Crea la primera copia con el botón superior." columns={[
        { key: 'creado', label: 'Copia', render: (row) => <div className="backup-reference"><strong>{date(row.creado)}</strong><small title={row.sha256 || row.id}>{row.sha256 ? `SHA-256 · ${row.sha256.slice(0, 16)}…` : row.id.slice(0, 12)}</small></div> },
        { key: 'origen', label: 'Origen', render: (row) => row.origen === 'manual' ? 'Manual' : 'Automático' },
        { key: 'estado', label: 'Estado', render: (row) => <><span className={`backup-state ${row.estado}`}>{states[row.estado] || row.estado}</span>{row.error && <small className="backup-error">{row.error}</small>}</> },
        { key: 'tamano', label: 'Tamaño', render: (row) => bytes(row.tamano) },
        { key: 'verificado', label: 'Última verificación', render: (row) => row.verificado ? date(row.verificado) : '—' },
        { key: 'actions', label: 'Acciones', render: (row) => row.estado === 'completado' && <div className="row-actions"><button disabled={Boolean(busy)} onClick={() => act(`verify-${row.id}`, () => api.post(`/respaldos/${row.id}/verificar`, null, { timeout: 0 }), 'Integridad del respaldo verificada correctamente.')}><Icon name="shield" size={14} />{busy === `verify-${row.id}` ? 'Verificando…' : 'Verificar'}</button><button disabled={Boolean(busy)} onClick={() => act(`download-${row.id}`, () => downloadFile(`/respaldos/${row.id}/descargar`, `respaldo-sgd-${row.id}.zip`, { timeout: 0 }), 'Descarga del respaldo iniciada.')}><Icon name="download" size={14} />{busy === `download-${row.id}` ? 'Descargando…' : 'Descargar'}</button></div> },
      ]} /><Pagination list={list} />
    </section>
  </Page>;
}
