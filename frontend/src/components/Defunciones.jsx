import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Defunciones = () => {
  const auth = useAuth();
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [defunciones, setDefunciones] = useState([
    {
      id: 1,
      nombres: 'Pedro Emilio', apellidos: 'Aguilón Agredo',
      fecha_nacimiento: '1945-03-15', lugar_nacimiento: 'Tibú',
      numero_documento: '88207661', edad: 79,
      fecha_defuncion: '2026-03-12', hora_defuncion: '14:30',
      lugar_defuncion: 'Corregimiento de San Faustino',
      causa_defuncion: 'Causas naturales',
      tipo_muerte: 'natural',
      medico_certifica: 'Dr. Carlos Ruiz',
      nombre_familiar: 'Oscar Aguilón Agredo',
      documento_familiar: '88207662', telefono_familiar: '3132346413',
      parroquia: 'sanfaustino', sacerdote: 'Padre Víctor Hugo Peña Pérez',
      tipo_servicio: 'boveda',
      cementerio: 'Cementerio Nuestra Señora del Carmen',
      ubicacion: 'Corregimiento de San Faustino',
      contrato_numero: 'CB-001',
      valor_servicio: 850000,
      pago_abono1: 300000, pago_abono2: 0, pago_abono3: 0,
      requisitos: { certificado_defuncion: true, medicina_legal: false, fotocopia_difunto: true, fotocopia_familiar: true },
      libro: 'Libro D-01', folio: 'F-05', numero: 'D-001',
      estado_expediente: 'celebrado', notas: 'Bóveda por 5 años'
    },
    {
      id: 2,
      nombres: 'Juan', apellidos: 'Rodríguez Pérez',
      fecha_nacimiento: '1950-07-22', lugar_nacimiento: 'Cúcuta',
      numero_documento: '23456789', edad: 75,
      fecha_defuncion: '2026-02-08', hora_defuncion: '08:15',
      lugar_defuncion: 'Clínica Santa Ana',
      causa_defuncion: 'Insuficiencia respiratoria',
      tipo_muerte: 'natural',
      medico_certifica: 'Dra. María Torres',
      nombre_familiar: 'María Rodríguez',
      documento_familiar: '1090123456', telefono_familiar: '3001234567',
      parroquia: 'tibu', sacerdote: 'Padre Juan Pérez',
      tipo_servicio: 'osario',
      cementerio: 'Cementerio Central de Tibú',
      ubicacion: 'Tibú',
      contrato_numero: 'CO-001',
      valor_servicio: 550000,
      pago_abono1: 550000, pago_abono2: 0, pago_abono3: 0,
      requisitos: { certificado_defuncion: true, medicina_legal: false, fotocopia_difunto: true, fotocopia_familiar: true },
      libro: 'Libro D-02', folio: 'F-03', numero: 'D-002',
      estado_expediente: 'celebrado', notas: ''
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterServicio, setFilterServicio] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCertificate, setShowCertificate] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    nombres: '', apellidos: '',
    fecha_nacimiento: '', lugar_nacimiento: '', numero_documento: '', edad: '',
    fecha_defuncion: '', hora_defuncion: '', lugar_defuncion: '',
    causa_defuncion: '', tipo_muerte: 'natural', medico_certifica: '',
    nombre_familiar: '', documento_familiar: '', telefono_familiar: '',
    parroquia: 'tibu', sacerdote: '',
    tipo_servicio: 'boveda', cementerio: '', ubicacion: '', contrato_numero: '',
    valor_servicio: 850000,
    pago_abono1: 0, pago_abono2: 0, pago_abono3: 0,
    requisitos: { certificado_defuncion: false, medicina_legal: false, fotocopia_difunto: false, fotocopia_familiar: false },
    libro: '', folio: '', numero: '',
    estado_expediente: 'incompleto', notas: ''
  });

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  const servicios = [
    { id: 'boveda', label: '🏛️ Bóveda', valor: 850000 },
    { id: 'osario', label: '⚱️ Osario', valor: 550000 },
    { id: 'traslado', label: '🚚 Traslado', valor: 0 },
    { id: 'sin_servicio', label: '❌ Sin servicio', valor: 0 },
  ];

  const requisitosList = [
    { key: 'certificado_defuncion', label: 'Certificado de Defunción' },
    { key: 'medicina_legal', label: 'Medicina Legal (muerte violenta)' },
    { key: 'fotocopia_difunto', label: 'Fotocopia Documento del Difunto' },
    { key: 'fotocopia_familiar', label: 'Fotocopia Documento del Familiar' },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const calcularSaldo = (data) => {
    const total = (Number(data.pago_abono1) || 0) + (Number(data.pago_abono2) || 0) + (Number(data.pago_abono3) || 0);
    return Number(data.valor_servicio) - total;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingItem) {
      const updated = defunciones.map(d => d.id === editingItem.id ? { ...d, ...formData } : d);
      setDefunciones(updated);
      registrarAuditoria('MODIFICAR', 'defunciones', editingItem.id, 'Defunción modificada: ' + formData.nombres);
      showToast('✅ Defunción actualizada');
    } else {
      const nueva = { id: Math.max(...defunciones.map(d => d.id), 0) + 1, ...formData };
      setDefunciones([nueva, ...defunciones]);
      registrarAuditoria('CREAR', 'defunciones', nueva.id, 'Defunción registrada: ' + formData.nombres);
      showToast('✅ Defunción registrada');
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setDefunciones(defunciones.filter(d => d.id !== deleteConfirm.id));
    showToast('🗑️ Defunción eliminada', 'warning');
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombres: '', apellidos: '',
      fecha_nacimiento: '', lugar_nacimiento: '', numero_documento: '', edad: '',
      fecha_defuncion: '', hora_defuncion: '', lugar_defuncion: '',
      causa_defuncion: '', tipo_muerte: 'natural', medico_certifica: '',
      nombre_familiar: '', documento_familiar: '', telefono_familiar: '',
      parroquia: 'tibu', sacerdote: '',
      tipo_servicio: 'boveda', cementerio: '', ubicacion: '', contrato_numero: '',
      valor_servicio: 850000,
      pago_abono1: 0, pago_abono2: 0, pago_abono3: 0,
      requisitos: { certificado_defuncion: false, medicina_legal: false, fotocopia_difunto: false, fotocopia_familiar: false },
      libro: '', folio: '', numero: '',
      estado_expediente: 'incompleto', notas: ''
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const toggleRequisito = (key) => {
    setFormData({ ...formData, requisitos: { ...formData.requisitos, [key]: !formData.requisitos[key] } });
  };

  const filtered = defunciones.filter(d => {
    const matchSearch = !searchTerm ||
      d.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.numero_documento.includes(searchTerm);
    const matchServicio = filterServicio === 'todos' || d.tipo_servicio === filterServicio;
    return matchSearch && matchServicio;
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

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #616161 0%, #212121 100%)',
        borderRadius: '20px', padding: '30px', color: 'white', marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(97, 97, 97, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🕊️ Registro de Defunciones</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Servicios exequiales y certificados de defunción
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{
            background: 'white', color: '#212121', border: 'none', padding: '14px 28px',
            borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>➕ Nueva Defunción</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #616161' }}>
          <div style={{ fontSize: '24px' }}>🕊️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{defunciones.length}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Total Defunciones</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #4FC3F7' }}>
          <div style={{ fontSize: '24px' }}>🏛️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{defunciones.filter(d => d.tipo_servicio === 'boveda').length}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Bóvedas</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #FF9800' }}>
          <div style={{ fontSize: '24px' }}>⚱️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{defunciones.filter(d => d.tipo_servicio === 'osario').length}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Osarios</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #dc3545' }}>
          <div style={{ fontSize: '24px' }}>💰</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>${defunciones.reduce((s, d) => s + calcularSaldo(d), 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Saldos Pendientes</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px', background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input type="text" placeholder="Buscar por nombre o documento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }} />
        </div>
        <select value={filterServicio} onChange={(e) => setFilterServicio(e.target.value)} style={{ padding: '10px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <option value="todos">Todos los servicios</option>
          <option value="boveda">Bóveda</option>
          <option value="osario">Osario</option>
          <option value="traslado">Traslado</option>
          <option value="sin_servicio">Sin servicio</option>
        </select>
      </div>

      {/* Grid de tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filtered.map(d => {
          const estado = getEstadoColor(d.estado_expediente);
          const req = Object.values(d.requisitos || {}).filter(v => v === true).length;
          const porcentaje = Math.round((req / 4) * 100);
          const saldo = calcularSaldo(d);
          return (
            <div key={d.id} style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', borderTop: `4px solid ${d.tipo_servicio === 'boveda' ? '#4FC3F7' : d.tipo_servicio === 'osario' ? '#FF9800' : '#9E9E9E'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '35px' }}>🕊️</span>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: estado.bg, color: estado.color }}>{estado.label}</span>
              </div>
              <h3 style={{ margin: '0', fontSize: '16px', color: '#2c3e50' }}>{d.nombres} {d.apellidos}</h3>
              <p style={{ color: '#616161', fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{d.numero}</p>

              <div style={{ fontSize: '12px', color: '#666', margin: '10px 0' }}>
                <div>📅 Defunción: {d.fecha_defuncion}</div>
                <div>👤 Edad: {d.edad} años</div>
                <div>⛪ {parroquias.find(p => p.id === d.parroquia)?.nombre}</div>
                <div>💀 {d.causa_defuncion}</div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {d.tipo_servicio === 'boveda' ? '🏛️ Bóveda' : d.tipo_servicio === 'osario' ? '⚱️ Osario' : d.tipo_servicio === 'traslado' ? '🚚 Traslado' : '❌ Sin servicio'}
                  </span>
                  <span style={{ fontSize: '12px', color: saldo > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                    {saldo > 0 ? `Saldo: $${saldo.toLocaleString()}` : '✅ Pagado'}
                  </span>
                </div>
              </div>

              <div style={{ margin: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>📋 Requisitos</span>
                  <span>{req}/4</span>
                </div>
                <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${porcentaje}%`, background: porcentaje === 100 ? '#4CAF50' : porcentaje >= 50 ? '#FF9800' : '#f44336' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button onClick={() => setViewingItem(d)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>👁️ Ver</button>
                <button onClick={() => setShowCertificate(d)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>📄 Certificado</button>
                <button onClick={() => handleEdit(d)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                <button onClick={() => setDeleteConfirm(d)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🕊️</div>
            <p>No hay defunciones registradas</p>
          </div>
        )}
      </div>

      {/* MODAL NUEVO/EDITAR */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '95%', maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #616161 0%, #212121 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{editingItem ? '✏️ Editar' : '➕ Nueva'} Defunción</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {/* DATOS DEL DIFUNTO */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>👤 Datos del Difunto</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombres *</label><input type="text" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} required style={inputStyle} placeholder="Ej: Pedro Emilio" /></div>
                <div><label style={labelStyle}>Apellidos *</label><input type="text" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required style={inputStyle} placeholder="Ej: Aguilón Agredo" /></div>
                <div><label style={labelStyle}>Documento</label><input type="text" value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} style={inputStyle} placeholder="Ej: 88207661" /></div>
                <div><label style={labelStyle}>Fecha Nacimiento</label><input type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Lugar Nacimiento</label><input type="text" value={formData.lugar_nacimiento} onChange={(e) => setFormData({...formData, lugar_nacimiento: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Edad</label><input type="number" value={formData.edad} onChange={(e) => setFormData({...formData, edad: e.target.value})} style={inputStyle} placeholder="Ej: 79" /></div>
              </div>

              {/* DATOS DE LA DEFUNCIÓN */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>💀 Datos de la Defunción</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Fecha Defunción *</label><input type="date" value={formData.fecha_defuncion} onChange={(e) => setFormData({...formData, fecha_defuncion: e.target.value})} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Hora Defunción</label><input type="time" value={formData.hora_defuncion} onChange={(e) => setFormData({...formData, hora_defuncion: e.target.value})} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Lugar Defunción</label><input type="text" value={formData.lugar_defuncion} onChange={(e) => setFormData({...formData, lugar_defuncion: e.target.value})} style={inputStyle} placeholder="Ej: Clínica Santa Ana" /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Causa de Defunción *</label><input type="text" value={formData.causa_defuncion} onChange={(e) => setFormData({...formData, causa_defuncion: e.target.value})} required style={inputStyle} placeholder="Ej: Infarto, Vejez, etc." /></div>
                <div><label style={labelStyle}>Tipo de Muerte</label>
                  <select value={formData.tipo_muerte} onChange={(e) => setFormData({...formData, tipo_muerte: e.target.value})} style={inputStyle}>
                    <option value="natural">Natural</option>
                    <option value="violenta">Violenta</option>
                    <option value="accidente">Accidente</option>
                    <option value="enfermedad">Enfermedad</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Médico que Certifica</label><input type="text" value={formData.medico_certifica} onChange={(e) => setFormData({...formData, medico_certifica: e.target.value})} style={inputStyle} /></div>
              </div>

              {/* FAMILIAR RESPONSABLE */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>👨‍👩‍👧 Familiar Responsable</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombre del Familiar</label><input type="text" value={formData.nombre_familiar} onChange={(e) => setFormData({...formData, nombre_familiar: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Documento Familiar</label><input type="text" value={formData.documento_familiar} onChange={(e) => setFormData({...formData, documento_familiar: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Teléfono Familiar</label><input type="tel" value={formData.telefono_familiar} onChange={(e) => setFormData({...formData, telefono_familiar: e.target.value})} style={inputStyle} /></div>
              </div>

              {/* DATOS ECLESIÁSTICOS */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>⛪ Datos Eclesiásticos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Parroquia</label>
                  <select value={formData.parroquia} onChange={(e) => setFormData({...formData, parroquia: e.target.value})} style={inputStyle}>
                    {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Sacerdote</label><input type="text" value={formData.sacerdote} onChange={(e) => setFormData({...formData, sacerdote: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Libro</label><input type="text" value={formData.libro} onChange={(e) => setFormData({...formData, libro: e.target.value})} style={inputStyle} placeholder="Ej: Libro D-01" /></div>
                <div><label style={labelStyle}>Folio</label><input type="text" value={formData.folio} onChange={(e) => setFormData({...formData, folio: e.target.value})} style={inputStyle} placeholder="Ej: F-05" /></div>
                <div><label style={labelStyle}>Número</label><input type="text" value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} style={inputStyle} placeholder="Ej: D-001" /></div>
              </div>

              {/* SERVICIO DE CEMENTERIO */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>🪦 Servicio de Cementerio</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Tipo de Servicio</label>
                  <select value={formData.tipo_servicio} onChange={(e) => {
                    const servicio = servicios.find(s => s.id === e.target.value);
                    setFormData({...formData, tipo_servicio: e.target.value, valor_servicio: servicio.valor});
                  }} style={inputStyle}>
                    {servicios.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Cementerio</label><input type="text" value={formData.cementerio} onChange={(e) => setFormData({...formData, cementerio: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Ubicación</label><input type="text" value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>N° Contrato</label><input type="text" value={formData.contrato_numero} onChange={(e) => setFormData({...formData, contrato_numero: e.target.value})} style={inputStyle} /></div>
              </div>

              {/* REQUISITOS */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>✅ Requisitos (Checklist)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                {requisitosList.map(req => (
                  <label key={req.key} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                    padding: '10px', background: formData.requisitos[req.key] ? '#d4edda' : '#f8f9fa',
                    borderRadius: '8px', border: `2px solid ${formData.requisitos[req.key] ? '#28a745' : '#e0e0e0'}`
                  }}>
                    <input type="checkbox" checked={formData.requisitos[req.key]} onChange={() => toggleRequisito(req.key)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '12px' }}>{req.label}</span>
                  </label>
                ))}
              </div>

              {/* PAGOS */}
              <h3 style={{ fontSize: '15px', color: '#212121', marginBottom: '12px', paddingBottom: '5px', borderBottom: '2px solid #f0f0f0' }}>💰 Pagos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                <div><label style={labelStyle}>Valor Total</label><input type="number" value={formData.valor_servicio} onChange={(e) => setFormData({...formData, valor_servicio: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 1</label><input type="number" value={formData.pago_abono1} onChange={(e) => setFormData({...formData, pago_abono1: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 2</label><input type="number" value={formData.pago_abono2} onChange={(e) => setFormData({...formData, pago_abono2: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 3</label><input type="number" value={formData.pago_abono3} onChange={(e) => setFormData({...formData, pago_abono3: Number(e.target.value)})} style={inputStyle} /></div>
              </div>

              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                <strong>Saldo Pendiente: ${calcularSaldo(formData).toLocaleString()}</strong>
              </div>

              {/* ESTADO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Estado Expediente</label>
                  <select value={formData.estado_expediente} onChange={(e) => setFormData({...formData, estado_expediente: e.target.value})} style={inputStyle}>
                    <option value="incompleto">❌ Incompleto</option>
                    <option value="en_revision">⏳ En Revisión</option>
                    <option value="completo">📋 Completo</option>
                    <option value="celebrado">✅ Celebrado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #616161 0%, #212121 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 {editingItem ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER */}
      {viewingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setViewingItem(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '95%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #616161 0%, #212121 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>👁️ Detalles de la Defunción</h2>
              <button onClick={() => setViewingItem(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#212121', marginBottom: '10px' }}>👤 Datos del Difunto</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Nombre:</strong> {viewingItem.nombres} {viewingItem.apellidos}</div>
                <div><strong>Documento:</strong> {viewingItem.numero_documento}</div>
                <div><strong>Nacimiento:</strong> {viewingItem.fecha_nacimiento}</div>
                <div><strong>Edad:</strong> {viewingItem.edad} años</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#212121', marginBottom: '10px' }}>💀 Datos de la Defunción</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Fecha:</strong> {viewingItem.fecha_defuncion}</div>
                <div><strong>Hora:</strong> {viewingItem.hora_defuncion}</div>
                <div><strong>Lugar:</strong> {viewingItem.lugar_defuncion}</div>
                <div><strong>Causa:</strong> {viewingItem.causa_defuncion}</div>
                <div><strong>Tipo:</strong> {viewingItem.tipo_muerte}</div>
                <div><strong>Médico:</strong> {viewingItem.medico_certifica}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#212121', marginBottom: '10px' }}>👨‍👩‍👧 Familiar</h3>
              <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Nombre:</strong> {viewingItem.nombre_familiar}</div>
                <div><strong>Documento:</strong> {viewingItem.documento_familiar}</div>
                <div><strong>Teléfono:</strong> {viewingItem.telefono_familiar}</div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#212121', marginBottom: '10px' }}>🪦 Servicio</h3>
              <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                <div><strong>Tipo:</strong> {viewingItem.tipo_servicio}</div>
                <div><strong>Cementerio:</strong> {viewingItem.cementerio}</div>
                <div><strong>Contrato:</strong> {viewingItem.contrato_numero}</div>
                <div><strong>Valor:</strong> ${viewingItem.valor_servicio?.toLocaleString()}</div>
                <div><strong>Saldo:</strong> <span style={{ color: calcularSaldo(viewingItem) > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>${calcularSaldo(viewingItem).toLocaleString()}</span></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#212121', marginBottom: '10px' }}>✅ Requisitos</h3>
              <div style={{ fontSize: '12px' }}>
                {requisitosList.map(req => (
                  <div key={req.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span>{req.label}</span>
                    <span style={{ color: viewingItem.requisitos?.[req.key] ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                      {viewingItem.requisitos?.[req.key] ? '✅ Sí' : '❌ No'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CERTIFICADO */}
      {showCertificate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500 }} onClick={() => setShowCertificate(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '95%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ border: '4px double #212121', padding: '40px', textAlign: 'center', background: '#fafafa' }}>
              <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#666' }}>DIÓCESIS DE TIBÚ</div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>Parroquia {parroquias.find(p => p.id === showCertificate.parroquia)?.nombre}</div>
              <h1 style={{ fontSize: '22px', color: '#212121', margin: '15px 0' }}>CERTIFICADO DE DEFUNCIÓN</h1>
              <div style={{ width: '100px', height: '2px', background: '#212121', margin: '20px auto' }}></div>
              <p style={{ fontSize: '14px' }}>Certificamos que:</p>
              <h2 style={{ fontSize: '20px', color: '#212121', fontStyle: 'italic', margin: '15px 0' }}>{showCertificate.nombres} {showCertificate.apellidos}</h2>
              <p style={{ fontSize: '14px' }}>Falleció el día <strong>{showCertificate.fecha_defuncion}</strong> a las <strong>{showCertificate.hora_defuncion}</strong></p>
              <p style={{ fontSize: '14px' }}>En <strong>{showCertificate.lugar_defuncion}</strong></p>
              <p style={{ fontSize: '14px' }}>Causa: <strong>{showCertificate.causa_defuncion}</strong></p>
              <p style={{ fontSize: '14px' }}>A la edad de <strong>{showCertificate.edad} años</strong></p>
              <p style={{ fontSize: '14px' }}>Siendo sepultado en <strong>{showCertificate.cementerio}</strong></p>
              <div style={{ background: '#f0f0f0', padding: '12px', margin: '20px 0', borderRadius: '5px', fontSize: '13px' }}>
                <strong>Libro:</strong> {showCertificate.libro} | <strong>Folio:</strong> {showCertificate.folio} | <strong>N°:</strong> {showCertificate.numero}
              </div>
              <p style={{ fontSize: '14px' }}>Ministro: <strong>{showCertificate.sacerdote}</strong></p>
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

export default Defunciones;