import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axiosConfig';
import { useAuth, ROL_LABELS } from '../context/AuthContext';
import { Notice, Page } from './shared/ConnectedUI';
import Icon from './shared/Icon';

const descriptions = {
  administrador: 'Administración técnica y configuración del sistema.',
  parroco: 'Custodia del archivo y autorización en su parroquia.',
  secretario_parroquial: 'Registro y atención documental de su parroquia.',
  secretario_general: 'Coordinación y gestión documental diocesana.',
  canciller: 'Revisión y aprobación de trámites de la Curia.',
  auditor: 'Seguimiento de trazabilidad y control institucional.',
  consulta: 'Consulta de información dentro de su parroquia.',
};

export default function RolePermissions() {
  const { usuario } = useAuth();
  const admin = usuario?.rol === 'administrador';
  const [catalog, setCatalog] = useState(null);
  const [selected, setSelected] = useState(usuario?.rol || 'consulta');
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailure('');
    api.get('/roles/').then(({ data }) => {
      if (!Array.isArray(data?.roles) || !Array.isArray(data?.permisos)) throw new Error('El servidor no devolvió el catálogo de permisos.');
      if (active) { setCatalog(data); setDraft({}); }
    })
      .catch((error) => { if (active) setFailure(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const role = catalog?.roles.find((item) => item.id === selected);
  const values = { ...role?.permisos, ...draft };
  const changes = Object.keys(draft).filter((key) => draft[key] !== role?.permisos[key]);
  const dirty = changes.length > 0;
  const save = async () => {
    setBusy(true); setFailure(''); setMessage('');
    try {
      const { data } = await api.patch(`/roles/${role.id}`, { revision: role.revision, permisos: Object.fromEntries(changes.map((key) => [key, draft[key]])) });
      setCatalog((current) => ({ ...current, roles: current.roles.map((item) => item.id === role.id ? { ...item, ...data } : item) }));
      setDraft({}); setMessage('Permisos guardados. Se aplican automáticamente a todas las cuentas de este rol.');
      window.dispatchEvent(new Event('sgd-permissions-changed'));
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return <Page title="Roles y permisos" description="Define qué puede hacer cada equipo y mantén el control de los accesos." action={admin && <Link className="button" to="/usuarios"><Icon name="people" size={16} /> Gestionar usuarios</Link>}>
    <Notice message={message} /><Notice message={failure} error />
    {loading ? <p role="status">Cargando permisos…</p> : !catalog ? <button onClick={() => setRevision((value) => value + 1)}>Reintentar</button> : <>
      <div className="admin-context"><span><Icon name="shield" size={18} /> Control de acceso</span><span><span className="status-dot" /> Cambios aplicados desde el servidor</span></div>
      <div className="access-layout">
        <section className="panel role-picker" aria-label="Seleccionar rol"><span className="eyebrow">Perfiles del sistema</span>
          {catalog.roles.map((item) => <button key={item.id} disabled={busy || (dirty && item.id !== selected)} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setDraft({}); setMessage(''); setFailure(''); }}>
            <Icon name={item.id === 'administrador' ? 'settings' : item.id === 'consulta' ? 'eye' : 'shield'} size={18} /><span><strong>{ROL_LABELS[item.id]}</strong><small>{item.usuarios == null ? 'Perfil institucional' : `${item.usuarios} cuenta${item.usuarios === 1 ? '' : 's'}`}</small></span><Icon name="arrow" size={15} />
          </button>)}
        </section>
        {role && <section className="panel permission-editor">
          <div className="section-heading"><div><span className="eyebrow">Configuración del perfil</span><h2>{ROL_LABELS[role.id]}</h2><p className="hint">{descriptions[role.id]}</p></div><span className="badge">{Object.values(values).filter(Boolean).length} permisos activos</span></div>
          <div className="permission-list">{catalog.permisos.map((permission) => {
            const editable = admin && role.editables.includes(permission.id);
            return <div key={permission.id} className="permission-row"><span className="permission-symbol"><Icon name={permission.id === 'globalRead' ? 'church' : 'lock'} size={18} /></span><div><label htmlFor={`perm-${permission.id}`}>{permission.nombre}</label><p>{permission.descripcion}</p>{!editable && <small><Icon name="lock" size={11} /> {admin ? 'Protegido por el cargo' : 'Solo el administrador puede modificar permisos'}</small>}</div><input id={`perm-${permission.id}`} type="checkbox" role="switch" checked={Boolean(values[permission.id])} disabled={!editable || busy} onChange={(event) => setDraft((current) => ({ ...current, [permission.id]: event.target.checked }))} /></div>;
          })}</div>
          <div className="admin-callout"><Icon name="shield" size={19} /><p>El alcance parroquial se conserva. La firma corresponde al párroco y al canciller; la aprobación de Curia, al canciller.</p></div>
          {admin && <footer className="permission-footer"><span aria-live="polite">{dirty ? `${changes.length} cambio${changes.length === 1 ? '' : 's'} sin guardar` : 'Todos los cambios están guardados'}</span><div className="row-actions"><button disabled={busy || !dirty} onClick={() => setDraft({})}>Descartar</button><button disabled={busy || !role.editables.length} onClick={() => setDraft(Object.fromEntries(role.editables.map((key) => [key, role.predeterminados[key]])))}>Restablecer perfil</button><button className="primary" disabled={busy || !dirty} onClick={save}>{busy ? 'Guardando…' : 'Guardar permisos'}</button></div></footer>}
          <p className="hint">{role.actualizado ? `Última modificación: ${new Date(role.actualizado).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}` : 'Este perfil conserva su configuración inicial.'}</p>
          {failure && <button disabled={busy} onClick={() => setRevision((value) => value + 1)}>Recargar permisos del servidor</button>}
        </section>}
      </div>
    </>}
  </Page>;
}
