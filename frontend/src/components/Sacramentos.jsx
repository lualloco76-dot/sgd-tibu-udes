import React, { useState, useEffect } from 'react';

const Sacramentos = () => {
  const [sacramentos, setSacramentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSacramento, setSelectedSacramento] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSacramento, setNewSacramento] = useState({
    nombre: '',
    descripcion: '',
    categoria: ''
  });
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    cargarSacramentos();
  }, []);

  const cargarSacramentos = async () => {
    try {
      const datosSacramentos = [
        { 
          id: 1, 
          nombre: 'Bautismo', 
          descripcion: 'Primer sacramento de iniciación cristiana. Marca la entrada a la vida cristiana y limpia del pecado original.',
          categoria: 'Iniciación Cristiana',
          color: '#4FC3F7',
          icon: '💧',
          requisitos: ['Partida de nacimiento', 'Certificado de nacimiento', 'Padrinos elegidos'],
          estadisticas: { totalRegistros: 45, totalDocumentos: 89, ultimoRegistro: '2024-02-15' }
        },
        { 
          id: 2, 
          nombre: 'Confirmación', 
          descripcion: 'Sacramento que fortalece la gracia bautismal y nos da el Espíritu Santo.',
          categoria: 'Iniciación Cristiana',
          color: '#FF9800',
          icon: '🔥',
          requisitos: ['Certificado de bautismo', 'Curso de preparación', 'Edad mínima: 14 años'],
          estadisticas: { totalRegistros: 32, totalDocumentos: 64, ultimoRegistro: '2024-02-10' }
        },
        { 
          id: 3, 
          nombre: 'Eucaristía', 
          descripcion: 'Sacramento central de la vida cristiana. Cuerpo y Sangre de Cristo.',
          categoria: 'Iniciación Cristiana',
          color: '#FFD54F',
          icon: '🍞',
          requisitos: ['Primera Comunión', 'Catequesis completada', 'Confesión previa'],
          estadisticas: { totalRegistros: 58, totalDocumentos: 112, ultimoRegistro: '2024-02-18' }
        },
        { 
          id: 4, 
          nombre: 'Penitencia', 
          descripcion: 'Sacramento de reconciliación y perdón de los pecados.',
          categoria: 'Sanación',
          color: '#4CAF50',
          icon: '🙏',
          requisitos: ['Bautismo', 'Arrepentimiento sincero', 'Examen de conciencia'],
          estadisticas: { totalRegistros: 120, totalDocumentos: 45, ultimoRegistro: '2024-02-20' }
        },
        { 
          id: 5, 
          nombre: 'Unción de los enfermos', 
          descripcion: 'Sacramento de sanación y consuelo para los enfermos.',
          categoria: 'Sanación',
          color: '#E91E63',
          icon: '💜',
          requisitos: ['Enfermedad grave', 'Bautismo', 'Solicitud del enfermo o familia'],
          estadisticas: { totalRegistros: 15, totalDocumentos: 22, ultimoRegistro: '2024-01-30' }
        },
        { 
          id: 6, 
          nombre: 'Orden sacerdotal', 
          descripcion: 'Sacramento del ministerio ordenado. Diáconos, sacerdotes y obispos.',
          categoria: 'Servicio',
          color: '#9C27B0',
          icon: '✝️',
          requisitos: ['Vocación', 'Estudios teológicos', 'Aceptación del obispo'],
          estadisticas: { totalRegistros: 3, totalDocumentos: 8, ultimoRegistro: '2023-12-15' }
        },
        { 
          id: 7, 
          nombre: 'Matrimonio', 
          descripcion: 'Sacramento de alianza conyugal entre hombre y mujer.',
          categoria: 'Servicio',
          color: '#FF5722',
          icon: '💑',
          requisitos: ['Certificados de bautismo', 'Curso prematrimonial', 'Testigos'],
          estadisticas: { totalRegistros: 28, totalDocumentos: 75, ultimoRegistro: '2024-02-14' }
        },
      ];
      setSacramentos(datosSacramentos);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSacramento = (e) => {
    e.preventDefault();
    const nuevo = {
      id: sacramentos.length + 1,
      nombre: newSacramento.nombre,
      descripcion: newSacramento.descripcion,
      categoria: newSacramento.categoria || 'Otros',
      color: '#607D8B',
      icon: '⛪',
      requisitos: [],
      estadisticas: { totalRegistros: 0, totalDocumentos: 0, ultimoRegistro: 'N/A' }
    };
    setSacramentos([...sacramentos, nuevo]);
    setShowNewModal(false);
    setNewSacramento({ nombre: '', descripcion: '', categoria: '' });
    showToast('✅ Sacramento agregado correctamente');
  };

  const filteredSacramentos = sacramentos.filter(sac => 
    filter === 'todos' || sac.categoria === filter
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando sacramentos...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800'
        }}>
          {toast.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⛪ Sacramentos</h1>
          <p style={styles.subtitle}>Los 7 sacramentos de la Iglesia Católica</p>
        </div>
        <button 
          style={styles.primaryButton}
          onClick={() => setShowNewModal(true)}
        >
          ➕ Nuevo Sacramento
        </button>
      </div>

      <div style={styles.filters}>
        {['todos', 'Iniciación Cristiana', 'Sanación', 'Servicio'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              ...styles.filterButton,
              background: filter === cat ? '#3498db' : 'white',
              color: filter === cat ? 'white' : '#333'
            }}
          >
            {cat === 'todos' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filteredSacramentos.map((sacramento) => (
          <div
            key={sacramento.id}
            style={styles.card}
            onClick={() => {
              setSelectedSacramento(sacramento);
              setShowModal(true);
            }}
          >
            <div style={{
              ...styles.cardIcon,
              background: sacramento.color + '20',
              color: sacramento.color
            }}>
              <span style={{ fontSize: '40px' }}>{sacramento.icon}</span>
            </div>
            <h3 style={styles.cardTitle}>{sacramento.nombre}</h3>
            <p style={styles.cardDescription}>{sacramento.descripcion}</p>
            <div style={styles.cardFooter}>
              <span style={{
                ...styles.badge,
                background: sacramento.color + '20',
                color: sacramento.color
              }}>
                {sacramento.categoria}
              </span>
              <span style={styles.cardStats}>
                📋 {sacramento.estadisticas.totalRegistros} registros
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedSacramento && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{
              ...styles.modalHeader,
              background: selectedSacramento.color + '20'
            }}>
              <div>
                <h2 style={styles.modalTitle}>
                  {selectedSacramento.icon} {selectedSacramento.nombre}
                </h2>
                <span style={{
                  ...styles.badge,
                  background: selectedSacramento.color + '20',
                  color: selectedSacramento.color
                }}>
                  {selectedSacramento.categoria}
                </span>
              </div>
              <button 
                style={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={styles.modalDescription}>{selectedSacramento.descripcion}</p>
              
              <h3 style={styles.sectionTitle}>📋 Requisitos</h3>
              <ul style={styles.requisitosList}>
                {selectedSacramento.requisitos.map((req, index) => (
                  <li key={index} style={styles.requisitoItem}>
                    ✓ {req}
                  </li>
                ))}
              </ul>

              <h3 style={styles.sectionTitle}>📊 Estadísticas</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{selectedSacramento.estadisticas.totalRegistros}</div>
                  <div style={styles.statLabel}>Registros</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{selectedSacramento.estadisticas.totalDocumentos}</div>
                  <div style={styles.statLabel}>Documentos</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{selectedSacramento.estadisticas.ultimoRegistro}</div>
                  <div style={styles.statLabel}>Último Registro</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>➕ Nuevo Sacramento</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowNewModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSacramento} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={newSacramento.nombre}
                  onChange={(e) => setNewSacramento({...newSacramento, nombre: e.target.value})}
                  required
                  style={styles.input}
                  placeholder="Nombre del sacramento"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <textarea
                  value={newSacramento.descripcion}
                  onChange={(e) => setNewSacramento({...newSacramento, descripcion: e.target.value})}
                  style={{
                    ...styles.input,
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  placeholder="Descripción del sacramento"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Categoría</label>
                <select
                  value={newSacramento.categoria}
                  onChange={(e) => setNewSacramento({...newSacramento, categoria: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Iniciación Cristiana">Iniciación Cristiana</option>
                  <option value="Sanación">Sanación</option>
                  <option value="Servicio">Servicio</option>
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.cancelButton}
                  onClick={() => setShowNewModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.submitButton}>
                  Agregar Sacramento
                </button>
              </div>
            </form>
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
  filters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '10px 20px',
    borderRadius: '20px',
    border: '2px solid #e0e0e0',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '25px'
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    position: 'relative',
    overflow: 'hidden'
  },
  cardIcon: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '15px'
  },
  cardTitle: {
    fontSize: '20px',
    color: '#2c3e50',
    margin: '0 0 10px 0'
  },
  cardDescription: {
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    padding: '5px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cardStats: {
    fontSize: '12px',
    color: '#999'
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
    borderRadius: '15px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  modalTitle: {
    margin: '0',
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
  modalBody: {
    padding: '20px'
  },
  modalDescription: {
    fontSize: '16px',
    color: '#555',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#2c3e50',
    margin: '20px 0 10px 0'
  },
  requisitosList: {
    listStyle: 'none',
    padding: '0'
  },
  requisitoItem: {
    padding: '8px 0',
    color: '#555'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px'
  },
  statBox: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '10px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px'
  },
  form: {
    padding: '20px'
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

export default Sacramentos;
