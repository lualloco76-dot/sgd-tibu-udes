import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Usuarios = () => {
  const auth = useAuth();
  const getUsuarios = auth?.getUsuarios || (() => []);
  const saveUsuarios = auth?.saveUsuarios || (() => {});
  const cambiarPassword = auth?.cambiarPassword || (() => ({ success: false }));
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [passwordUsuario, setPasswordUsuario] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'consulta',
    parroquia: 'todas',
    activo: true
  });

  const [passwordData, setPasswordData] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  const roles = [
    { id: 'administrador', nombre: 'Administrador', icon: '👑' },
    { id: 'canciller', nombre: 'Canciller', icon: '✝️' },
    { id: 'secretario_general', nombre: 'Secretario General', icon: '📋' },
    { id: 'secretario_parroquial', nombre: 'Secretario Parroquial', icon: '⛪' },
    { id: 'consulta', nombre: 'Consulta', icon: '👁️' },
  ];

  const parroquias = [
    { id: 'todas', nombre: '🌍 Todas las parroquias' },
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  useEffect(() => {
    const usuariosList = getUsuarios();
    setUsuarios(usuariosList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let nuevosUsuarios = [...usuarios];

    if (editingUsuario) {
      nuevosUsuarios = usuarios.map(u => 
        u.id === editingUsuario.id ? { ...u, ...formData } : u
      );
      registrarAuditoria('EDITAR', 'usuarios', editingUsuario.id, 'Usuario actualizado: ' + formData.nombre);
      showToast('✅ Usuario actualizado correctamente');
    } else {
      const nuevo = {
        id: Math.max(...usuarios.map(u => u.id), 0) + 1,
        ...formData,
        creado_en: new Date().toISOString()
      };
      nuevosUsuarios = [...usuarios, nuevo];
      registrarAuditoria('CREAR', 'usuarios', nuevo.id, 'Usuario creado: ' + formData.nombre);
      showToast('✅ Usuario creado correctamente');
    }

    saveUsuarios(nuevosUsuarios);
    setUsuarios(nuevosUsuarios);
    setShowModal(false);
    resetForm();
  };

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (!passwordUsuario) return;

    if (passwordData.nueva !== passwordData.confirmar) {
      showToast('❌ Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    if (passwordData.nueva.length < 6) {
      showToast('❌ La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    const result = cambiarPassword(passwordUsuario.email, passwordData.actual, passwordData.nueva);

    if (result.success) {
      showToast('✅ Contraseña actualizada correctamente');
      registrarAuditoria('CAMBIO_PASSWORD', 'usuarios', passwordUsuario.id, 'Contraseña cambiada: ' + passwordUsuario.email);
      setShowPasswordModal(false);
      setPasswordUsuario(null);
      setPasswordData({ actual: '', nueva: '', confirmar: '' });
    } else {
      showToast('❌ ' + result.error, 'error');
    }
  };

  const openPasswordModal = (usuarioItem) => {
    setPasswordUsuario(usuarioItem);
    setPasswordData({ actual: '', nueva: '', confirmar: '' });
    setShowPasswordModal(true);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const nuevosUsuarios = usuarios.filter(u => u.id !== deleteConfirm.id);
    saveUsuarios(nuevosUsuarios);
    setUsuarios(nuevosUsuarios);
    registrarAuditoria('ELIMINAR', 'usuarios', deleteConfirm.id, 'Usuario eliminado: ' + deleteConfirm.nombre);
    showToast('🗑️ Usuario eliminado correctamente', 'warning');
    setDeleteConfirm(null);
  };

  const handleToggleActive = (usuarioItem) => {
    const nuevosUsuarios = usuarios.map(u => 
      u.id === usuarioItem.id ? { ...u, activo: !u.activo } : u
    );
    saveUsuarios(nuevosUsuarios);
    setUsuarios(nuevosUsuarios);
    showToast(`✅ Usuario ${usuarioItem.activo ? 'desactivado' : 'activado'}`);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'consulta',
      parroquia: 'todas',
      activo: true
    });
    setEditingUsuario(null);
  };

  const handleEdit = (usuarioItem) => {
    setEditingUsuario(usuarioItem);
    setFormData({
      nombre: usuarioItem.nombre,
      email: usuarioItem.email,
      password: usuarioItem.password || '',
      rol: usuarioItem.rol,
      parroquia: usuarioItem.parroquia,
      activo: usuarioItem.activo
    });
    setShowModal(true);
  };

  const filteredUsuarios = usuarios.filter(u => {
    const matchSearch = !searchTerm ||
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRol = filterRol === 'todos' || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const getRolInfo = (rolId) => roles.find(r => r.id === rolId) || { icon: '👤', nombre: rolId };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#f44336' : '#FF9800',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(244, 67, 54, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>👥 Gestión de Usuarios</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Administración de usuarios, roles y permisos del sistema
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{
            background: 'white', color: '#C62828', border: 'none', padding: '14px 28px',
            borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            ➕ Nuevo Usuario
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }} />
        </div>
        <select value={filterRol} onChange={(e) => setFilterRol(e.target.value)} style={{ padding: '10px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <option value="todos">Todos los roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.nombre}</option>)}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>Usuario</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Rol</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Parroquia</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map(u => {
              const rolInfo = getRolInfo(u.rol);
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{u.nombre}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ background: '#f0f0f0', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                      {rolInfo.icon} {rolInfo.nombre}
                    </span>
                  </td>
                  <td style={{ padding: '15px', color: '#666' }}>
                    {u.parroquia === 'todas' ? '🌍 Todas' : parroquias.find(p => p.id === u.parroquia)?.nombre || u.parroquia}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button onClick={() => handleToggleActive(u)} style={{
                      padding: '5px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                      background: u.activo ? '#d4edda' : '#f8d7da',
                      color: u.activo ? '#155724' : '#721c24'
                    }}>
                      {u.activo ? '✅ Activo' : '❌ Inactivo'}
                    </button>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(u)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }} title="Editar">✏️</button>
                      <button onClick={() => openPasswordModal(u)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }} title="Cambiar contraseña">🔑</button>
                      <button onClick={() => setDeleteConfirm(u)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }} title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)', borderRadius: '15px 15px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>
                {editingUsuario ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Nombre Completo *</label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={inputStyle} />
              </div>
              {!editingUsuario && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Contraseña *</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required style={inputStyle} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Rol *</label>
                  <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} required style={inputStyle}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.nombre}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Parroquia *</label>
                  <select value={formData.parroquia} onChange={(e) => setFormData({...formData, parroquia: e.target.value})} required style={inputStyle}>
                    {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '15px' }}>
                <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <span>Usuario activo</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 {editingUsuario ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && passwordUsuario && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowPasswordModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #17a2b8 0%, #117a8b 100%)', borderRadius: '15px 15px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>🔑 Cambiar Contraseña</h2>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <form onSubmit={handleChangePassword} style={{ padding: '20px' }}>
              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                <strong style={{ fontSize: '13px', color: '#004085' }}>👤 Usuario: {passwordUsuario.nombre}</strong>
                <div style={{ fontSize: '12px', color: '#004085' }}>📧 {passwordUsuario.email}</div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Contraseña Actual *</label>
                <input type="password" value={passwordData.actual} onChange={(e) => setPasswordData({...passwordData, actual: e.target.value})} required style={inputStyle} placeholder="Ingrese la contraseña actual" />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Nueva Contraseña *</label>
                <input type="password" value={passwordData.nueva} onChange={(e) => setPasswordData({...passwordData, nueva: e.target.value})} required style={inputStyle} placeholder="Mínimo 6 caracteres" />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Confirmar Nueva Contraseña *</label>
                <input type="password" value={passwordData.confirmar} onChange={(e) => setPasswordData({...passwordData, confirmar: e.target.value})} required style={inputStyle} placeholder="Repita la nueva contraseña" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #17a2b8 0%, #117a8b 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🔑 Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Eliminar usuario?</h3>
            <p style={{ color: '#666' }}>{deleteConfirm.nombre} ({deleteConfirm.email})</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 'bold',
  fontSize: '13px',
  color: '#333'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  border: '2px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none'
};

export default Usuarios;