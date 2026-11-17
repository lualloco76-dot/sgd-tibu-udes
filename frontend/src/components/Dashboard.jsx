import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './Sidebar';
import WorkspaceBar from './WorkspaceBar';
import ConnectedRecords from './ConnectedRecords';
import { AuditoriaPage, CertificadosPage, ConfiguracionPage, DocumentosPage, LibrosPage, ParroquiasPage, PersonasPage, ReportesPage, RespaldosPage, RolesPage, SacramentosPage, SolicitudesPage, UsuariosPage } from './ConnectedPages';
import { useAuth } from '../context/AuthContext';
import { Notice, Page } from './shared/ConnectedUI';

export function RoleRoute({ roles, children }) {
  const { usuario } = useAuth();
  return roles.includes(usuario?.rol) ? children : <Page title="Acceso restringido"><Notice message="Su cuenta no tiene permiso para acceder a esta función." error /></Page>;
}
export function PermissionRoute({ permission, children }) {
  const auth = useAuth();
  return auth[permission] ? children : <Page title="Acceso restringido"><Notice message="Su cuenta no tiene permiso para acceder a esta función." error /></Page>;
}
export default function Dashboard() {
  return <div className="app-shell"><a className="skip-link" href="#contenido">Ir al contenido</a><Sidebar /><div className="workspace"><WorkspaceBar /><main className="app-main" id="contenido" tabIndex={-1}><Routes>
    <Route index element={<ReportesPage home />} />
    <Route path="registros" element={<ConnectedRecords key="todos" />} />
    <Route path="bautismos" element={<ConnectedRecords key="bautismos" tipo="Bautismo" />} />
    <Route path="confirmaciones" element={<ConnectedRecords key="confirmaciones" tipo="Confirmación" />} />
    <Route path="matrimonios" element={<ConnectedRecords key="matrimonios" tipo="Matrimonio" />} />
    <Route path="defunciones" element={<ConnectedRecords key="defunciones" tipo="Defunción" />} />
    <Route path="personas" element={<PersonasPage />} />
    <Route path="sacramentos" element={<SacramentosPage />} />
    <Route path="parroquias" element={<ParroquiasPage />} />
    <Route path="certificados" element={<CertificadosPage />} />
    <Route path="aprobaciones" element={<PermissionRoute permission="canSignCert"><CertificadosPage approvals /></PermissionRoute>} />
    <Route path="roles" element={<RolesPage />} />
    <Route path="libros" element={<LibrosPage />} />
    <Route path="solicitudes" element={<SolicitudesPage />} />
    <Route path="documentos" element={<DocumentosPage />} />
    <Route path="usuarios" element={<PermissionRoute permission="canManage"><UsuariosPage /></PermissionRoute>} />
    <Route path="auditoria" element={<PermissionRoute permission="canAudit"><AuditoriaPage /></PermissionRoute>} />
    <Route path="reportes" element={<ReportesPage />} />
    <Route path="respaldos" element={<RoleRoute roles={['administrador']}><RespaldosPage /></RoleRoute>} />
    <Route path="configuracion" element={<ConfiguracionPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></main><footer className="workspace-footer"><span>Archivo diocesano · Tibú</span><span>Memoria, custodia y servicio</span></footer></div></div>;
}
