import { useCallback, useEffect, useState } from 'react';
export function navigationFor(auth) { return [
  { label: 'Espacio de trabajo', items: [['/', 'Panel principal', 'home'], ['/registros', 'Consulta de partidas', 'search'], ['/personas', 'Personas', 'people']] },
  { label: 'Archivo sacramental', items: [['/bautismos', 'Bautismos', 'book'], ['/confirmaciones', 'Confirmaciones', 'shield'], ['/matrimonios', 'Matrimonios', 'heart'], ['/defunciones', 'Defunciones', 'document'], ['/libros', 'Libros sacramentales', 'book']] },
  { label: 'Trámites y documentos', items: [['/solicitudes', 'Solicitudes', 'arrows'], ['/certificados', 'Certificados', 'certificate'], ...(auth.canSignCert ? [['/aprobaciones', 'Aprobaciones y firma', 'check']] : []), ['/documentos', 'Gestión documental', 'document']] },
  { label: 'Institución', items: [['/parroquias', 'Parroquias', 'church'], ['/reportes', 'Reportes', 'chart'], ...(auth.canManage ? [['/usuarios', 'Usuarios', 'people']] : []), ...(auth.canAudit ? [['/auditoria', 'Auditoría', 'shield']] : []), ['/roles', 'Roles y permisos', 'lock'], ['/sacramentos', 'Catálogo de partidas', 'list'], ...(auth.usuario?.rol === 'administrador' ? [['/respaldos', 'Respaldos', 'download']] : []), ['/configuracion', 'Configuración', 'settings']] },
]; }
export function useFavorites(user) {
  const key = `sgd-favorites-${user?.id || user?.email || 'session'}`;
  const read = useCallback(() => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []; } catch { return []; } }, [key]);
  const [favorites, setFavorites] = useState(read);
  useEffect(() => { setFavorites(read()); const sync = (event) => { if (event.detail === key) setFavorites(read()); }; window.addEventListener('sgd-favorites', sync); return () => window.removeEventListener('sgd-favorites', sync); }, [key, read]);
  const toggle = (path) => { const next = favorites.includes(path) ? favorites.filter((item) => item !== path) : [...favorites, path].slice(-8); let saved = false; try { localStorage.setItem(key, JSON.stringify(next)); saved = true; } catch { /* Keep the preference in memory when storage is unavailable. */ } setFavorites(next); if (saved) window.dispatchEvent(new CustomEvent('sgd-favorites', { detail: key })); };
  return { favorites, toggle };
}
export const normalizeText = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
