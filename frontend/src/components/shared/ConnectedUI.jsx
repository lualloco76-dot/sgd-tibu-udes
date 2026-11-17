import React, { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../../api/axiosConfig';

export const PAGE_SIZE = 20;
export function useList(path, params = {}, enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const serialized = JSON.stringify(params);
  useEffect(() => { setPage(0); }, [path, serialized]);
  useEffect(() => {
    const controller = new AbortController();
    if (!enabled) { setRows([]); setLoading(true); return () => controller.abort(); }
    setLoading(true); setError('');
    api.get(path, { params: { ...JSON.parse(serialized), skip: page * PAGE_SIZE, limit: PAGE_SIZE }, signal: controller.signal })
      .then(({ data }) => { setRows(Array.isArray(data) ? data : data.items || []); })
      .catch((failure) => { if (!controller.signal.aborted) { setRows([]); setError(errorMessage(failure)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, serialized, page, revision, enabled]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { rows, loading, error, page, setPage, reload };
}

export function Page({ title, description, children, action }) {
  return <><header className="page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>{children}</>;
}
export function Notice({ message, error = false }) {
  return message ? <p className={`notice ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{message}</p> : null;
}
export function Table({ columns, rows, loading, error, empty = 'No hay registros disponibles.' }) {
  if (loading) return <p role="status">Cargando información…</p>;
  if (error) return <Notice message={error} error />;
  if (!rows.length) return <p>{empty}</p>;
  return <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
export function Pagination({ list }) {
  return <nav className="pagination" aria-label="Paginación"><button disabled={list.loading || list.page === 0} onClick={() => list.setPage(list.page - 1)}>Anterior</button>
    <span>Página {list.page + 1}</span><button disabled={list.loading || list.rows.length < PAGE_SIZE} onClick={() => list.setPage(list.page + 1)}>Siguiente</button></nav>;
}
export function Field({ name, label, value, onChange, type = 'text', options, required = false, ...props }) {
  const common = { name, value: value ?? '', onChange: (event) => onChange(name, event.target.value), required, ...props };
  return <label>{label}{required ? ' *' : ''}{options ? <select {...common}><option value="">Seleccione…</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
    : type === 'textarea' ? <textarea {...common} /> : <input type={type} {...common} />}</label>;
}
export function Detail({ children, onClose, title = 'Detalle' }) {
  const dialog = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => { document.body.style.overflow = previous; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const keyboard = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(el => !el.disabled);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialog} onKeyDown={keyboard} role="dialog" aria-modal="true" aria-label={title} className="modal institutional-detail"><header className="detail-heading"><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar detalle">Cerrar detalle</button></header>
    {children}
  </section></div>;
}
export const parishOptions = (parishes) => parishes.filter((item) => item.activa !== false).map((item) => ({ value: item.id, label: item.nombre }));
export function useCatalogs() {
  const [catalogs, setCatalogs] = useState({ personas: [], sacramentos: [], parroquias: [], libros: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    // Follow every page; a long-lived parish must not lose access to people after the first page.
    const all = async (path) => {
      let items = [], skip = 0, batch;
      do {
        const response = await api.get(path, { params: { skip, limit: 200 } });
        batch = Array.isArray(response.data) ? response.data : response.data.items || [];
        items = items.concat(batch); skip += 200;
      } while (batch.length === 200);
      return items;
    };
    Promise.all([all('/personas/'), all('/sacramentos/'), all('/parroquias/'), all('/libros/')])
      .then(([personas, sacramentos, parroquias, libros]) => { if (active) setCatalogs({ personas, sacramentos, parroquias, libros }); })
      .catch((failure) => { if (active) setError(errorMessage(failure)); });
    return () => { active = false; };
  }, []);
  return { ...catalogs, error };
}
