import React, { useState } from 'react';
import { Field, Notice, useList, PAGE_SIZE } from './ConnectedUI';

export function recordReference(row) {
  if (!row) return 'Referencia no disponible';
  return `Libro ${row.libro || 'no registrado'} · Folio ${row.folio || 'no registrado'} · Partida ${row.numero || 'no registrada'}`;
}

// Search and paginate on the server so older records remain selectable.
export default function RecordPicker({ value, onChange }) {
  const [filters, setFilters] = useState({ q: '', numero: '' });
  const [selected, setSelected] = useState(null);
  const list = useList('/registros/', Object.fromEntries(Object.entries(filters).filter(([, item]) => item)));
  const filter = (name, next) => { setFilters(current => ({ ...current, [name]: next })); onChange(''); setSelected(null); };
  const rows = selected && String(selected.id) === String(value) && !list.rows.some(row => row.id === selected.id) ? [selected, ...list.rows] : list.rows;
  return <fieldset className="record-picker"><legend>Seleccione la partida sacramental</legend>
    <Field name="buscar_titular" label="Buscar persona de la partida" value={filters.q} onChange={(_, next) => filter('q', next)} maxLength={200} />
    <Field name="buscar_numero" label="Buscar número de partida" value={filters.numero} onChange={(_, next) => filter('numero', next)} maxLength={50} />
    <Notice message={list.error} error />
    <Field name="registro_id" label="Partida sacramental" aria-label="Partida sacramental" value={value} required disabled={list.loading} onChange={(_, next) => { setSelected(rows.find(row => String(row.id) === next)); onChange(next); }} options={rows.map(row => ({ value: row.id, label: `${row.persona ? `${row.persona.nombres} ${row.persona.apellidos}` : 'Titular no disponible'} · ${row.sacramento?.nombre || 'Partida'} · ${recordReference(row)}` }))} />
    {list.loading ? <p role="status">Buscando partidas…</p> : !rows.length && !list.error && <p>No se encontraron partidas. Revise los filtros o registre primero la partida.</p>}
    <div className="form-actions"><button type="button" disabled={list.loading || list.page === 0} onClick={() => list.setPage(list.page - 1)}>Partidas anteriores</button><span>Página de partidas {list.page + 1}</span><button type="button" disabled={list.loading || list.rows.length < PAGE_SIZE} onClick={() => list.setPage(list.page + 1)}>Más partidas</button></div>
  </fieldset>;
}
