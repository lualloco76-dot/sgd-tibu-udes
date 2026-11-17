import React, { useState } from 'react';
import api, { errorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Field, Notice, Page } from './shared/ConnectedUI';

export default function PasswordRequired() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const save = async (event) => {
    event.preventDefault(); setError('');
    if (form.nueva !== form.confirmar) { setError('La confirmación no coincide.'); return; }
    setBusy(true);
    try { await api.post('/auth/change-password', { actual: form.actual, nueva: form.nueva }); await logout({ revoked: true }); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <main className="app-main"><Page title="Cambie su contraseña temporal" description="Elija una contraseña personal para habilitar el acceso a los módulos."><section className="panel"><Notice message={error} error /><form onSubmit={save}><div className="form-grid">
    <Field name="actual" label="Contraseña temporal" type="password" value={form.actual} onChange={change} autoComplete="current-password" required />
    <Field name="nueva" label="Nueva contraseña (mínimo 8 caracteres)" type="password" value={form.nueva} onChange={change} minLength={8} maxLength={72} autoComplete="new-password" required />
    <Field name="confirmar" label="Confirme la nueva contraseña" type="password" value={form.confirmar} onChange={change} minLength={8} maxLength={72} autoComplete="new-password" required />
  </div><div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña e iniciar sesión'}</button><button type="button" onClick={logout} disabled={busy}>Cerrar sesión</button></div></form></section></Page></main>;
}
