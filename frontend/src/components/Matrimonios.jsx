import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Matrimonios = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || null;
  const tienePermiso = auth?.tienePermiso || (() => true);
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});
  
  const [matrimonios, setMatrimonios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMatrimonio, setEditingMatrimonio] = useState(null);
  const [viewingMatrimonio, setViewingMatrimonio] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [showCertificate, setShowCertificate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_matrimonio', direction: 'desc' });
  const [filters, setFilters] = useState({
    esposo: '',
    esposa: '',
    documento: '',
    parroquia: '',
    sacerdote: '',
    libro: '',
    folio: ''
  });
  const [formData, setFormData] = useState({
    nombres_esposo: '',
    apellidos_esposo: '',
    documento_esposo: '',
    fecha_nacimiento_esposo: '',
    lugar_nacimiento_esposo: '',
    nombres_esposa: '',
    apellidos_esposa: '',
    documento_esposa: '',
    fecha_nacimiento_esposa: '',
    lugar_nacimiento_esposa: '',
    fecha_matrimonio: '',
    parroquia: '',
    sacerdote: '',
    testigo1: '',
    testigo2: '',
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
    cargarMatrimonios();
  }, []);

  const cargarMatrimonios = () => {
    const datosMatrimonios = [
      {
        id: 1,
        nombres_esposo: 'Carlos Andrés',
        apellidos_esposo: 'Martínez García',
        documento_esposo: '1090123456',
        fecha_nacimiento_esposo: '1990-03-15',
        lugar_nacimiento_esposo: 'Tibú',
        nombres_esposa: 'María Fernanda',
        apellidos_esposa: 'López Pérez',
        documento_esposa: '1090654321',
        fecha_nacimiento_esposa: '1992-07-22',
        lugar_nacimiento_esposa: 'San Faustino',
        fecha_matrimonio: '2024-02-14',
        parroquia: 'tibu',
        sacerdote: 'Padre Juan Pérez',
        testigo1: 'Pedro Martínez',
        testigo2: 'Ana García',
        libro: 'Libro M-1',
        folio: 'F-10',
        numero: 'M-001',
        notas: 'Matrimonio celebrado en ceremonia privada',
        estado: 'activo',
        creado_por: 'Secretario Tibú',
        creado_en: '2024-02-14 16:00',
        historial: [
          { fecha: '2024-02-14 16:00', usuario: 'Secretario Tibú', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 2,
        nombres_esposo: 'Juan Pablo',
        apellidos_esposo: 'Rodríguez Gómez',
        documento_esposo: '1090234567',
        fecha_nacimiento_esposo: '1988-11-08',
        lugar_nacimiento_esposo: 'Ocaña',
        nombres_esposa: 'Laura Valentina',
        apellidos_esposa: 'Sánchez Ruiz',
        documento_esposa: '1090765432',
        fecha_nacimiento_esposa: '1991-04-30',
        lugar_nacimiento_esposa: 'Cúcuta',
        fecha_matrimonio: '2024-03-20',
        parroquia: 'ocana',
        sacerdote: 'Padre Pedro Sánchez',
        testigo1: 'Luis Rodríguez',
        testigo2: 'María Torres',
        libro: 'Libro M-2',
        folio: 'F-15',
        numero: 'M-002',
        notas: '',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-03-20 11:00',
        historial: [
          { fecha: '2024-03-20 11:00', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 3,
        nombres_esposo: 'Andrés Felipe',
        apellidos_esposo: 'Gómez Torres',
        documento_esposo: '1090345678',
        fecha_nacimiento_esposo: '1993-09-25',
        lugar_nacimiento_esposo: 'Tibú',
        nombres_esposa: 'Sofía Alejandra',
        apellidos_esposa: 'Castro Morales',
        documento_esposa: '1090876543',
        fecha_nacimiento_esposa: '1995-12-12',
        lugar_nacimiento_esposa: 'San Faustino',
        fecha_matrimonio: '2024-04-15',
        parroquia: 'sanfaustino',
        sacerdote: 'Padre Carlos Ruiz',
        testigo1: 'Miguel Gómez',
        testigo2: 'Rosa Castro',
        libro: 'Libro M-3',
        folio: 'F-20',
        numero: 'M-003',
        notas: 'Matrimonio comunitario',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-04-15 10:30',
        historial: [
          { fecha: '2024-04-15 10:30', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 4,
        nombres_esposo: 'Diego Alejandro',
        apellidos_esposo: 'Fernández Díaz',
        documento_esposo: '1090456789',
        fecha_nacimiento_esposo: '1987-05-18',
        lugar_nacimiento_esposo: 'Cúcuta',
        nombres_esposa: 'Valentina',
        apellidos_esposa: 'Ramírez López',
        documento_esposa: '1090987654',
        fecha_nacimiento_esposa: '1989-08-05',
        lugar_nacimiento_esposa: 'Tibú',
        fecha_matrimonio: '2024-05-10',
        parroquia: 'cucuta',
        sacerdote: 'Padre Andrés Castro',
        testigo1: 'Oscar Fernández',
        testigo2: 'Carmen Ramírez',
        libro: 'Libro M-4',
        folio: 'F-25',
        numero: 'M-004',
        notas: '',
        estado: 'activo',
        creado_por: 'Secretario General',
        creado_en: '2024-05-10 14:00',
        historial: [
          { fecha: '2024-05-10 14:00', usuario: 'Secretario General', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
      {
        id: 5,
        nombres_esposo: 'Miguel Ángel',
        apellidos_esposo: 'Torres García',
        documento_esposo: '1090567890',
        fecha_nacimiento_esposo: '1991-02-28',
        lugar_nacimiento_esposo: 'Ocaña',
        nombres_esposa: 'Camila Andrea',
        apellidos_esposa: 'Pérez Gómez',
        documento_esposa: '1090098765',
        fecha_nacimiento_esposa: '1994-10-15',
        lugar_nacimiento_esposa: 'Cúcuta',
        fecha_matrimonio: '2024-06-08',
        parroquia: 'tibu',
        sacerdote: 'Padre Juan Pérez',
        testigo1: 'Carlos Torres',
        testigo2: 'Lucía Pérez',
        libro: 'Libro M-1',
        folio: 'F-30',
        numero: 'M-005',
        notas: 'Bodas de plata',
        estado: 'activo',
        creado_por: 'Secretario Tibú',
        creado_en: '2024-06-08 12:00',
        historial: [
          { fecha: '2024-06-08 12:00', usuario: 'Secretario Tibú', accion: 'CREACIÓN', detalle: 'Registro creado' }
        ]
      },
    ];
    setMatrimonios(datosMatrimonios);
    setLoading(false);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingMatrimonio) {
      const updated = matrimonios.map(m => {
        if (m.id === editingMatrimonio.id) {
          return { ...m, ...formData };
        }
        return m;
      });
      setMatrimonios(updated);
      registrarAuditoria('MODIFICAR', 'matrimonios', editingMatrimonio.id, 'Matrimonio modificado: ' + formData.nombres_esposo + ' y ' + formData.nombres_esposa);
      showToast('Matrimonio actualizado correctamente', 'success');
    } else {
      const nuevo = {
        id: matrimonios.length + 1,
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
      setMatrimonios([nuevo, ...matrimonios]);
      registrarAuditoria('CREAR', 'matrimonios', nuevo.id, 'Matrimonio registrado: ' + formData.nombres_esposo + ' y ' + formData.nombres_esposa);
      showToast('Matrimonio registrado correctamente', 'success');
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (matrimonio) => {
    const updated = matrimonios.map(m => {
      if (m.id === matrimonio.id) {
        return { ...m, estado: 'eliminado' };
      }
      return m;
    });
    setMatrimonios(updated);
    registrarAuditoria('ELIMINAR', 'matrimonios', matrimonio.id, 'Matrimonio eliminado: ' + matrimonio.nombres_esposo + ' y ' + matrimonio.nombres_esposa);
    showToast('Matrimonio eliminado lógicamente', 'warning');
    setShowDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombres_esposo: '',
      apellidos_esposo: '',
      documento_esposo: '',
      fecha_nacimiento_esposo: '',
      lugar_nacimiento_esposo: '',
      nombres_esposa: '',
      apellidos_esposa: '',
      documento_esposa: '',
      fecha_nacimiento_esposa: '',
      lugar_nacimiento_esposa: '',
      fecha_matrimonio: '',
      parroquia: '',
      sacerdote: '',
      testigo1: '',
      testigo2: '',
      libro: '',
      folio: '',
      numero: '',
      notas: ''
    });
    setEditingMatrimonio(null);
  };

  const handleEdit = (matrimonio) => {
    setEditingMatrimonio(matrimonio);
    setFormData({
      nombres_esposo: matrimonio.nombres_esposo,
      apellidos_esposo: matrimonio.apellidos_esposo,
      documento_esposo: matrimonio.documento_esposo,
      fecha_nacimiento_esposo: matrimonio.fecha_nacimiento_esposo,
      lugar_nacimiento_esposo: matrimonio.lugar_nacimiento_esposo,
      nombres_esposa: matrimonio.nombres_esposa,
      apellidos_esposa: matrimonio.apellidos_esposa,
      documento_esposa: matrimonio.documento_esposa,
      fecha_nacimiento_esposa: matrimonio.fecha_nacimiento_esposa,
      lugar_nacimiento_esposa: matrimonio.lugar_nacimiento_esposa,
      fecha_matrimonio: matrimonio.fecha_matrimonio,
      parroquia: matrimonio.parroquia,
      sacerdote: matrimonio.sacerdote,
      testigo1: matrimonio.testigo1,
      testigo2: matrimonio.testigo2,
      libro: matrimonio.libro,
      folio: matrimonio.folio,
      numero: matrimonio.numero,
      notas: matrimonio.notas
    });
    setShowModal(true);
  };

  const filteredMatrimonios = matrimonios.filter(matrimonio => {
    if (matrimonio.estado === 'eliminado') return false;
    
    const matchEsposo = !filters.esposo || 
      (matrimonio.nombres_esposo + ' ' + matrimonio.apellidos_esposo).toLowerCase().includes(filters.esposo.toLowerCase());
    const matchEsposa = !filters.esposa || 
      (matrimonio.nombres_esposa + ' ' + matrimonio.apellidos_esposa).toLowerCase().includes(filters.esposa.toLowerCase());
    const matchParroquia = !filters.parroquia || matrimonio.parroquia === filters.parroquia;
    const matchSacerdote = !filters.sacerdote || matrimonio.sacerdote.toLowerCase().includes(filters.sacerdote.toLowerCase());
    const matchSearch = !searchTerm || 
      (matrimonio.nombres_esposo + ' ' + matrimonio.apellidos_esposo).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (matrimonio.nombres_esposa + ' ' + matrimonio.apellidos_esposa).toLowerCase().includes(searchTerm.toLowerCase()) ||
      matrimonio.documento_esposo.includes(searchTerm) ||
      matrimonio.documento_esposa.includes(searchTerm);
    
    return matchEsposo && matchEsposa && matchParroquia && matchSacerdote && matchSearch;
  });

  const sortedMatrimonios = [...filteredMatrimonios].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedMatrimonios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedMatrimonios.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Cargando matrimonios...</h2>
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
          <h1 style={{ fontSize: '28px', color: '#2c3e50', margin: '0' }}>💑 Registro de Matrimonios</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Gestión documental de matrimonios sacramentales</p>
        </div>
        {tienePermiso('matrimonios.crear') && (
          <button 
            style={{
              background: '#e91e63',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => {
              setEditingMatrimonio(null);
              resetForm();
              setShowModal(true);
            }}
          >
            ➕ Nuevo Matrimonio
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px' }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar por esposo, esposa o documento..."
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
            <input type="text" placeholder="Esposo" value={filters.esposo} onChange={(e) => setFilters({...filters, esposo: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <input type="text" placeholder="Esposa" value={filters.esposa} onChange={(e) => setFilters({...filters, esposa: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
            <select value={filters.parroquia} onChange={(e) => setFilters({...filters, parroquia: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <option value="">Todas las parroquias</option>
              {parroquias.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <input type="text" placeholder="Sacerdote" value={filters.sacerdote} onChange={(e) => setFilters({...filters, sacerdote: e.target.value})} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('nombres_esposo')}>
                Esposo {sortConfig.key === 'nombres_esposo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Esposa</th>
              <th style={{ padding: '15px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('fecha_matrimonio')}>
                Fecha {sortConfig.key === 'fecha_matrimonio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Parroquia</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Sacerdote</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Libro/Folio</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((matrimonio) => (
              <tr key={matrimonio.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '15px' }}>
                  <strong>{matrimonio.nombres_esposo} {matrimonio.apellidos_esposo}</strong>
                  <div style={{ fontSize: '12px', color: '#999' }}>{matrimonio.documento_esposo}</div>
                </td>
                <td style={{ padding: '15px' }}>
                  <strong>{matrimonio.nombres_esposa} {matrimonio.apellidos_esposa}</strong>
                  <div style={{ fontSize: '12px', color: '#999' }}>{matrimonio.documento_esposa}</div>
                </td>
                <td style={{ padding: '15px' }}>{matrimonio.fecha_matrimonio}</td>
                <td style={{ padding: '15px' }}>
                  {parroquias.find(p => p.id === matrimonio.parroquia)?.nombre || matrimonio.parroquia}
                </td>
                <td style={{ padding: '15px' }}>{matrimonio.sacerdote}</td>
                <td style={{ padding: '15px' }}>{matrimonio.libro} / {matrimonio.folio}</td>
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setViewingMatrimonio(matrimonio)} title="Ver">👁️</button>
                    <button style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowCertificate(matrimonio)} title="Certificado">📄</button>
                    {tienePermiso('matrimonios.editar') && (
                      <button style={{ background: '#ffc107', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleEdit(matrimonio)} title="Editar">✏️</button>
                    )}
                    <button style={{ background: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowHistory(matrimonio)} title="Historial">🕐</button>
                    {tienePermiso('matrimonios.editar') && (
                      <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(matrimonio)} title="Eliminar">🗑️</button>
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
          Página {currentPage} de {totalPages} ({filteredMatrimonios.length} registros)
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
                {editingMatrimonio ? '✏️ Editar Matrimonio' : '💑 Nuevo Matrimonio'}
              </h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <h3 style={{ color: '#e91e63', marginBottom: '15px' }}>👨 Datos del Esposo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nombres *</label>
                  <input type="text" value={formData.nombres_esposo} onChange={(e) => setFormData({...formData, nombres_esposo: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Apellidos *</label>
                  <input type="text" value={formData.apellidos_esposo} onChange={(e) => setFormData({...formData, apellidos_esposo: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Documento</label>
                  <input type="text" value={formData.documento_esposo} onChange={(e) => setFormData({...formData, documento_esposo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Nacimiento</label>
                  <input type="date" value={formData.fecha_nacimiento_esposo} onChange={(e) => setFormData({...formData, fecha_nacimiento_esposo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lugar de Nacimiento</label>
                  <input type="text" value={formData.lugar_nacimiento_esposo} onChange={(e) => setFormData({...formData, lugar_nacimiento_esposo: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>

              <h3 style={{ color: '#e91e63', margin: '20px 0 15px 0' }}>👩 Datos de la Esposa</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nombres *</label>
                  <input type="text" value={formData.nombres_esposa} onChange={(e) => setFormData({...formData, nombres_esposa: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Apellidos *</label>
                  <input type="text" value={formData.apellidos_esposa} onChange={(e) => setFormData({...formData, apellidos_esposa: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Documento</label>
                  <input type="text" value={formData.documento_esposa} onChange={(e) => setFormData({...formData, documento_esposa: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Nacimiento</label>
                  <input type="date" value={formData.fecha_nacimiento_esposa} onChange={(e) => setFormData({...formData, fecha_nacimiento_esposa: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lugar de Nacimiento</label>
                  <input type="text" value={formData.lugar_nacimiento_esposa} onChange={(e) => setFormData({...formData, lugar_nacimiento_esposa: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>

              <h3 style={{ color: '#e91e63', margin: '20px 0 15px 0' }}>⛪ Datos del Matrimonio</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Fecha de Matrimonio *</label>
                  <input type="date" value={formData.fecha_matrimonio} onChange={(e) => setFormData({...formData, fecha_matrimonio: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
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
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Sacerdote</label>
                  <input type="text" value={formData.sacerdote} onChange={(e) => setFormData({...formData, sacerdote: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Testigo 1</label>
                  <input type="text" value={formData.testigo1} onChange={(e) => setFormData({...formData, testigo1: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Testigo 2</label>
                  <input type="text" value={formData.testigo2} onChange={(e) => setFormData({...formData, testigo2: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
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
                <button type="submit" style={{ background: '#e91e63', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {editingMatrimonio ? 'Actualizar Matrimonio' : 'Registrar Matrimonio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingMatrimonio && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>👁️ Detalles del Matrimonio</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setViewingMatrimonio(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ color: '#e91e63' }}>Esposo</h3>
              <p><strong>Nombre:</strong> {viewingMatrimonio.nombres_esposo} {viewingMatrimonio.apellidos_esposo}</p>
              <p><strong>Documento:</strong> {viewingMatrimonio.documento_esposo}</p>
              <h3 style={{ color: '#e91e63' }}>Esposa</h3>
              <p><strong>Nombre:</strong> {viewingMatrimonio.nombres_esposa} {viewingMatrimonio.apellidos_esposa}</p>
              <p><strong>Documento:</strong> {viewingMatrimonio.documento_esposa}</p>
              <h3 style={{ color: '#e91e63' }}>Matrimonio</h3>
              <p><strong>Fecha:</strong> {viewingMatrimonio.fecha_matrimonio}</p>
              <p><strong>Parroquia:</strong> {parroquias.find(p => p.id === viewingMatrimonio.parroquia)?.nombre}</p>
              <p><strong>Sacerdote:</strong> {viewingMatrimonio.sacerdote}</p>
              <p><strong>Testigos:</strong> {viewingMatrimonio.testigo1} y {viewingMatrimonio.testigo2}</p>
              <p><strong>Libro/Folio:</strong> {viewingMatrimonio.libro} / {viewingMatrimonio.folio}</p>
              <p><strong>Número:</strong> {viewingMatrimonio.numero}</p>
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
              <h3>{showHistory.nombres_esposo} y {showHistory.nombres_esposa}</h3>
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
              <h2>⛪ CERTIFICADO DE MATRIMONIO</h2>
              <p>Iglesia Católica</p>
              <p>Por medio de la presente, certificamos que:</p>
              <h3>{showCertificate.nombres_esposo} {showCertificate.apellidos_esposo}</h3>
              <p>y</p>
              <h3>{showCertificate.nombres_esposa} {showCertificate.apellidos_esposa}</h3>
              <p>Contrajeron matrimonio el día <strong>{showCertificate.fecha_matrimonio}</strong></p>
              <p>En la parroquia <strong>{parroquias.find(p => p.id === showCertificate.parroquia)?.nombre}</strong></p>
              <p>Siendo el ministro <strong>{showCertificate.sacerdote}</strong></p>
              <div style={{ background: '#f8f9fa', padding: '15px', margin: '20px 0' }}>
                <p><strong>Libro:</strong> {showCertificate.libro}</p>
                <p><strong>Folio:</strong> {showCertificate.folio}</p>
                <p><strong>Número:</strong> {showCertificate.numero}</p>
              </div>
              <p>Testigos: <strong>{showCertificate.testigo1}</strong> y <strong>{showCertificate.testigo2}</strong></p>
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
            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{showDeleteConfirm.nombres_esposo} y {showDeleteConfirm.nombres_esposa}</p>
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

export default Matrimonios;