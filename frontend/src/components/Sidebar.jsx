import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, ROL_LABELS } from '../context/AuthContext';
import Icon, { BrandMark } from './shared/Icon';
import { navigationFor, useFavorites } from './shared/navigation';
export default function Sidebar() {
  const auth = useAuth(); const { usuario, logout } = auth;
  const [open, setOpen] = useState(false); const [closing, setClosing] = useState(false);
  const groups = navigationFor(auth); const { favorites } = useFavorites(usuario);
  const pinned = groups.flatMap((group) => group.items).filter(([path]) => favorites.includes(path));
  const item = ([path, label, icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}><Icon name={icon} size={18} /><span>{label}</span></NavLink>;
  const closeSession = async () => { setClosing(true); try { await logout(); } finally { setClosing(false); } };
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="sidebar-brand"><BrandMark /><div><span className="brand-eyebrow">Diócesis de Tibú</span><h1>Archivo diocesano</h1></div><button className="mobile-toggle" aria-label="Abrir menú" aria-expanded={open} aria-controls="menu-principal" onClick={() => setOpen(!open)}><Icon name="menu" /></button></div>
    <div className="sidebar-caption"><span className="status-dot" /> Sistema Sacramental</div>
    <nav id="menu-principal" aria-label="Menú principal">{pinned.length > 0 && <section className="nav-group"><h2>Mis accesos</h2>{pinned.map(item)}</section>}{groups.map((group) => <section key={group.label} className="nav-group"><h2>{group.label}</h2>{group.items.map(item)}</section>)}</nav>
    <div className="sidebar-footer"><div className="user-avatar">{usuario.nombre?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="sidebar-user"><strong>{usuario.nombre}</strong><span>{ROL_LABELS[usuario.rol] || usuario.rol}</span></div><button className="logout icon-button" title="Cerrar sesión" aria-label={closing ? 'Cerrando sesión…' : 'Cerrar sesión'} onClick={closeSession} disabled={closing}><Icon name="logout" size={18} /></button></div>
  </aside>;
}
