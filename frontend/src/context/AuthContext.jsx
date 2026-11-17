import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { errorMessage } from '../api/axiosConfig';

export const ROLES = ['administrador', 'parroco', 'secretario_parroquial', 'secretario_general', 'canciller', 'auditor', 'consulta'];
export const ROL_LABELS = {
  administrador: 'Administrador',
  parroco: 'Párroco',
  secretario_parroquial: 'Secretario Parroquial',
  secretario_general: 'Secretario General',
  canciller: 'Canciller',
  auditor: 'Auditor',
  consulta: 'Consulta',
};

const AuthContext = createContext(null);

export function permissionsFor(usuario) {
  const r = usuario?.rol || '';
  return {
    canWrite: ['administrador', 'parroco', 'secretario_parroquial'].includes(r),
    canManage: ['administrador', 'parroco'].includes(r),
    canAudit: ['administrador', 'parroco', 'auditor', 'canciller', 'secretario_general'].includes(r),
    canPrepareCert: ['administrador', 'parroco', 'secretario_parroquial', 'secretario_general', 'canciller'].includes(r),
    canAuthorizeCert: r === 'parroco',
    canSignCert: ['parroco', 'canciller'].includes(r),
    canApproveCuria: r === 'canciller',
    globalRead: ['administrador', 'canciller', 'secretario_general'].includes(r),
    ...(usuario?.permisos || {}),
  };
}

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const refreshSession = useCallback(async () => {
    const token = sessionStorage.getItem('sgd-token');
    if (!token) return;
    const { data } = await api.get('/auth/me');
    if (sessionStorage.getItem('sgd-token') === token) setUsuario(data);
  }, []);
  useEffect(() => {
    if (!usuario) return undefined;
    const refresh = () => { if (document.visibilityState !== 'hidden') refreshSession().catch(() => {}); };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('sgd-permissions-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); window.removeEventListener('sgd-permissions-changed', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [usuario?.id, Boolean(usuario), refreshSession]);
  useEffect(() => {
    let active = true;
    const expire = () => {
      sessionStorage.removeItem('sgd-token');
      setUsuario(null);
      setSessionMessage('Su sesión expiró. Inicie sesión de nuevo.');
    };
    window.addEventListener('sgd-session-expired', expire);
    if (sessionStorage.getItem('sgd-token')) {
      api.get('/auth/me').then(({ data }) => { if (active) setUsuario(data); })
        .catch((error) => { if (active) setSessionMessage(errorMessage(error)); })
        .finally(() => { if (active) setLoading(false); });
    } else setLoading(false);
    return () => { active = false; window.removeEventListener('sgd-session-expired', expire); };
  }, []);
  const login = async (email, password, parroquia_id = null) => {
    try {
      const { data } = await api.post('/auth/login', { email, password, parroquia_id });
      sessionStorage.setItem('sgd-token', data.access_token);
      const response = await api.get('/auth/me');
      setUsuario(response.data); setSessionMessage('');
      return { success: true };
    } catch (error) {
      sessionStorage.removeItem('sgd-token');
      return { success: false, error: errorMessage(error) };
    }
  };
  const logout = async ({ revoked = false } = {}) => {
    try {
      if (revoked) setSessionMessage('Contraseña actualizada. Inicie sesión con su nueva contraseña.');
      else await api.post('/auth/logout');
    }
    catch (error) { setSessionMessage(`Se cerró la sesión local. ${errorMessage(error)}`); }
    finally { sessionStorage.removeItem('sgd-token'); setUsuario(null); }
  };

  const r = usuario?.rol || '';
  const value = {
    usuario, loading, login, logout, sessionMessage, refreshSession,
    rol: r,
    ...permissionsFor(usuario),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider es obligatorio.');
  return context;
}
export default AuthContext;
