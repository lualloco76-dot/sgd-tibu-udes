import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { BrandMark } from './shared/Icon';
import api, { errorMessage } from '../api/axiosConfig';

export default function Login() {
  const { login, usuario, loading, sessionMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [parroquia, setParroquia] = useState('');
  const [parroquias, setParroquias] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  useEffect(() => {
    if (loading || usuario) return;
    let active = true;
    setCatalogLoading(true); setCatalogError('');
    api.get('/auth/parroquias')
      .then(({ data }) => { if (active) setParroquias(data); })
      .catch((cause) => { if (active) { setParroquias([]); setCatalogError(errorMessage(cause)); } })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [loading, usuario, catalogAttempt]);
  if (loading) return <p role="status">Comprobando sesión…</p>;
  if (usuario) return <Navigate to="/" replace />;
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (busy || catalogLoading) return;
    if (!parroquia) { setError('Seleccione su parroquia o el acceso diocesano.'); return; }
    setBusy(true);
    const result = await login(email, password, parroquia === 'diocesis' ? null : Number(parroquia));
    if (!result.success) setError(result.error);
    setBusy(false);
  };
  return <main className="login-page"><section className="login-visual" aria-label="Archivo diocesano de Tibú"><div className="login-brand"><BrandMark size={46} /><div><span className="brand-eyebrow">Diócesis de Tibú</span><strong>Archivo diocesano</strong></div></div><div className="login-story"><span className="eyebrow">Memoria, custodia y servicio</span><h1>La memoria de nuestra Iglesia.<br /><em>Al servicio de todos.</em></h1><p>Un espacio para preservar las historias de fe de nuestras comunidades, con el cuidado que merecen.</p><div className="login-arch" aria-hidden="true"><div /><div /><Icon name="church" size={100} /><span>DIÓCESIS DE TIBÚ</span></div></div><footer><span>Gestión documental parroquial</span><span>Colombia</span></footer></section><section className="login-card"><div className="login-mobile-brand"><BrandMark /><span>Diócesis de Tibú</span></div><span className="eyebrow">Sistema Sacramental</span><h2>Acceso institucional</h2><p className="login-intro">Bienvenido. Ingrese a su espacio de trabajo.</p>
    {(error || sessionMessage) && <p className="notice error" role="alert">{error || sessionMessage}</p>}
    <form onSubmit={submit}>
      <label>Parroquia o acceso diocesano
        <select name="parroquia_id" value={parroquia} onChange={(e) => { setParroquia(e.target.value); setError(''); }} required disabled={busy || catalogLoading} aria-describedby="login-parroquia-ayuda">
          <option value="">{catalogLoading ? 'Cargando parroquias…' : 'Seleccione una opción'}</option>
          <option value="diocesis">Acceso diocesano / administración</option>
          {parroquias.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}
        </select>
      </label>
      <p className="hint" id="login-parroquia-ayuda">Seleccione la parroquia asignada a su cuenta. Administración, Secretaría General, Cancillería y Auditoría usan el acceso diocesano.</p>
      {catalogError && <div className="notice error" role="alert">No se pudieron cargar las parroquias. {catalogError} <button type="button" disabled={busy} onClick={() => { setParroquia(''); setCatalogAttempt((attempt) => attempt + 1); }}>Reintentar</button></div>}
      {!catalogLoading && !catalogError && parroquias.length === 0 && <p className="hint" role="status">Aún no hay parroquias activas registradas. El administrador debe crearlas para habilitar el acceso parroquial.</p>}
      <label>Correo electrónico<input name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
      <label>Contraseña<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={128} /><button type="button" className="icon-button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? "lock" : "eye"} size={18} /></button></span></label>
      <button className="primary login-submit" disabled={busy || catalogLoading}><span>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</span><Icon name="arrow" size={18} /></button>
    </form>
    <p className="hint">El acceso se valida con su cuenta institucional y la parroquia seleccionada. Para recuperar el acceso, solicite al administrador una nueva contraseña.</p>
    <div className="login-security"><Icon name="lock" size={15} /><span>Acceso exclusivo para cuentas institucionales</span></div>
  </section></main>;
}
