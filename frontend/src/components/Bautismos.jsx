import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Bautismos = () => {
  const auth = useAuth();
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [bautismos, setBautismos] = useState([
    {
      id: 1,
      nombres: 'María José', apellidos: 'García López',
      fecha_nacimiento: '2023-05-15', lugar_nacimiento: 'Tibú', numero_documento: '123456789',
      nombre_padre: 'Carlos García', nombre_madre: 'Ana López',
      abuelo_paterno: 'José García', abuela_paterna: 'María Rodríguez',
      abuelo_materno: 'Pedro López', abuela_materna: 'Carmen Díaz',
      padrino: 'Miguel Sánchez', madrina: 'Rosa Ruiz',
      documento_padrino: '1090123456', documento_madrina: '1090654321',
      partida_padrino: 'Sí', partida_madrina: 'Sí',
      fecha_bautismo: '2023-08-20', parroquia: 'tibu', sacerdote: 'Padre Juan Pérez',
      libro: 'Libro 01', folio: 'F-25', numero: 'B-001',
      requisitos: { registro_civil: true, partida_padrinos: true, fotocopia_padrinos: true, datos_abuelos: true, boleta: true, diezmo: true },
      pago_boleta: 60000, pago_diezmo: 20000, estado_pago: 'completo',
      estado_expediente: 'celebrado', notas: ''
    },
    {
      id: 2,
      nombres: 'Juan Pablo', apellidos: 'Pérez Martínez',
      fecha_nacimiento: '2023-03-10', lugar_nacimiento: 'San Faustino', numero_documento: '987654321',
      nombre_padre: 'Luis Pérez', nombre_madre: 'Marta Martínez',
      abuelo_paterno: 'Juan Pérez', abuela_paterna: 'Rosa García',
      abuelo_materno: 'Carlos Martínez', abuela_materna: 'Elena Ruiz',
      padrino: 'Pedro Gómez', madrina: 'Lucía Torres',
      documento_padrino: '1090234567', documento_madrina: '1090765432',
      partida_padrino: 'Sí', partida_madrina: 'No',
      fecha_bautismo: '2023-06-15', parroquia: 'sanfaustino', sacerdote: 'Padre Carlos Ruiz',
      libro: 'Libro 02', folio: 'F-10', numero: 'B-002',
      requisitos: { registro_civil: true, partida_padrinos: false, fotocopia_padrinos: true, datos_abuelos: true, boleta: false, diezmo: false },
      pago_boleta: 0, pago_diezmo: 0, estado_pago: 'pendiente',
      estado_expediente: 'en_revision', notas: 'Falta partida de la madrina'
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingBautismo, setEditingBautismo] = useState(null);
  const [viewingBautismo, setViewingBautismo] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCertificate, setShowCertificate] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', fecha_nacimiento: '', lugar_nacimiento: '', numero_documento: '',
    nombre_padre: '', nombre_madre: '',
    abuelo_paterno: '', abuela_paterna: '', abuelo_materno: '', abuela_materna: '',
    padrino: '', madrina: '', documento_padrino: '', documento_madrina: '',
    partida_padrino: 'No', partida_madrina: 'No',
    fecha_bautismo: '', parroquia: 'tibu', sacerdote: '',
    libro: '', folio: '', numero: '',
    requisitos: { registro_civil: false, partida_padrinos: false, fotocopia_padrinos: false, datos_abuelos: false, boleta: false, diezmo: false },
    pago_boleta: 0, pago_diezmo: 0, estado_pago: 'pendiente',
    estado_expediente: 'incompleto', notas: ''
  });

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  const requisitosList = [
    { key: 'registro_civil', label: 'Registro Civil Original del niño(a)', icon: '📄' },
    { key: 'partida_padrinos', label: 'Partida de Confirmación de los Padrinos', icon: '📜' },
    { key: 'fotocopia_padrinos', label: 'Fotocopia documento de los Padrinos', icon: '🪪' },
    { key: 'datos_abuelos', label: 'Datos completos abuelos paternos y maternos', icon: '👴' },
    { key: 'boleta', label: 'Boleta de Bautizo (cancela padrinos) - $60.000', icon: '🎟️' },
    { key: 'diezmo', label: 'Diezmo (lo da los papás del bautizado)', icon: '💵' },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const contarRequisitos = (requisitos) => {
    if (!requisitos) return { completos: 0, total: 6 };
    const completos = Object.values(requisitos).filter(v => v === true).length;
    return { completos, total: 6 };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingBautismo) {
      const updated = bautismos.map(b => b.id === editingBautismo.id ? { ...b, ...formData } : b);
      setBautismos(updated);
      registrarAuditoria('MODIFICAR', 'bautismos', editingBautismo.id, 'Bautismo modificado: ' + formData.nombres);
      showToast('✅ Bautismo actualizado');
    } else {
      const nuevo = { id: bautismos.length + 1, ...formData };
      setBautismos([nuevo, ...bautismos]);
      registrarAuditoria('CREAR', 'bautismos', nuevo.id, 'Bautismo registrado: ' + formData.nombres);
      showToast('✅ Bautismo registrado');
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setBautismos(bautismos.filter(b => b.id !== deleteConfirm.id));
    showToast('🗑️ Bautismo eliminado', 'warning');
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombres: '', apellidos: '', fecha_nacimiento: '', lugar_nacimiento: '', numero_documento: '',
      nombre_padre: '', nombre_madre: '',
      abuelo_paterno: '', abuela_paterna: '', abuelo_materno: '', abuela_materna: '',
      padrino: '', madrina: '', documento_padrino: '', documento_madrina: '',
      partida_padrino: 'No', partida_madrina: 'No',
      fecha_bautismo: '', parroquia: 'tibu', sacerdote: '',
      libro: '', folio: '', numero: '',
      requisitos: { registro_civil: false, partida_padrinos: false, fotocopia_padrinos: false, datos_abuelos: false, boleta: false, diezmo: false },
      pago_boleta: 0, pago_diezmo: 0, estado_pago: 'pendiente',
      estado_expediente: 'incompleto', notas: ''
    });
    setEditingBautismo(null);
  };

  const handleEdit = (b) => {
    setEditingBautismo(b);
    setFormData({ ...b });
    setShowModal(true);
  };

  const toggleRequisito = (key) => {
    setFormData({ ...formData, requisitos: { ...formData.requisitos, [key]: !formData.requisitos[key] } });
  };

  const filtered = bautismos.filter(b => {
    const matchSearch = !searchTerm ||
      b.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.numero_documento.includes(searchTerm);
    const matchEstado = filterEstado === 'todos' || b.estado_expediente === filterEstado;
    return matchSearch && matchEstado;
  });

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'celebrado': return { bg: '#d4edda', color: '#155724', label: '✅ Celebrado' };
      case 'completo': return { bg: '#d1ecf1', color: '#0c5460', label: '📋 Completo' };
      case 'en_revision': return { bg: '#fff3cd', color: '#856404', label: '⏳ En Revisión' };
      default: return { bg: '#f8d7da', color: '#721c24', label: '❌ Incompleto' };
    }
  };

  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#333' };
  const inputStyle = { width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>{toast.message}</div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
        borderRadius: '20px', padding: '30px', color: 'white', marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(79, 195, 247, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>💧 Registro de Bautismos</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Diócesis de Tibú - Requisitos oficiales
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{
            background: 'white', color: '#0288D1', border: 'none', padding: '14px 28px',
            borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>➕ Nuevo Bautismo</button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }} />
        </div>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} style={{ padding: '10px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <option value="todos">Todos los estados</option>
          <option value="incompleto">Incompleto</option>
          <option value="en_revision">En Revisión</option>
          <option value="completo">Completo</option>
          <option value="celebrado">Celebrado</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filtered.map(b => {
          const estado = getEstadoColor(b.estado_expediente);
          const req = contarRequisitos(b.requisitos);
          const porcentaje = Math.round((req.completos / req.total) * 100);
          return (
            <div key={b.id} style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '35px' }}>💧</span>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: estado.bg, color: estado.color }}>{estado.label}</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '16px', color: '#2c3e50' }}>{b.nombres} {b.apellidos}</h3>
              <p style={{ color: '#0288D1', fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{b.numero}</p>
              <div style={{ fontSize: '12px', color: '#666', margin: '8px 0' }}>
                <div>📅 {b.fecha_bautismo}</div>
                <div>⛪ {parroquias.find(p => p.id === b.parroquia)?.nombre}</div>
              </div>

              <div style={{ margin: '10px 0', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>📋 Requisitos</span>
                  <span>{req.completos}/{req.total}</span>
                </div>
                <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${porcentaje}%`, background: porcentaje === 100 ? '#4CAF50' : porcentaje >= 50 ? '#FF9800' : '#f44336' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button onClick={() => setViewingBautismo(b)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>👁️ Ver</button>
                <button onClick={() => setShowCertificate(b)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>📄</button>
                <button onClick={() => handleEdit(b)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                <button onClick={() => setDeleteConfirm(b)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL NUEVO/EDITAR */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '95%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{editingBautismo ? '✏️ Editar' : '➕ Nuevo'} Bautismo</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👶 Datos del Bautizado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombres *</label><input type="text" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Apellidos *</label><input type="text" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha Nacimiento</label><input type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Lugar Nacimiento</label><input type="text" value={formData.lugar_nacimiento} onChange={(e) => setFormData({...formData, lugar_nacimiento: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Registro Civil N°</label><input type="text" value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👨‍👩‍👧 Padres</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombre del Padre</label><input type="text" value={formData.nombre_padre} onChange={(e) => setFormData({...formData, nombre_padre: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Nombre de la Madre</label><input type="text" value={formData.nombre_madre} onChange={(e) => setFormData({...formData, nombre_madre: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👴 Abuelos Paternos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div><label style={labelStyle}>Abuelo Paterno</label><input type="text" value={formData.abuelo_paterno} onChange={(e) => setFormData({...formData, abuelo_paterno: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abuela Paterna</label><input type="text" value={formData.abuela_paterna} onChange={(e) => setFormData({...formData, abuela_paterna: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👵 Abuelos Maternos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Abuelo Materno</label><input type="text" value={formData.abuelo_materno} onChange={(e) => setFormData({...formData, abuelo_materno: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abuela Materna</label><input type="text" value={formData.abuela_materna} onChange={(e) => setFormData({...formData, abuela_materna: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👥 Padrinos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Padrino</label><input type="text" value={formData.padrino} onChange={(e) => setFormData({...formData, padrino: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Documento Padrino</label><input type="text" value={formData.documento_padrino} onChange={(e) => setFormData({...formData, documento_padrino: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Madrina</label><input type="text" value={formData.madrina} onChange={(e) => setFormData({...formData, madrina: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Documento Madrina</label><input type="text" value={formData.documento_madrina} onChange={(e) => setFormData({...formData, documento_madrina: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Partida Confirmación Padrino</label>
                  <select value={formData.partida_padrino} onChange={(e) => setFormData({...formData, partida_padrino: e.target.value})} style={inputStyle}><option value="No">No</option><option value="Sí">Sí</option></select>
                </div>
                <div><label style={labelStyle}>Partida Confirmación Madrina</label>
                  <select value={formData.partida_madrina} onChange={(e) => setFormData({...formData, partida_madrina: e.target.value})} style={inputStyle}><option value="No">No</option><option value="Sí">Sí</option></select>
                </div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>⛪ Datos Eclesiásticos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Fecha de Bautismo *</label><input type="date" value={formData.fecha_bautismo} onChange={(e) => setFormData({...formData, fecha_bautismo: e.target.value})} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Parroquia</label>
                  <select value={formData.parroquia} onChange={(e) => setFormData({...formData, parroquia: e.target.value})} style={inputStyle}>
                    {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Sacerdote</label><input type="text" value={formData.sacerdote} onChange={(e) => setFormData({...formData, sacerdote: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Libro</label><input type="text" value={formData.libro} onChange={(e) => setFormData({...formData, libro: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Folio</label><input type="text" value={formData.folio} onChange={(e) => setFormData({...formData, folio: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Número</label><input type="text" value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>✅ Requisitos (Checklist)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                {requisitosList.map(req => (
                  <label key={req.key} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                    padding: '10px', background: formData.requisitos[req.key] ? '#d4edda' : '#f8f9fa',
                    borderRadius: '8px', border: `2px solid ${formData.requisitos[req.key] ? '#28a745' : '#e0e0e0'}`
                  }}>
                    <input type="checkbox" checked={formData.requisitos[req.key]} onChange={() => toggleRequisito(req.key)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '12px' }}>{req.icon} {req.label}</span>
                  </label>
                ))}
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>💰 Pagos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Pago Boleta</label><input type="number" value={formData.pago_boleta} onChange={(e) => setFormData({...formData, pago_boleta: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Pago Diezmo</label><input type="number" value={formData.pago_diezmo} onChange={(e) => setFormData({...formData, pago_diezmo: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Estado de Pago</label>
                  <select value={formData.estado_pago} onChange={(e) => setFormData({...formData, estado_pago: e.target.value})} style={inputStyle}>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="completo">Completo</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Estado Expediente</label>
                  <select value={formData.estado_expediente} onChange={(e) => setFormData({...formData, estado_expediente: e.target.value})} style={inputStyle}>
                    <option value="incompleto">Incompleto</option>
                    <option value="en_revision">En Revisión</option>
                    <option value="completo">Completo</option>
                    <option value="celebrado">Celebrado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 {editingBautismo ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER */}
      {viewingBautismo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setViewingBautismo(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '95%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>👁️ Detalles del Bautismo</h2>
              <button onClick={() => setViewingBautismo(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👶 Datos del Bautizado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Nombres:</strong> {viewingBautismo.nombres} {viewingBautismo.apellidos}</div>
                <div><strong>Nacimiento:</strong> {viewingBautismo.fecha_nacimiento} en {viewingBautismo.lugar_nacimiento}</div>
                <div><strong>Registro Civil:</strong> {viewingBautismo.numero_documento}</div>
                <div><strong>Bautismo:</strong> {viewingBautismo.fecha_bautismo}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👨‍👩‍👧 Padres y Abuelos</h3>
              <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Padre:</strong> {viewingBautismo.nombre_padre}</div>
                <div><strong>Madre:</strong> {viewingBautismo.nombre_madre}</div>
                <div><strong>Abuelos Paternos:</strong> {viewingBautismo.abuelo_paterno} y {viewingBautismo.abuela_paterna}</div>
                <div><strong>Abuelos Maternos:</strong> {viewingBautismo.abuelo_materno} y {viewingBautismo.abuela_materna}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>👥 Padrinos</h3>
              <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Padrino:</strong> {viewingBautismo.padrino} ({viewingBautismo.documento_padrino}) - Partida: {viewingBautismo.partida_padrino}</div>
                <div><strong>Madrina:</strong> {viewingBautismo.madrina} ({viewingBautismo.documento_madrina}) - Partida: {viewingBautismo.partida_madrina}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>⛪ Datos Eclesiásticos</h3>
              <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Parroquia:</strong> {parroquias.find(p => p.id === viewingBautismo.parroquia)?.nombre}</div>
                <div><strong>Sacerdote:</strong> {viewingBautismo.sacerdote}</div>
                <div><strong>Libro:</strong> {viewingBautismo.libro} / <strong>Folio:</strong> {viewingBautismo.folio} / <strong>N°:</strong> {viewingBautismo.numero}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>✅ Requisitos</h3>
              <div style={{ fontSize: '12px', marginBottom: '15px' }}>
                {requisitosList.map(req => (
                  <div key={req.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span>{req.icon} {req.label}</span>
                    <span style={{ color: viewingBautismo.requisitos?.[req.key] ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                      {viewingBautismo.requisitos?.[req.key] ? '✅ Sí' : '❌ No'}
                    </span>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: '14px', color: '#0288D1', marginBottom: '10px' }}>💰 Pagos</h3>
              <div style={{ fontSize: '13px' }}>
                <div><strong>Boleta:</strong> ${viewingBautismo.pago_boleta?.toLocaleString()}</div>
                <div><strong>Diezmo:</strong> ${viewingBautismo.pago_diezmo?.toLocaleString()}</div>
                <div><strong>Estado:</strong> {viewingBautismo.estado_pago}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CERTIFICADO */}
      {showCertificate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500 }} onClick={() => setShowCertificate(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '95%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ border: '4px double #2c3e50', padding: '40px', textAlign: 'center', background: '#fdfcf7' }}>
              <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#666' }}>DIÓCESIS DE TIBÚ</div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>Parroquia {parroquias.find(p => p.id === showCertificate.parroquia)?.nombre}</div>
              <h1 style={{ fontSize: '22px', color: '#2c3e50', margin: '15px 0' }}>CERTIFICADO DE BAUTISMO</h1>
              <div style={{ width: '100px', height: '2px', background: '#2c3e50', margin: '20px auto' }}></div>
              <p style={{ fontSize: '14px' }}>Certificamos que:</p>
              <h2 style={{ fontSize: '20px', color: '#2c3e50', fontStyle: 'italic', margin: '15px 0' }}>{showCertificate.nombres} {showCertificate.apellidos}</h2>
              <p style={{ fontSize: '14px' }}>Recibió el Sacramento del Bautismo el día <strong>{showCertificate.fecha_bautismo}</strong></p>
              <p style={{ fontSize: '14px' }}>Siendo sus padres <strong>{showCertificate.nombre_padre}</strong> y <strong>{showCertificate.nombre_madre}</strong></p>
              <p style={{ fontSize: '14px' }}>Padrinos: <strong>{showCertificate.padrino}</strong> y <strong>{showCertificate.madrina}</strong></p>
              <p style={{ fontSize: '14px' }}>Ministro: <strong>{showCertificate.sacerdote}</strong></p>
              <div style={{ background: '#f8f9fa', padding: '12px', margin: '20px 0', borderRadius: '5px', fontSize: '13px' }}>
                <strong>Libro:</strong> {showCertificate.libro} | <strong>Folio:</strong> {showCertificate.folio} | <strong>N°:</strong> {showCertificate.numero}
              </div>
              <p style={{ fontSize: '12px', marginTop: '30px' }}>Fecha de emisión: {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
              <button onClick={() => window.print()} style={{ background: '#28a745', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Imprimir</button>
              <button onClick={() => setShowCertificate(null)} style={{ background: '#f0f0f0', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Eliminar registro?</h3>
            <p style={{ color: '#666' }}>{deleteConfirm.nombres} {deleteConfirm.apellidos}</p>
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

export default Bautismos;