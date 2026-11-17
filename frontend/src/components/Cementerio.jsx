import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Cementerio = () => {
  const auth = useAuth();
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [contratos, setContratos] = useState([
    {
      id: 1, numero: 'CB-001', tipo: 'Boveda',
      titular: 'Oscar Aguilón Agredo', documento: '88207661',
      difunto: 'Pedro Emilio Aguilón', documento_difunto: '12345678',
      fecha_contrato: '2026-03-15', fecha_defuncion: '2026-03-12',
      valor_total: 850000, abono1: 300000, abono2: 0, abono3: 0, abono4: 0, abono5: 0, abono6: 0,
      saldo: 550000, estado: 'activo', parroquia: 'sanfaustino',
      requisitos: { certificado_defuncion: true, medicina_legal: false, fotocopia_difunto: true, fotocopia_familiar: true },
      cementerio: 'Cementerio Nuestra Señora del Carmen', ubicacion: 'Corregimiento de San Faustino',
      notas: 'Bóveda adquirida por 5 años'
    },
    {
      id: 2, numero: 'CO-001', tipo: 'Osario',
      titular: 'María Rodríguez', documento: '1090123456',
      difunto: 'Juan Rodríguez', documento_difunto: '87654321',
      fecha_contrato: '2026-02-10', fecha_defuncion: '2026-02-08',
      valor_total: 550000, abono1: 550000, abono2: 0, abono3: 0, abono4: 0, abono5: 0, abono6: 0,
      saldo: 0, estado: 'activo', parroquia: 'tibu',
      requisitos: { certificado_defuncion: true, medicina_legal: false, fotocopia_difunto: true, fotocopia_familiar: true },
      cementerio: 'Cementerio Central de Tibú', ubicacion: 'Tibú',
      notas: ''
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [viewingContrato, setViewingContrato] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    tipo: 'Boveda', titular: '', documento: '', difunto: '', documento_difunto: '',
    fecha_contrato: '', fecha_defuncion: '',
    valor_total: 850000, abono1: 0, abono2: 0, abono3: 0, abono4: 0, abono5: 0, abono6: 0,
    parroquia: 'tibu', cementerio: '', ubicacion: '', notas: '',
    requisitos: { certificado_defuncion: false, medicina_legal: false, fotocopia_difunto: false, fotocopia_familiar: false }
  });

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
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
    const totalAbonos = (Number(data.abono1) || 0) + (Number(data.abono2) || 0) + (Number(data.abono3) || 0) + (Number(data.abono4) || 0) + (Number(data.abono5) || 0) + (Number(data.abono6) || 0);
    return Number(data.valor_total) - totalAbonos;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saldo = calcularSaldo(formData);
    const estado = saldo <= 0 ? 'pagado' : 'activo';

    if (editingContrato) {
      const updated = contratos.map(c => c.id === editingContrato.id ? { ...c, ...formData, saldo, estado } : c);
      setContratos(updated);
      registrarAuditoria('MODIFICAR', 'cementerio', editingContrato.id, 'Contrato modificado: ' + formData.titular);
      showToast('✅ Contrato actualizado');
    } else {
      const nuevo = {
        id: contratos.length + 1,
        numero: `C${formData.tipo === 'Boveda' ? 'B' : 'O'}-${String(contratos.length + 1).padStart(3, '0')}`,
        ...formData, saldo, estado
      };
      setContratos([nuevo, ...contratos]);
      registrarAuditoria('CREAR', 'cementerio', nuevo.id, 'Contrato creado: ' + formData.titular);
      showToast('✅ Contrato registrado');
    }
    setShowModal(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setContratos(contratos.filter(c => c.id !== deleteConfirm.id));
    showToast('🗑️ Contrato eliminado', 'warning');
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      tipo: 'Boveda', titular: '', documento: '', difunto: '', documento_difunto: '',
      fecha_contrato: '', fecha_defuncion: '',
      valor_total: 850000, abono1: 0, abono2: 0, abono3: 0, abono4: 0, abono5: 0, abono6: 0,
      parroquia: 'tibu', cementerio: '', ubicacion: '', notas: '',
      requisitos: { certificado_defuncion: false, medicina_legal: false, fotocopia_difunto: false, fotocopia_familiar: false }
    });
    setEditingContrato(null);
  };

  const handleEdit = (c) => { setEditingContrato(c); setFormData({ ...c }); setShowModal(true); };

  const toggleRequisito = (key) => {
    setFormData({ ...formData, requisitos: { ...formData.requisitos, [key]: !formData.requisitos[key] } });
  };

  const filtered = contratos.filter(c => 
    !searchTerm || c.titular.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.difunto.toLowerCase().includes(searchTerm.toLowerCase()) || c.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#333' };
  const inputStyle = { width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000, background: toast.type === 'success' ? '#4CAF50' : '#FF9800', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>{toast.message}</div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #37474F 0%, #263238 100%)', borderRadius: '20px', padding: '30px', color: 'white', marginBottom: '25px', boxShadow: '0 10px 30px rgba(55, 71, 79, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🪦 Servicios de Cementerio</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Contratos de Bóveda, Osario y Traslados</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{ background: 'white', color: '#263238', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Nuevo Contrato</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #4FC3F7' }}>
          <div style={{ fontSize: '24px' }}>🏛️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{contratos.filter(c => c.tipo === 'Boveda').length}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Bóvedas ($850.000)</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #FF9800' }}>
          <div style={{ fontSize: '24px' }}>⚱️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{contratos.filter(c => c.tipo === 'Osario').length}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Osarios ($550.000)</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #4CAF50' }}>
          <div style={{ fontSize: '24px' }}>💰</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>${contratos.reduce((s, c) => s + c.valor_total, 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Total Contratado</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #dc3545' }}>
          <div style={{ fontSize: '24px' }}>⚠️</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>${contratos.reduce((s, c) => s + c.saldo, 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Saldos Pendientes</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input type="text" placeholder="Buscar por titular, difunto o número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }} />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>N°</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Titular</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Difunto</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Valor</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Saldo</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#37474F' }}>{c.numero}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: c.tipo === 'Boveda' ? '#e3f2fd' : '#fff3e0', color: c.tipo === 'Boveda' ? '#1565C0' : '#E65100' }}>
                    {c.tipo === 'Boveda' ? '🏛️ Bóveda' : '⚱️ Osario'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{c.titular}<div style={{ fontSize: '11px', color: '#999' }}>{c.documento}</div></td>
                <td style={{ padding: '12px' }}>{c.difunto}</td>
                <td style={{ padding: '12px' }}>${c.valor_total.toLocaleString()}</td>
                <td style={{ padding: '12px', color: c.saldo > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>${c.saldo.toLocaleString()}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button onClick={() => setViewingContrato(c)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>👁️</button>
                    <button onClick={() => handleEdit(c)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => setDeleteConfirm(c)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVO/EDITAR */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '95%', maxWidth: '800px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #37474F 0%, #263238 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{editingContrato ? '✏️ Editar' : '➕ Nuevo'} Contrato</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>📋 Datos del Contrato</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Tipo *</label>
                  <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value, valor_total: e.target.value === 'Boveda' ? 850000 : 550000})} style={inputStyle}>
                    <option value="Boveda">🏛️ Bóveda ($850.000)</option>
                    <option value="Osario">⚱️ Osario ($550.000)</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Fecha Contrato</label><input type="date" value={formData.fecha_contrato} onChange={(e) => setFormData({...formData, fecha_contrato: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Parroquia</label>
                  <select value={formData.parroquia} onChange={(e) => setFormData({...formData, parroquia: e.target.value})} style={inputStyle}>
                    {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>👤 Titular</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombre Titular *</label><input type="text" value={formData.titular} onChange={(e) => setFormData({...formData, titular: e.target.value})} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Documento Titular</label><input type="text" value={formData.documento} onChange={(e) => setFormData({...formData, documento: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>🕊️ Difunto</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Nombre Difunto</label><input type="text" value={formData.difunto} onChange={(e) => setFormData({...formData, difunto: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Documento Difunto</label><input type="text" value={formData.documento_difunto} onChange={(e) => setFormData({...formData, documento_difunto: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha Defunción</label><input type="date" value={formData.fecha_defuncion} onChange={(e) => setFormData({...formData, fecha_defuncion: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>📍 Ubicación</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Cementerio</label><input type="text" value={formData.cementerio} onChange={(e) => setFormData({...formData, cementerio: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Ubicación</label><input type="text" value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} style={inputStyle} /></div>
              </div>

              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>✅ Requisitos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                {requisitosList.map(req => (
                  <label key={req.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: formData.requisitos[req.key] ? '#d4edda' : '#f8f9fa', borderRadius: '8px', border: `2px solid ${formData.requisitos[req.key] ? '#28a745' : '#e0e0e0'}` }}>
                    <input type="checkbox" checked={formData.requisitos[req.key]} onChange={() => toggleRequisito(req.key)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '12px' }}>{req.label}</span>
                  </label>
                ))}
              </div>

              <h3 style={{ fontSize: '14px', color: '#37474F', marginBottom: '10px' }}>💰 Pagos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={labelStyle}>Valor Total</label><input type="number" value={formData.valor_total} onChange={(e) => setFormData({...formData, valor_total: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 1</label><input type="number" value={formData.abono1} onChange={(e) => setFormData({...formData, abono1: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 2</label><input type="number" value={formData.abono2} onChange={(e) => setFormData({...formData, abono2: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 3</label><input type="number" value={formData.abono3} onChange={(e) => setFormData({...formData, abono3: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 4</label><input type="number" value={formData.abono4} onChange={(e) => setFormData({...formData, abono4: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 5</label><input type="number" value={formData.abono5} onChange={(e) => setFormData({...formData, abono5: Number(e.target.value)})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Abono 6</label><input type="number" value={formData.abono6} onChange={(e) => setFormData({...formData, abono6: Number(e.target.value)})} style={inputStyle} /></div>
              </div>

              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                <strong>Saldo Pendiente: ${calcularSaldo(formData).toLocaleString()}</strong>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #37474F 0%, #263238 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 {editingContrato ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER */}
      {viewingContrato && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setViewingContrato(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #37474F 0%, #263238 100%)', borderRadius: '15px 15px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>🪦 Contrato {viewingContrato.numero}</h2>
              <button onClick={() => setViewingContrato(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <div style={{ padding: '20px', fontSize: '13px' }}>
              <p><strong>Tipo:</strong> {viewingContrato.tipo}</p>
              <p><strong>Titular:</strong> {viewingContrato.titular} ({viewingContrato.documento})</p>
              <p><strong>Difunto:</strong> {viewingContrato.difunto}</p>
              <p><strong>Fecha Contrato:</strong> {viewingContrato.fecha_contrato}</p>
              <p><strong>Cementerio:</strong> {viewingContrato.cementerio}</p>
              <p><strong>Valor Total:</strong> ${viewingContrato.valor_total.toLocaleString()}</p>
              <p><strong>Saldo:</strong> <span style={{ color: viewingContrato.saldo > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>${viewingContrato.saldo.toLocaleString()}</span></p>
              <p><strong>Notas:</strong> {viewingContrato.notas || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* DELETE */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Eliminar contrato?</h3>
            <p style={{ color: '#666' }}>{deleteConfirm.numero} - {deleteConfirm.titular}</p>
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

export default Cementerio;