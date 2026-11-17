import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Confirmaciones = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || null;
  const tienePermiso = auth?.tienePermiso || (() => true);
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});
  
  const [confirmaciones, setConfirmaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConfirmacion, setEditingConfirmacion] = useState(null);
  const [viewingConfirmacion, setViewingConfirmacion] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [showCertificate, setShowCertificate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_confirmacion', direction: 'desc' });
  const [filters, setFilters] = useState({
    nombre: '',
    apellidos: '',
    documento: '',
    parroquia: '',
    obispo: '',
    libro: '',
    folio: ''
  });
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    numero_documento: '',
    fecha_bautismo: '',
    parroquia_bautismo: '',
    fecha_confirmacion: '',
    parroquia: '',
    obispo: '',
    padrino: '',
    madrina: '',
    libro: '',
    folio: '',
    numero: '',
    notas: ''
  });

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  useEffect(() => {
    cargarConfirmaciones();
  }, []);

  const cargarConfirmaciones = () => {
    const datosConfirmaciones = [
      {
        id: 1,
        nombres: 'Carlos Andrés',
        apellidos: 'Martínez García',
        fecha_nacimiento: '2008-03-15',
        lugar_nacimiento: 'Tibú',
        numero_documento: '1001234567',
        fecha_bautismo: '2008-06-20',
        parroquia_bautismo: 'tibu',
        fecha_confirmacion: '2024-05-10',
        parroquia: 'tibu',
        obispo: 'Monseñor Jorge Rodríguez',
        padrino: 'Pedro Martínez',
        madrina: 'Ana García',
        libro: 'Libro C-1',
        folio: 'F-05',
        numero: 'C-001',
        notas: 'Ceremonia de confirmación grupal',
        estado: 'activo',
        creado_por: 'Secretario Tibú',
        creado_en: '2024-05-10 15:00',
        historial: [
          { fecha: '2024-05-10 15:00', usuario: 'Secretario Tibú', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 2,
        nombres: 'Laura Valentina',
        apellidos: 'Rodríguez Pérez',
        fecha_nacimiento: '2009-07-22',
        lugar_nacimiento: 'San Faustino',
        numero_documento: '1002345678',
        fecha_bautismo: '2009-12-15',
        parroquia_bautismo: 'sanfaustino',
        fecha_confirmacion: '2024-05-12',
        parroquia: 'sanfaustino',
        obispo: 'Monseñor Jorge Rodríguez',
        padrino: 'Luis Rodríguez',
        madrina: 'María Pérez',
        libro: 'Libro C-2',
        folio: 'F-08',
        numero: 'C-002',
        notas: '',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-05-12 10:30',
        historial: [
          { fecha: '2024-05-12 10:30', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 3,
        nombres: 'Andrés Felipe',
        apellidos: 'Gómez Torres',
        fecha_nacimiento: '2008-11-08',
        lugar_nacimiento: 'Ocaña',
        numero_documento: '1003456789',
        fecha_bautismo: '2009-04-10',
        parroquia_bautismo: 'ocana',
        fecha_confirmacion: '2024-06-15',
        parroquia: 'ocana',
        obispo: 'Monseñor Jorge Rodríguez',
        padrino: 'Carlos Gómez',
        madrina: 'Lucía Torres',
        libro: 'Libro C-3',
        folio: 'F-12',
        numero: 'C-003',
        notas: 'Confirmación en visita pastoral',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-06-15 11:00',
        historial: [
          { fecha: '2024-06-15 11:00', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 4,
        nombres: 'María Camila',
        apellidos: 'Sánchez Ruiz',
        fecha_nacimiento: '2009-02-14',
        lugar_nacimiento: 'Tibú',
        numero_documento: '1004567890',
        fecha_bautismo: '2009-07-20',
        parroquia_bautismo: 'tibu',
        fecha_confirmacion: '2024-06-18',
        parroquia: 'tibu',
        obispo: 'Monseñor Jorge Rodríguez',
        padrino: 'Miguel Sánchez',
        madrina: 'Rosa Ruiz',
        libro: 'Libro C-1',
        folio: 'F-15',
        numero: 'C-004',
        notas: '',
        estado: 'activo',
        creado_por: 'Secretario Tibú',
        creado_en: '2024-06-18 14:00',
        historial: [
          { fecha: '2024-06-18 14:00', usuario: 'Secretario Tibú', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 5,
        nombres: 'Juan David',
        apellidos: 'López Castro',
        fecha_nacimiento: '2008-09-30',
        lugar_nacimiento: 'Cúcuta',
        numero_documento: '1005678901',
        fecha_bautismo: '2009-02-15',
        parroquia_bautismo: 'cucuta',
        fecha_confirmacion: '2024-07-05',
        parroquia: 'cucuta',
        obispo: 'Monseñor Jorge Rodríguez',
        padrino: 'Oscar López',
        madrina: 'Carmen Castro',
        libro: 'Libro C-4',
        folio: 'F-20',
        numero: 'C-005',
        notas: 'Confirmación de jóvenes',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-07-05 09:30',
        historial: [
          { fecha: '2024-07-05 09:30', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
    ];
    setConfirmaciones(datosConfirmaciones);
    setLoading(false);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingConfirmacion) {
      const updated = confirmaciones.map(c => {
        if (c.id === editingConfirmacion.id) {
          return { ...c, ...formData };
        }
        return c;
      });
      setConfirmaciones(updated);
      registrarAuditoria('MODIFICAR', 'confirmaciones', editingConfirmacion.id, 'Confirmación modificada: ' + formData.nombres);
      showToast('Confirmación actualizada correctamente', 'success');
    } else {
      const nuevo = {
        id: confirmaciones.length + 1,
        ...formData,
        estado: 'activo',
        creado_por: usuario ? usuario.nombre : 'Sistema',
        creado_en: new Date().toISOString(),
        historial: [{
          fecha: new Date().toISOString(),
          usuario: usuario ? usuario.nombre : 'Sistema',
          accion: 'CREACIÓN',
          detalle: 'Registro creado'
        }]
      };
      setConfirmaciones([nuevo, ...confirmaciones]);
      registrarAuditoria('CREAR', 'confirmaciones', nuevo.id, 'Confirmación registrada: ' + formData.nombres);
      showToast('Confirmación registrada correctamente', 'success');
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (confirmacion) => {
    const updated = confirmaciones.map(c => {
      if (c.id === confirmacion.id) {
        return { ...c, estado: 'eliminado' };
      }
      return c;
    });
    setConfirmaciones(updated);
    registrarAuditoria('ELIMINAR', 'confirmaciones', confirmacion.id, 'Confirmación eliminada: ' + confirmacion.nombres);
    showToast('Confirmación eliminada lógicamente', 'warning');
    setShowDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      lugar_nacimiento: '',
      numero_documento: '',
      fecha_bautismo: '',
      parroquia_bautismo: '',
      fecha_confirmacion: '',
      parroquia: '',
      obispo: '',
      padrino: '',
      madrina: '',
      libro: '',
      folio: '',
      numero: '',
      notas: ''
    });
    setEditingConfirmacion(null);
  };

  const handleEdit = (confirmacion) => {
    setEditingConfirmacion(confirmacion);
    setFormData({
      nombres: confirmacion.nombres,
      apellidos: confirmacion.apellidos,
      fecha_nacimiento: confirmacion.fecha_nacimiento,
      lugar_nacimiento: confirmacion.lugar_nacimiento,
      numero_documento: confirmacion.numero_documento,
      fecha_bautismo: confirmacion.fecha_bautismo,
      parroquia_bautismo: confirmacion.parroquia_bautismo,
      fecha_confirmacion: confirmacion.fecha_confirmacion,
      parroquia: confirmacion.parroquia,
      obispo: confirmacion.obispo,
      padrino: confirmacion.padrino,
      madrina: confirmacion.madrina,
      libro: confirmacion.libro,
      folio: confirmacion.folio,
      numero: confirmacion.numero,
      notas: confirmacion.notas
    });
    setShowModal(true);
  };

  const filteredConfirmaciones = confirmaciones.filter(confirmacion => {
    if (confirmacion.estado === 'eliminado') return false;
    
    const matchNombre = !filters.nombre || confirmacion.nombres.toLowerCase().includes(filters.nombre.toLowerCase());
    const matchApellidos = !filters.apellidos || confirmacion.apellidos.toLowerCase().includes(filters.apellidos.toLowerCase());
    const matchDocumento = !filters.documento || confirmacion.numero_documento.includes(filters.documento);
    const matchParroquia = !filters.parroquia || confirmacion.parroquia === filters.parroquia;
    const matchObispo = !filters.obispo || confirmacion.obispo.toLowerCase().includes(filters.obispo.toLowerCase());
    const matchSearch = !searchTerm || 
      confirmacion.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      confirmacion.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      confirmacion.numero_documento.includes(searchTerm);
    
    return matchNombre && matchApellidos && matchDocumento && matchParroquia && matchObispo && matchSearch;
  });

  const sortedConfirmaciones = [...filteredConfirmaciones].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedConfirmaciones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedConfirmaciones.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Cargando confirmaciones...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 25px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 'bold',
          zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#2c3e50', margin: '0' }}>🔥 Registro de Confirmaciones</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Gestión documental de confirmaciones sacramentales</p>
        </div>
        {tienePermiso('confirmaciones.crear') && (
          <button 
            style={{
              background: '#e67e22',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => {
              setEditingConfirmacion(null);
              resetForm();
              setShowModal(true);
            }}
          >
            ➕ Nueva Confirmación
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px' }}
          />
        </div>
        <button 
          style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
          onClick={() => setShowFilters(!showFilters)}
        >
          ⚙️ Filtros
        </button>
      </div>

      {showFilters && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <input type="text" placeholder="Nombre" value={filters.nombre} onChange={(e) => setFilters({...filters, nombre: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <input type="text" placeholder="Apellidos" value={filters.apellidos} onChange={(e) => setFilters({...filters, apellidos: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <input type="text" placeholder="Documento" value={filters.documento} onChange={(e) => setFilters({...filters, documento: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <select value={filters.parroquia} onChange={(e) => setFilters({...filters, parroquia: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <option value="">Todas las parroquias</option>
              {parroquias.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <input type="text" placeholder="Obispo" value={filters.obispo} onChange={(e) => setFilters({...filters, obispo: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('nombres')}>
                Nombre {sortConfig.key === 'nombres' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '15px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('fecha_confirmacion')}>
                Fecha Confirmación {sortConfig.key === 'fecha_confirmacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Documento</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Parroquia</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Obispo</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Libro/Folio</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((confirmacion) => (
              <tr key={confirmacion.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '15px' }}>
                  <strong>{confirmacion.nombres} {confirmacion.apellidos}</strong>
                  <div style={{ fontSize: '12px', color: '#999' }}>N° {confirmacion.numero}</div>
                </td>
                <td style={{ padding: '15px' }}>{confirmacion.fecha_confirmacion}</td>
                <td style={{ padding: '15px' }}>{confirmacion.numero_documento}</td>
                <td style={{ padding: '15px' }}>
                  {parroquias.find(p => p.id === confirmacion.parroquia)?.nombre || confirmacion.parroquia}
                </td>
                <td style={{ padding: '15px' }}>{confirmacion.obispo}</td>
                <td style={{ padding: '15px' }}>{confirmacion.libro} / {confirmacion.folio}</td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setViewingConfirmacion(confirmacion)} title="Ver">👁️</button>
                    <button style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowCertificate(confirmacion)} title="Certificado">📄</button>
                    {tienePermiso('confirmaciones.editar') && (
                      <button style={{ background: '#ffc107', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleEdit(confirmacion)} title="Editar">✏️</button>
                    )}
                    <button style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowHistory(confirmacion)} title="Historial">🕐</button>
                    {tienePermiso('confirmaciones.editar') && (
                      <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(confirmacion)} title="Eliminar">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
        <button style={{ background: 'white', border: '1px solid #dee2e6', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }} onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
          ← Anterior
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>
          Página {currentPage} de {totalPages} ({filteredConfirmaciones.length} registros)
        </span>
        <button style={{ background: 'white', border: '1px solid #dee2e6', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }} onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
          Siguiente →
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>
                {editingConfirmacion ? '✏️ Editar Confirmación' : '🔥 Nueva Confirmación'}
              </h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nombres *</label>
                  <input type="text" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Apellidos *</label>
                  <input type="text" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Nacimiento</label>
                  <input type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lugar de Nacimiento</label>
                  <input type="text" value={formData.lugar_nacimiento} onChange={(e) => setFormData({...formData, lugar_nacimiento: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Número de Documento</label>
                  <input type="text" value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Bautismo</label>
                  <input type="date" value={formData.fecha_bautismo} onChange={(e) => setFormData({...formData, fecha_bautismo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Parroquia de Bautismo</label>
                  <select value={formData.parroquia_bautismo} onChange={(e) => setFormData({...formData, parroquia_bautismo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <option value="">Seleccionar...</option>
                    {parroquias.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Confirmación *</label>
                  <input type="date" value={formData.fecha_confirmacion} onChange={(e) => setFormData({...formData, fecha_confirmacion: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Parroquia *</label>
                  <select value={formData.parroquia} onChange={(e) => setFormData({...formData, parroquia: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <option value="">Seleccionar parroquia...</option>
                    {parroquias.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Obispo</label>
                  <input type="text" value={formData.obispo} onChange={(e) => setFormData({...formData, obispo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Padrino</label>
                  <input type="text" value={formData.padrino} onChange={(e) => setFormData({...formData, padrino: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Madrina</label>
                  <input type="text" value={formData.madrina} onChange={(e) => setFormData({...formData, madrina: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Libro</label>
                  <input type="text" value={formData.libro} onChange={(e) => setFormData({...formData, libro: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Folio</label>
                  <input type="text" value={formData.folio} onChange={(e) => setFormData({...formData, folio: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Número de Registro</label>
                  <input type="text" value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" style={{ background: '#e67e22', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {editingConfirmacion ? 'Actualizar Confirmación' : 'Registrar Confirmación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingConfirmacion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>👁️ Detalles de la Confirmación</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setViewingConfirmacion(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p><strong>Nombre:</strong> {viewingConfirmacion.nombres} {viewingConfirmacion.apellidos}</p>
              <p><strong>Fecha de Nacimiento:</strong> {viewingConfirmacion.fecha_nacimiento}</p>
              <p><strong>Lugar de Nacimiento:</strong> {viewingConfirmacion.lugar_nacimiento}</p>
              <p><strong>Documento:</strong> {viewingConfirmacion.numero_documento}</p>
              <p><strong>Fecha de Bautismo:</strong> {viewingConfirmacion.fecha_bautismo}</p>
              <p><strong>Fecha de Confirmación:</strong> {viewingConfirmacion.fecha_confirmacion}</p>
              <p><strong>Parroquia:</strong> {parroquias.find(p => p.id === viewingConfirmacion.parroquia)?.nombre}</p>
              <p><strong>Obispo:</strong> {viewingConfirmacion.obispo}</p>
              <p><strong>Padrino:</strong> {viewingConfirmacion.padrino}</p>
              <p><strong>Madrina:</strong> {viewingConfirmacion.madrina}</p>
              <p><strong>Libro/Folio:</strong> {viewingConfirmacion.libro} / {viewingConfirmacion.folio}</p>
              <p><strong>Número:</strong> {viewingConfirmacion.numero}</p>
              <p><strong>Creado por:</strong> {viewingConfirmacion.creado_por}</p>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>🕐 Historial de Modificaciones</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowHistory(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <h3>{showHistory.nombres} {showHistory.apellidos}</h3>
              {showHistory.historial.map((registro, index) => (
                <div key={index} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                  <strong>{registro.accion}</strong>
                  <p>{registro.detalle}</p>
                  <small>Por: {registro.usuario} - {registro.fecha}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCertificate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
            <div style={{ border: '3px solid #2c3e50', padding: '40px', textAlign: 'center' }}>
              <h2>⛪ CERTIFICADO DE CONFIRMACIÓN</h2>
              <p>Iglesia Católica</p>
              <p>Por medio de la presente, certificamos que:</p>
              <h3>{showCertificate.nombres} {showCertificate.apellidos}</h3>
              <p>Recibió el sacramento de la Confirmación el día <strong>{showCertificate.fecha_confirmacion}</strong></p>
              <p>En la parroquia <strong>{parroquias.find(p => p.id === showCertificate.parroquia)?.nombre}</strong></p>
              <p>Siendo el ministro <strong>{showCertificate.obispo}</strong></p>
              <div style={{ background: '#f8f9fa', padding: '15px', margin: '20px 0' }}>
                <p><strong>Libro:</strong> {showCertificate.libro}</p>
                <p><strong>Folio:</strong> {showCertificate.folio}</p>
                <p><strong>Número:</strong> {showCertificate.numero}</p>
              </div>
              <p>Padrino: <strong>{showCertificate.padrino}</strong></p>
              <p>Madrina: <strong>{showCertificate.madrina}</strong></p>
              <p style={{ marginTop: '30px' }}>Firmado y sellado en la parroquia</p>
              <p>Fecha de emisión: {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => window.print()}>🖨️ Imprimir Certificado</button>
              <button style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowCertificate(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h3>¿Estás seguro?</h3>
            <p>Esta acción eliminará lógicamente el registro de:</p>
            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{showDeleteConfirm.nombres} {showDeleteConfirm.apellidos}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleDelete(showDeleteConfirm)}>Eliminar Lógicamente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Confirmaciones;