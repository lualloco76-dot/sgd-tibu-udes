import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from './shared/Icon';
import { exportCsv } from './shared/exportCsv';
import api, { errorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Field, Notice, Page, Pagination, Table, parishOptions, useCatalogs, useList } from './shared/ConnectedUI';
import { RecordDetail, RecordHistory, date } from './shared/DocumentDetails';

const emptyRecord = { persona_id: '', sacramento_id: '', parroquia_id: '', fecha_celebracion: '', lugar: '', ministro: '', libro: '', folio: '', numero: '', notas: '' };
const sacramentalFields = {
  Bautismo: [['padre', 'Nombre del padre'], ['madre', 'Nombre de la madre'], ['padrino', 'Padrino'], ['madrina', 'Madrina']],
  Confirmación: [['padrino', 'Padrino'], ['madrina', 'Madrina'], ['referencia_bautismo', 'Referencia del bautismo']],
  Matrimonio: [['conyuge_persona_id', 'ID de la otra persona contrayente'], ['testigo_1', 'Primer testigo'], ['testigo_2', 'Segundo testigo']],
  Defunción: [['fecha_defuncion', 'Fecha de defunción'], ['causa', 'Causa consignada'], ['lugar_sepultura', 'Lugar de sepultura']],
};
export default function ConnectedRecords({ tipo }) {
  const { usuario, canWrite, globalRead } = useAuth();
  const catalogs = useCatalogs();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = () => Object.fromEntries(['q', 'libro', 'folio', 'numero', 'parroquia_id', 'desde', 'hasta'].map((key) => [key, searchParams.get(key)]).filter(([, value]) => value));
  const [filters, setFilters] = useState({ q: '', libro: '', folio: '', numero: '', parroquia_id: '', desde: '', hasta: '' });
  const [query, setQuery] = useState(urlQuery);
  const sacrament = catalogs.sacramentos.find((item) => item.nombre === tipo);
  const list = useList('/registros/', { ...query, ...(sacrament ? { sacramento_id: sacrament.id } : {}) }, !tipo || Boolean(sacrament));
  const [form, setForm] = useState(emptyRecord);
  const [datos, setDatos] = useState({});
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [reason, setReason] = useState('');
  const [recordAction, setRecordAction] = useState(null);
  const [actionFields, setActionFields] = useState({ texto: '', parroquia_id: '', motivo: '' });
  const isCustodian = (row) => usuario.rol === 'administrador' || (row.parroquia_id != null && row.parroquia_id === usuario.parroquia_id);
  const change = (name, value) => {
    setForm((current) => ({ ...current, [name]: value,
      ...(name === 'parroquia_id' ? { persona_id: '', libro: '' } : {}),
      ...(name === 'sacramento_id' ? { libro: '' } : {}),
    }));
    if (['parroquia_id', 'sacramento_id'].includes(name)) setDatos({});
  };
  const selectedType = tipo || catalogs.sacramentos.find((item) => item.id === Number(form.sacramento_id))?.nombre;
  const start = (row = null) => {
    setEditing(row); setFailure(''); setMessage(''); setReason(''); setRecordAction(null);
    setForm(row ? Object.fromEntries(Object.keys(emptyRecord).map((key) => [key, row[key] ?? ''])) : { ...emptyRecord, parroquia_id: usuario.parroquia_id || '', sacramento_id: sacrament?.id || '' });
    setDatos(row?.datos || {}); setShowForm(true);
  };
  useEffect(() => { const values = urlQuery(); setQuery(values); setFilters({ q: '', libro: '', folio: '', numero: '', parroquia_id: '', desde: '', hasta: '', ...values }); }, [searchParams]);
  useEffect(() => { if (searchParams.get('nuevo') === '1' && canWrite && (!tipo || sacrament)) { start(); const next = new URLSearchParams(searchParams); next.delete('nuevo'); setSearchParams(next, { replace: true }); } }, [searchParams, canWrite, sacrament?.id]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    const payload = { ...form, persona_id: Number(form.persona_id), sacramento_id: Number(sacrament?.id || form.sacramento_id), parroquia_id: Number(form.parroquia_id), datos: { ...datos } };
    if (payload.datos.conyuge_persona_id) payload.datos.conyuge_persona_id = Number(payload.datos.conyuge_persona_id);
    try {
      if (editing) await api.patch(`/registros/${editing.id}`, { ...payload, motivo: reason });
      else await api.post('/registros/', payload);
      setShowForm(false); setMessage(editing ? 'Corrección guardada. El historial conserva el asiento anterior.' : 'Partida registrada correctamente.'); list.reload();
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const history = (row) => { setFailure(''); setViewing({ kind: 'history', row }); };
  const startAction = (kind, row) => {
    setRecordAction({ kind, row }); setActionFields({ texto: '', parroquia_id: '', motivo: '' });
    setShowForm(false); setFailure(''); setMessage('');
  };
  const saveAction = async (event) => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('');
    const { kind, row } = recordAction;
    const payload = kind === 'notas' ? { texto: actionFields.texto, motivo: actionFields.motivo }
      : { parroquia_id: Number(actionFields.parroquia_id), motivo: actionFields.motivo };
    try {
      await api.post(`/registros/${row.id}/${kind}`, payload);
      setRecordAction(null); list.reload();
      setMessage(kind === 'notas' ? 'Nota marginal incorporada. El historial conserva la información anterior.' : 'Custodia histórica asignada y registrada en auditoría.');
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const columns = [
    { key: 'persona', label: 'Persona', exportValue: (row) => row.persona ? `${row.persona.nombres} ${row.persona.apellidos}` : 'Titular no disponible', render: (row) => row.persona ? `${row.persona.nombres} ${row.persona.apellidos}` : 'Titular no disponible' },
    { key: 'sacramento', label: 'Tipo', exportValue: (row) => row.sacramento?.nombre || 'No registrado', render: (row) => row.sacramento?.nombre || 'No registrado' },
    { key: 'fecha_celebracion', label: 'Fecha', render: row => date(row.fecha_celebracion) },
    { key: 'parroquia_id', label: 'Custodia', render: (row) => row.parroquia_id == null ? 'Sin asignar' : catalogs.parroquias.find((item) => item.id === row.parroquia_id)?.nombre || 'Parroquia no disponible' },
    { key: 'libro', label: 'Libro' }, { key: 'folio', label: 'Folio' }, { key: 'numero', label: 'Partida' },
    { key: 'acciones', label: 'Acciones', render: (row) => <div className="row-actions"><button onClick={() => setViewing({ kind: 'record', row })}>Ver</button><button onClick={() => history(row)}>Historial</button>
      {canWrite && isCustodian(row) && <><button disabled={busy} onClick={() => startAction('notas', row)}>Agregar nota marginal</button>{row.parroquia_id != null && <button disabled={busy} onClick={() => start(row)}>Corregir / nota</button>}</>}
      {usuario.rol === 'administrador' && row.parroquia_id === null && <button disabled={busy} onClick={() => startAction('custodia', row)}>Asignar custodia histórica</button>}
    </div> },
  ];
  return <Page title={tipo ? `Partidas de ${tipo.toLocaleLowerCase()}` : 'Consulta de partidas'} description="Custodia parroquial, referencias documentales e historial de correcciones." action={canWrite && <button onClick={() => start()}>Registrar partida</button>}>
    <Notice message={message} /><Notice message={failure || catalogs.error} error />
    {recordAction && <section className="panel"><h2>{recordAction.kind === 'notas' ? 'Agregar nota marginal' : 'Asignar custodia histórica'} · partida #{recordAction.row.id}</h2>
      <form id="record-action-form" onSubmit={saveAction}><div className="form-grid">
        {recordAction.kind === 'notas' ? <Field name="texto" label="Texto de la nota marginal" type="textarea" value={actionFields.texto} onChange={(name, value) => setActionFields({ ...actionFields, [name]: value })} required minLength={1} maxLength={5000} />
          : <Field name="parroquia_id" label="Parroquia custodiante" value={actionFields.parroquia_id} onChange={(name, value) => setActionFields({ ...actionFields, [name]: value })} required options={parishOptions(catalogs.parroquias)} />}
        <Field name="motivo" label="Motivo institucional" type="textarea" value={actionFields.motivo} onChange={(name, value) => setActionFields({ ...actionFields, [name]: value })} required minLength={5} maxLength={1000} />
      </div><p className="hint">{recordAction.kind === 'notas' ? 'La nota se añade a las notas existentes y queda registrada con su usuario y motivo.' : 'Esta asignación identifica la custodia de un asiento histórico sin parroquia. Confirme la referencia institucional antes de guardar.'}</p>
      <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : recordAction.kind === 'notas' ? 'Guardar nota marginal' : 'Guardar custodia'}</button><button type="button" disabled={busy} onClick={() => setRecordAction(null)}>Cancelar</button></div></form>
    </section>}
    {showForm && <section className="panel"><h2>{editing ? `Corrección de la partida #${editing.id}` : 'Nueva partida'}</h2><form onSubmit={save}>
      <div className="form-grid">
        <Field name="persona_id" label="Persona" value={form.persona_id} onChange={change} required options={catalogs.personas.filter((item) => item.parroquia_id === Number(form.parroquia_id)).map((item) => ({ value: item.id, label: `${item.nombres} ${item.apellidos}${item.numero_identificacion ? ` · ${item.numero_identificacion}` : ''}` }))} />
        {!tipo && <Field name="sacramento_id" label="Tipo de partida" value={form.sacramento_id} onChange={change} required options={catalogs.sacramentos.map((item) => ({ value: item.id, label: item.nombre }))} />}
        <Field name="parroquia_id" label="Parroquia custodiante" value={form.parroquia_id} onChange={change} required disabled={Boolean(editing)} options={parishOptions(catalogs.parroquias).filter((item) => usuario.rol === 'administrador' || item.value === usuario.parroquia_id)} />
        <Field name="fecha_celebracion" label={selectedType === 'Defunción' ? 'Fecha del asiento / exequias' : 'Fecha de celebración'} type="date" value={form.fecha_celebracion} onChange={change} required />
        <Field name="libro" label="Libro" value={form.libro} onChange={change} required maxLength={100} options={editing ? undefined : catalogs.libros.filter((item) => item.parroquia_id === Number(form.parroquia_id) && item.sacramento_id === Number(sacrament?.id || form.sacramento_id)).map((item) => ({ value: item.numero, label: item.numero }))} />
        {['folio', 'numero'].map((name) => <Field key={name} name={name} label={{ folio: 'Folio', numero: 'Número de partida' }[name]} value={form[name]} onChange={change} required maxLength={50} />)}
        <Field name="lugar" label="Lugar" value={form.lugar} onChange={change} maxLength={200} />
        <Field name="ministro" label="Ministro / responsable" value={form.ministro} onChange={change} maxLength={200} />
        {(sacramentalFields[selectedType] || []).map(([name, label]) => name === 'conyuge_persona_id' ? <Field key={name} name={name} label="Otra persona contrayente" value={datos[name]} onChange={(key, value) => setDatos((current) => ({ ...current, [key]: value }))} required options={catalogs.personas.filter((item) => item.id !== Number(form.persona_id) && item.parroquia_id === Number(form.parroquia_id)).map((item) => ({ value: item.id, label: `${item.nombres} ${item.apellidos}` }))} />
          : <Field key={name} name={name} label={label} type={name === 'fecha_defuncion' ? 'date' : 'text'} value={datos[name]} onChange={(key, value) => setDatos((current) => ({ ...current, [key]: value }))} maxLength={500} />)}
        <Field name="notas" label="Notas marginales" type="textarea" value={form.notas} onChange={change} maxLength={5000} />
        {editing && <Field name="motivo" label="Motivo de la corrección" type="textarea" value={reason} onChange={(_, value) => setReason(value)} required minLength={5} maxLength={1000} />}
      </div><p className="hint">Registre primero a las personas en Personas y configure los libros en Configuración. Las correcciones quedan vinculadas al usuario y al asiento original.</p>
      <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar partida'}</button><button type="button" onClick={() => setShowForm(false)} disabled={busy}>Cancelar</button></div>
    </form></section>}
    <section className="panel"><form className="toolbar" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(Object.entries(filters).filter(([, value]) => value)); setQuery(values); setSearchParams(values); }}>
      <Field name="q" label="Nombre" value={filters.q} onChange={(name, value) => setFilters({ ...filters, [name]: value })} />
      {['libro', 'folio', 'numero'].map((name) => <Field key={name} name={name} label={{ libro: 'Libro', folio: 'Folio', numero: 'Partida' }[name]} value={filters[name]} onChange={(key, value) => setFilters({ ...filters, [key]: value })} />)}
      {globalRead && <Field name="parroquia_id" label="Parroquia" value={filters.parroquia_id} onChange={(name, value) => setFilters({ ...filters, [name]: value })} options={parishOptions(catalogs.parroquias)} />}
      <Field name="desde" label="Desde" type="date" value={filters.desde} onChange={(name, value) => setFilters({ ...filters, [name]: value })} />
      <Field name="hasta" label="Hasta" type="date" value={filters.hasta} onChange={(name, value) => setFilters({ ...filters, [name]: value })} />
      <button className="primary"><Icon name="search" size={16} />Buscar</button><button type="button" onClick={() => { setQuery({}); setSearchParams({}); }}>Limpiar filtros</button><button type="button" onClick={list.reload}>Actualizar</button>
    </form><div className="table-toolbar"><span className="hint">{list.rows.length} partidas en esta página</span><button disabled={list.loading || !list.rows.length} onClick={() => exportCsv(list.rows, columns, "partidas-consultadas.csv")}><Icon name="download" size={16} />Exportar página</button></div><Table columns={columns} {...list} /><Pagination list={list} /></section>
    {viewing?.kind === 'record' && <RecordDetail row={viewing.row} catalogs={catalogs} onClose={() => setViewing(null)} />}
    {viewing?.kind === 'history' && <RecordHistory row={viewing.row} onClose={() => setViewing(null)} />}
  </Page>;
}
