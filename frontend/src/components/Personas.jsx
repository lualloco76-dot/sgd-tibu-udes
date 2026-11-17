import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const Personas = () => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [viewingPersona, setViewingPersona] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'nombres', direction: 'asc' });
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    numero_identificacion: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    cargarPersonas();
  }, []);

  const cargarPersonas = async () => {
    try {
      // Datos de ejemplo (reemplazar con API real)
      const datosEjemplo = [
        { id: 1, nombres: 'María', apellidos: 'García López', fecha_nacimiento: '1990-05-15', lugar_nacimiento: 'Bogotá', numero_identificacion: '123456789', telefono: '3001234567', email: 'maria@email.com', creado_en: '2024-01-10' },
        { id: 2, nombres: 'Juan', apellidos: 'Pérez Martínez', fecha_nacimiento: '1985-08-22', lugar_nacimiento: 'Medellín', numero_identificacion: '987654321', telefono: '3109876543', email: 'juan@email.com', creado_en: '2024-01-12' },
        { id: 3, nombres: 'Ana', apellidos: 'Rodríguez Gómez', fecha_nacimiento: '1995-03-30', lugar_nacimiento: 'Cali', numero_identificacion: '456789123', telefono: '3154567890', email: 'ana@email.com', creado_en: '2024-01-15' },
        { id: 4, nombres: 'Carlos', apellidos: 'Sánchez Torres', fecha_nacimiento: '1988-11-05', lugar_nacimiento: 'Barranquilla', numero_identificacion: '789123456', telefono: '3207891234', email: 'carlos@email.com', creado_en: '2024-01-20' },
        { id: 5, nombres: 'Lucía', apellidos: 'Fernández Ruiz', fecha_nacimiento: '1992-07-18', lugar_nacimiento: 'Cartagena', numero_identificacion: '321654987', telefono: '3003216549', email: 'lucia@email.com', creado_en: '2024-02-01' },
        { id: 6, nombres: 'Pedro', apellidos: 'Martínez Díaz', fecha_nacimiento: '1980-01-25', lugar_nacimiento: 'Bogotá', numero_identificacion: '654987321', telefono: '3106549873', email: 'pedro@email.com', creado_en: '2024-02-05' },
        { id: 7, nombres: 'Sofía', apellidos: 'López García', fecha_nacimiento: '1998-09-12', lugar_nacimiento: 'Medellín', numero_identificacion: '147258369', telefono: '3151472583', email: 'sofia@email.com', creado_en: '2024-02-10' },
        { id: 8, nombres: 'Diego', apellidos: 'Hernández Pérez', fecha_nacimiento: '1983-04-08', lugar_nacimiento: 'Cali', numero_identificacion: '369258147', telefono: '3203692581', email: 'diego@email.com', creado_en: '2024-02-15' },
        { id: 9, nombres: 'Valentina', apellidos: 'Torres Ramírez', fecha_nacimiento: '1993-12-20', lugar_nacimiento: 'Bogotá', numero_identificacion: '258369147', telefono: '3002583691', email: 'valentina@email.com', creado_en: '2024-02-20' },
        { id: 10, nombres: 'Andrés', apellidos: 'Castro Morales', fecha_nacimiento: '1987-06-14', lugar_nacimiento: 'Medellín', numero_identificacion: '963852741', telefono: '3109638527', email: 'andres@email.com', creado_en: '2024-02-25' },
      ];
      setPersonas(datosEjemplo);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar personas:', error);
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingPersona) {
      // Actualizar persona
      const updatedPersonas = personas.map(p => 
        p.id === editingPersona.id ? { ...p, ...formData } : p
      );
      setPersonas(updatedPersonas);
      showToast('✅ Persona actualizada correctamente');
    } else {
      // Crear nueva persona
      const nuevaPersona = {
        id: personas.length + 1,
        ...formData,
        creado_en: new Date().toISOString().split('T')[0]
      };
      setPersonas([nuevaPersona, ...personas]);
      showToast('✅ Persona registrada correctamente');
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (persona) => {
    const filteredPersonas = personas.filter(p => p.id !== persona.id);
    setPersonas(filteredPersonas);
    showToast('🗑️ Persona eliminada correctamente', 'warning');
    setShowDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      lugar_nacimiento: '',
      numero_identificacion: '',
      telefono: '',
      email: ''
    });
    setEditingPersona(null);
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
    setFormData({
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      fecha_nacimiento: persona.fecha_nacimiento,
      lugar_nacimiento: persona.lugar_nacimiento,
      numero_identificacion: persona.numero_identificacion,
      telefono: persona.telefono,
      email: persona.email
    });
    setShowModal(true);
  };

  // Filtrado y búsqueda
  const filteredPersonas = personas.filter(persona =>
    persona.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    persona.numero_identificacion.includes(searchTerm) ||
    persona.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenamiento
  const sortedPersonas = [...filteredPersonas].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedPersonas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedPersonas.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando personas...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Gestión de Personas</h1>
          <p style={styles.subtitle}>Administra los feligreses de la parroquia</p>
        </div>
        <button 
          style={styles.primaryButton}
          onClick={() => {
            setEditingPersona(null);
            resetForm();
            setShowModal(true);
          }}
        >
          ➕ Nueva Persona
        </button>
      </div>

      {/* Search and filters */}
      <div style={styles.searchContainer}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, cédula o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.stats}>
          <span style={styles.statBadge}>
            Total: {filteredPersonas.length} personas
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th} onClick={() => handleSort('nombres')}>
                Nombre {sortConfig.key === 'nombres' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={styles.th} onClick={() => handleSort('numero_identificacion')}>
                Cédula {sortConfig.key === 'numero_identificacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Teléfono</th>
              <th style={styles.th} onClick={() => handleSort('creado_en')}>
                Registro {sortConfig.key === 'creado_en' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((persona) => (
              <tr key={persona.id} style={styles.tableRow}>
                <td style={styles.td}>
                  <div style={styles.personInfo}>
                    <div style={styles.avatar}>
                      {persona.nombres[0]}{persona.apellidos[0]}
                    </div>
                    <div>
                      <strong>{persona.nombres} {persona.apellidos}</strong>
                      <div style={styles.smallText}>{persona.lugar_nacimiento}</div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>{persona.numero_identificacion}</td>
                <td style={styles.td}>{persona.email}</td>
                <td style={styles.td}>{persona.telefono}</td>
                <td style={styles.td}>{persona.creado_en}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button 
                      style={styles.viewButton}
                      onClick={() => setViewingPersona(persona)}
                      title="Ver detalles"
                    >
                      👁️
                    </button>
                    <button 
                      style={styles.editButton}
                      onClick={() => handleEdit(persona)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      style={styles.deleteButton}
                      onClick={() => setShowDeleteConfirm(persona)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <button
          style={{
            ...styles.pageButton,
            opacity: currentPage === 1 ? 0.5 : 1
          }}
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ← Anterior
        </button>
        <span style={styles.pageInfo}>
          Página {currentPage} de {totalPages}
        </span>
        <button
          style={{
            ...styles.pageButton,
            opacity: currentPage === totalPages ? 0.5 : 1
          }}
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Siguiente →
        </button>
      </div>

      {/* Modal for create/edit */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingPersona ? '✏️ Editar Persona' : '➕ Nueva Persona'}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombres *</label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    required
                    style={styles.input}
                    placeholder="Ej: María José"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Apellidos *</label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    required
                    style={styles.input}
                    placeholder="Ej: García López"
                  />
                </div>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lugar de Nacimiento</label>
                  <input
                    type="text"
                    value={formData.lugar_nacimiento}
                    onChange={(e) => setFormData({...formData, lugar_nacimiento: e.target.value})}
                    style={styles.input}
                    placeholder="Ej: Bogotá"
                  />
                </div>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Identificación</label>
                  <input
                    type="text"
                    value={formData.numero_identificacion}
                    onChange={(e) => setFormData({...formData, numero_identificacion: e.target.value})}
                    style={styles.input}
                    placeholder="Ej: 123456789"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    style={styles.input}
                    placeholder="Ej: 3001234567"
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={styles.input}
                  placeholder="Ej: persona@email.com"
                />
              </div>
              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingPersona ? 'Actualizar Persona' : 'Registrar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for viewing */}
      {viewingPersona && (
        <div style={styles.modalOverlay} onClick={() => setViewingPersona(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>👤 Detalles de la Persona</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setViewingPersona(null)}
              >
                ✕
              </button>
            </div>
            <div style={styles.detailsContainer}>
              <div style={styles.detailRow}>
                <strong>Nombre Completo:</strong>
                <span>{viewingPersona.nombres} {viewingPersona.apellidos}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Fecha de Nacimiento:</strong>
                <span>{viewingPersona.fecha_nacimiento}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Lugar de Nacimiento:</strong>
                <span>{viewingPersona.lugar_nacimiento}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Cédula:</strong>
                <span>{viewingPersona.numero_identificacion}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Teléfono:</strong>
                <span>{viewingPersona.telefono}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Email:</strong>
                <span>{viewingPersona.email}</span>
              </div>
              <div style={styles.detailRow}>
                <strong>Fecha de Registro:</strong>
                <span>{viewingPersona.creado_en}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
              <h3>¿Estás seguro?</h3>
              <p>Esta acción eliminará a:</p>
              <p style={{ fontWeight: 'bold', fontSize: '18px' }}>
                {showDeleteConfirm.nombres} {showDeleteConfirm.apellidos}
              </p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Esta acción no se puede deshacer
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancelar
              </button>
              <button 
                style={{
                  ...styles.submitButton,
                  background: '#dc3545'
                }}
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    color: '#2c3e50',
    margin: '0'
  },
  subtitle: {
    color: '#666',
    margin: '5px 0 0 0'
  },
  primaryButton: {
    background: '#3498db',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 5px rgba(52, 152, 219, 0.3)'
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    background: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    padding: '10px 15px',
    transition: 'border-color 0.3s'
  },
  searchIcon: {
    marginRight: '10px',
    fontSize: '18px'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: '16px'
  },
  stats: {
    display: 'flex',
    gap: '10px'
  },
  statBadge: {
    background: '#f0f0f0',
    padding: '8px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#555'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #dee2e6'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s'
  },
  td: {
    padding: '15px',
    color: '#555'
  },
  personInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#3498db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  smallText: {
    fontSize: '12px',
    color: '#999'
  },
  actions: {
    display: 'flex',
    gap: '5px'
  },
  viewButton: {
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  editButton: {
    background: '#ffc107',
    color: '#333',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  deleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '20px'
  },
  pageButton: {
    background: 'white',
    border: '1px solid #dee2e6',
    padding: '8px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  pageInfo: {
    color: '#666',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  modal: {
    background: 'white',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  confirmModal: {
    background: 'white',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '400px',
    padding: '30px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#2c3e50'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666'
  },
  form: {
    padding: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },
  cancelButton: {
    background: '#f0f0f0',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  submitButton: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background 0.3s'
  },
  detailsContainer: {
    padding: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 25px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    zIndex: 3000,
    animation: 'slideIn 0.3s ease',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
  }
};

export default Personas;
