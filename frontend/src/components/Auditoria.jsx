import React, { useState, useMemo } from 'react';

const Auditoria = () => {
  const [activeTab, setActiveTab] = useState('todas');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('todos');
  const [filterAccion, setFilterAccion] = useState('todas');
  const [filterEntidad, setFilterEntidad] = useState('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDetail, setShowDetail] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [logs] = useState([
    { id: 1, usuario: 'Administrador General', usuarioId: 'admin@iglesia.org', rol: 'administrador', accion: 'INICIO_SESION', entidad: 'sistema', entidadId: null, fecha: '2024-06-15 08:30:15', ip: '192.168.1.100', detalle: 'Inicio de sesión exitoso', nivel: 'info' },
    { id: 2, usuario: 'Secretario Tibú', usuarioId: 'secretario@tibu.org', rol: 'secretario_parroquial', accion: 'CREAR', entidad: 'bautismos', entidadId: 45, fecha: '2024-06-15 09:15:22', ip: '192.168.1.105', detalle: 'Bautismo registrado: María José García', nivel: 'info' },
    { id: 3, usuario: 'Canciller de la Curia', usuarioId: 'canciller@iglesia.org', rol: 'canciller', accion: 'GENERAR_CERTIFICADO', entidad: 'certificados', entidadId: 12, fecha: '2024-06-15 10:20:45', ip: '192.168.1.102', detalle: 'Certificado emitido: CERT-B-012', nivel: 'info' },
    { id: 4, usuario: 'Secretario General', usuarioId: 'secretario@iglesia.org', rol: 'secretario_general', accion: 'MODIFICAR', entidad: 'matrimonios', entidadId: 28, fecha: '2024-06-15 11:45:10', ip: '192.168.1.103', detalle: 'Matrimonio modificado: folio F-15', nivel: 'warning' },
    { id: 5, usuario: 'Administrador General', usuarioId: 'admin@iglesia.org', rol: 'administrador', accion: 'CREAR_USUARIO', entidad: 'usuarios', entidadId: 8, fecha: '2024-06-15 12:30:00', ip: '192.168.1.100', detalle: 'Usuario creado: nuevo@iglesia.org', nivel: 'info' },
    { id: 6, usuario: 'Secretario Tibú', usuarioId: 'secretario@tibu.org', rol: 'secretario_parroquial', accion: 'ELIMINAR', entidad: 'bautismos', entidadId: 3, fecha: '2024-06-15 14:10:33', ip: '192.168.1.105', detalle: 'Bautismo eliminado lógicamente: ID 3', nivel: 'danger' },
    { id: 7, usuario: 'Canciller de la Curia', usuarioId: 'canciller@iglesia.org', rol: 'canciller', accion: 'EXPORTAR', entidad: 'reportes', entidadId: null, fecha: '2024-06-15 15:00:00', ip: '192.168.1.102', detalle: 'Reporte exportado en formato PDF', nivel: 'info' },
    { id: 8, usuario: 'Secretario General', usuarioId: 'secretario@iglesia.org', rol: 'secretario_general', accion: 'INICIO_SESION', entidad: 'sistema', entidadId: null, fecha: '2024-06-15 16:20:15', ip: '192.168.1.103', detalle: 'Inicio de sesión exitoso', nivel: 'info' },
    { id: 9, usuario: 'Usuario Consulta', usuarioId: 'consulta@iglesia.org', rol: 'consulta', accion: 'INTENTO_FALLIDO', entidad: 'sistema', entidadId: null, fecha: '2024-06-15 17:15:30', ip: '192.168.1.200', detalle: 'Intento de acceso sin permisos', nivel: 'danger' },
    { id: 10, usuario: 'Administrador General', usuarioId: 'admin@iglesia.org', rol: 'administrador', accion: 'ANULAR', entidad: 'certificados', entidadId: 3, fecha: '2024-06-15 18:00:00', ip: '192.168.1.100', detalle: 'Certificado anulado: CERT-M-001', nivel: 'warning' },
    { id: 11, usuario: 'Secretario Tibú', usuarioId: 'secretario@tibu.org', rol: 'secretario_parroquial', accion: 'SUBIR_DOCUMENTO', entidad: 'documentos', entidadId: 15, fecha: '2024-06-16 08:00:00', ip: '192.168.1.105', detalle: 'Documento subido: acta_bautismo_045.pdf', nivel: 'info' },
    { id: 12, usuario: 'Canciller de la Curia', usuarioId: 'canciller@iglesia.org', rol: 'canciller', accion: 'MODIFICAR', entidad: 'libros', entidadId: 1, fecha: '2024-06-16 09:30:00', ip: '192.168.1.102', detalle: 'Libro de Bautismos actualizado', nivel: 'info' },
    { id: 13, usuario: 'Secretario General', usuarioId: 'secretario@iglesia.org', rol: 'secretario_general', accion: 'CREAR', entidad: 'confirmaciones', entidadId: 30, fecha: '2024-06-16 10:15:00', ip: '192.168.1.103', detalle: 'Confirmación registrada: Juan Pérez', nivel: 'info' },
    { id: 14, usuario: 'Administrador General', usuarioId: 'admin@iglesia.org', rol: 'administrador', accion: 'CIERRE_SESION', entidad: 'sistema', entidadId: null, fecha: '2024-06-16 11:00:00', ip: '192.168.1.100', detalle: 'Cierre de sesión', nivel: 'info' },
    { id: 15, usuario: 'Secretario Tibú', usuarioId: 'secretario@tibu.org', rol: 'secretario_parroquial', accion: 'CREAR', entidad: 'defunciones', entidadId: 12, fecha: '2024-06-16 12:45:00', ip: '192.168.1.105', detalle: 'Defunción registrada: José Martínez', nivel: 'info' },
  ]);

  const acciones = [
    { id: 'INICIO_SESION', label: 'Inicio de Sesión', icon: '🔓', color: '#4CAF50' },
    { id: 'CIERRE_SESION', label: 'Cierre de Sesión', icon: '🔒', color: '#607D8B' },
    { id: 'CREAR', label: 'Crear', icon: '➕', color: '#2196F3' },
    { id: 'MODIFICAR', label: 'Modificar', icon: '✏️', color: '#FF9800' },
    { id: 'ELIMINAR', label: 'Eliminar', icon: '🗑️', color: '#f44336' },
    { id: 'ANULAR', label: 'Anular', icon: '⚠️', color: '#FF5722' },
    { id: 'CREAR_USUARIO', label: 'Crear Usuario', icon: '👤', color: '#9C27B0' },
    { id: 'GENERAR_CERTIFICADO', label: 'Generar Certificado', icon: '📄', color: '#00BCD4' },
    { id: 'EXPORTAR', label: 'Exportar', icon: '📥', color: '#795548' },
    { id: 'SUBIR_DOCUMENTO', label: 'Subir Documento', icon: '📤', color: '#3F51B5' },
    { id: 'INTENTO_FALLIDO', label: 'Intento Fallido', icon: '❌', color: '#f44336' },
  ];

  const entidades = ['sistema', 'bautismos', 'confirmaciones', 'matrimonios', 'defunciones', 'certificados', 'usuarios', 'documentos', 'libros', 'reportes'];

  const getAccionInfo = (accionId) => acciones.find(a => a.id === accionId) || { icon: '📌', color: '#999', label: accionId };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !searchTerm || 
        log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detalle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entidad.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUsuario = filterUsuario === 'todos' || log.usuarioId === filterUsuario;
      const matchAccion = filterAccion === 'todas' || log.accion === filterAccion;
      const matchEntidad = filterEntidad === 'todas' || log.entidad === filterEntidad;
      const matchTab = activeTab === 'todas' || 
        (activeTab === 'criticos' && (log.nivel === 'danger' || log.nivel === 'warning')) ||
        (activeTab === 'sesiones' && (log.accion === 'INICIO_SESION' || log.accion === 'CIERRE_SESION')) ||
        (activeTab === 'cambios' && ['CREAR', 'MODIFICAR', 'ELIMINAR', 'ANULAR'].includes(log.accion));
      return matchSearch && matchUsuario && matchAccion && matchEntidad && matchTab;
    });
  }, [logs, searchTerm, filterUsuario, filterAccion, filterEntidad, activeTab]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const stats = {
    total: logs.length,
    sesiones: logs.filter(l => l.accion === 'INICIO_SESION' || l.accion === 'CIERRE_SESION').length,
    creaciones: logs.filter(l => l.accion === 'CREAR').length,
    modificaciones: logs.filter(l => l.accion === 'MODIFICAR').length,
    eliminaciones: logs.filter(l => l.accion === 'ELIMINAR').length,
    criticos: logs.filter(l => l.nivel === 'danger' || l.nivel === 'warning').length,
  };

  const usuariosUnicos = [...new Set(logs.map(l => ({ id: l.usuarioId, nombre: l.usuario })))].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const tabs = [
    { id: 'todas', label: '📋 Todas las Acciones' },
    { id: 'sesiones', label: '🔐 Sesiones' },
    { id: 'cambios', label: '✏️ Cambios' },
    { id: 'criticos', label: '⚠️ Críticos' },
  ];

  const handleExport = () => {
    showToast('📥 Auditoría exportada correctamente');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #607D8B 0%, #37474F 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(96, 125, 139, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🔍 Auditoría del Sistema</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Registro completo de todas las acciones realizadas en el sistema
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '15px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>Total Registros</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '15px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffcdd2' }}>{stats.criticos}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>Eventos Críticos</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', borderLeft: '4px solid #4CAF50', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '24px' }}>🔐</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.sesiones}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Sesiones</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', borderLeft: '4px solid #2196F3', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '24px' }}>➕</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.creaciones}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Creaciones</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', borderLeft: '4px solid #FF9800', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '24px' }}>✏️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.modificaciones}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Modificaciones</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', borderLeft: '4px solid #f44336', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '24px' }}>🗑️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50' }}>{stats.eliminaciones}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Eliminaciones</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
            style={{
              padding: '12px 20px', borderRadius: '10px', border: '2px solid #e0e0e0',
              cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.3s',
              background: activeTab === tab.id ? '#607D8B' : 'white',
              color: activeTab === tab.id ? 'white' : '#333'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '8px 12px' }}>
            <span>🔍</span>
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '13px', marginLeft: '8px', background: 'transparent' }} />
          </div>
          <select value={filterUsuario} onChange={(e) => setFilterUsuario(e.target.value)} style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <option value="todos">Todos los Usuarios</option>
            {usuariosUnicos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <select value={filterAccion} onChange={(e) => setFilterAccion(e.target.value)} style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <option value="todas">Todas las Acciones</option>
            {acciones.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
          </select>
          <select value={filterEntidad} onChange={(e) => setFilterEntidad(e.target.value)} style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <option value="todas">Todas las Entidades</option>
            {entidades.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
          <button onClick={handleExport} style={{ padding: '10px', background: 'linear-gradient(135deg, #607D8B 0%, #37474F 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            📥 Exportar
          </button>
          <button onClick={() => { setSearchTerm(''); setFilterUsuario('todos'); setFilterAccion('todas'); setFilterEntidad('todas'); }} style={{ padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            🔄 Limpiar
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Acción</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Usuario</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Entidad</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Detalle</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.map(log => {
                const info = getAccionInfo(log.accion);
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: info.color + '20', color: info.color
                      }}>
                        {info.icon} {log.accion}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{log.usuario}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{log.usuarioId}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: '#f0f0f0', padding: '3px 8px', borderRadius: '8px', fontSize: '11px' }}>
                        {log.entidad}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', maxWidth: '300px' }}>{log.detalle}</td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '12px' }}>{log.fecha}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => setShowDetail(log)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>
                        👁️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '5px', cursor: 'pointer', background: 'white', opacity: currentPage === 1 ? 0.5 : 1 }}>«</button>
          <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '5px', cursor: 'pointer', background: 'white', opacity: currentPage === 1 ? 0.5 : 1 }}>←</button>
          <span style={{ color: '#666', fontSize: '13px' }}>Página {currentPage} de {totalPages} ({filteredLogs.length} registros)</span>
          <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '5px', cursor: 'pointer', background: 'white', opacity: currentPage === totalPages ? 0.5 : 1 }}>→</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '5px', cursor: 'pointer', background: 'white', opacity: currentPage === totalPages ? 0.5 : 1 }}>»</button>
        </div>
      </div>

      {showDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowDetail(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #607D8B 0%, #37474F 100%)', borderRadius: '15px 15px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>🔍 Detalle del Registro</h2>
              <button onClick={() => setShowDetail(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>ID:</strong><span>#{showDetail.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Usuario:</strong><span>{showDetail.usuario}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Email:</strong><span>{showDetail.usuarioId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Rol:</strong><span>{showDetail.rol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Acción:</strong><span>{showDetail.accion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Entidad:</strong><span>{showDetail.entidad}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>ID Entidad:</strong><span>{showDetail.entidadId || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Fecha:</strong><span>{showDetail.fecha}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>IP:</strong><span>{showDetail.ip}</span>
              </div>
              <div style={{ padding: '10px 0' }}>
                <strong>Detalle:</strong>
                <p style={{ margin: '5px 0 0 0', color: '#666', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>{showDetail.detalle}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;