import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Documentos = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || null;
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [activeTab, setActiveTab] = useState('libros');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Formularios
  const [libroForm, setLibroForm] = useState({
    tipo: '', numero: '', anio_inicio: '', anio_fin: '',
    ubicacion: '', parroquia: 'tibu', descripcion: ''
  });
  const [tomoForm, setTomoForm] = useState({
    libro_id: '', numero: '', folio_inicial: '', folio_final: ''
  });
  const [correccionForm, setCorreccionForm] = useState({
    tipo: '', registro: '', folio: '', correccion: '', detalle: '', solicitante: ''
  });
  const [observacionForm, setObservacionForm] = useState({
    libro: '', tipo: '', observacion: '', detalle: ''
  });

  // Datos
  const [libros, setLibros] = useState([
    { id: 1, tipo: 'Bautismos', numero: 'Libro 01', anio_inicio: 2015, anio_fin: 2020, total_tomos: 4, total_folios: 400, total_registros: 350, estado: 'activo', ubicacion: 'Estante A - Fila 1', consecutivo_actual: 'B-350', parroquia: 'tibu', descripcion: 'Libro principal de bautismos', tomos: [
      { id: 1, numero: 'Tomo 1', folios: 100, registros: 87, estado: 'completo', folio_inicial: 1, folio_final: 100 },
      { id: 2, numero: 'Tomo 2', folios: 100, registros: 92, estado: 'completo', folio_inicial: 101, folio_final: 200 },
      { id: 3, numero: 'Tomo 3', folios: 100, registros: 89, estado: 'completo', folio_inicial: 201, folio_final: 300 },
      { id: 4, numero: 'Tomo 4', folios: 100, registros: 82, estado: 'en_proceso', folio_inicial: 301, folio_final: 400 },
    ]},
    { id: 2, tipo: 'Confirmaciones', numero: 'Libro C-01', anio_inicio: 2016, anio_fin: 2024, total_tomos: 2, total_folios: 200, total_registros: 175, estado: 'activo', ubicacion: 'Estante A - Fila 2', consecutivo_actual: 'C-175', parroquia: 'tibu', descripcion: 'Libro de confirmaciones', tomos: [
      { id: 1, numero: 'Tomo 1', folios: 100, registros: 95, estado: 'completo', folio_inicial: 1, folio_final: 100 },
      { id: 2, numero: 'Tomo 2', folios: 100, registros: 80, estado: 'en_proceso', folio_inicial: 101, folio_final: 200 },
    ]},
    { id: 3, tipo: 'Matrimonios', numero: 'Libro M-01', anio_inicio: 2017, anio_fin: 2024, total_tomos: 1, total_folios: 100, total_registros: 88, estado: 'activo', ubicacion: 'Estante B - Fila 1', consecutivo_actual: 'M-088', parroquia: 'sanfaustino', descripcion: 'Libro de matrimonios', tomos: [
      { id: 1, numero: 'Tomo 1', folios: 100, registros: 88, estado: 'en_proceso', folio_inicial: 1, folio_final: 100 },
    ]},
  ]);

  const [correcciones, setCorrecciones] = useState([
    { id: 1, tipo: 'Bautismos', registro: 'B-125', folio: 'F-45', correccion: 'Error en apellido', detalle: 'Cambiar García a Garzón', solicitante: 'Secretario Tibú', estado: 'aprobada' },
    { id: 2, tipo: 'Matrimonios', registro: 'M-089', folio: 'F-30', correccion: 'Error en fecha', detalle: 'Cambiar 15/03 a 16/03', solicitante: 'Secretario General', estado: 'pendiente' },
  ]);

  const [observaciones, setObservaciones] = useState([
    { id: 1, libro: 'Libro 01', tipo: 'Bautismos', observacion: 'Deterioro en bordes', detalle: 'Restauración preventiva', estado: 'pendiente' },
    { id: 2, libro: 'Libro M-01', tipo: 'Matrimonios', observacion: 'Firmas faltantes', detalle: 'Folios 50-55', estado: 'atendida' },
  ]);

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============ FUNCIONES CRUD ============

  // ABRIR MODAL
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (item) {
      // Cargar datos del item a editar
      if (type === 'editar_libro') {
        setLibroForm({
          tipo: item.tipo, numero: item.numero, anio_inicio: item.anio_inicio,
          anio_fin: item.anio_fin, ubicacion: item.ubicacion, parroquia: item.parroquia,
          descripcion: item.descripcion
        });
      } else if (type === 'editar_correccion') {
        setCorreccionForm({
          tipo: item.tipo, registro: item.registro, folio: item.folio,
          correccion: item.correccion, detalle: item.detalle, solicitante: item.solicitante
        });
      } else if (type === 'editar_observacion') {
        setObservacionForm({
          libro: item.libro, tipo: item.tipo, observacion: item.observacion, detalle: item.detalle
        });
      }
    } else {
      // Resetear formularios para nuevo
      if (type === 'nuevo_libro') {
        setLibroForm({ tipo: '', numero: '', anio_inicio: '', anio_fin: '', ubicacion: '', parroquia: 'tibu', descripcion: '' });
      } else if (type === 'nuevo_tomo') {
        setTomoForm({ libro_id: '', numero: '', folio_inicial: '', folio_final: '' });
      } else if (type === 'nueva_correccion') {
        setCorreccionForm({ tipo: '', registro: '', folio: '', correccion: '', detalle: '', solicitante: '' });
      } else if (type === 'nueva_observacion') {
        setObservacionForm({ libro: '', tipo: '', observacion: '', detalle: '' });
      }
    }
    setShowModal(true);
  };

  // GUARDAR
  const handleSave = (e) => {
    e.preventDefault();

    if (modalType === 'nuevo_libro') {
      const nuevo = {
        id: libros.length + 1,
        ...libroForm,
        total_tomos: 0,
        total_folios: 0,
        total_registros: 0,
        estado: 'activo',
        consecutivo_actual: 'Nuevo',
        tomos: []
      };
      setLibros([...libros, nuevo]);
      registrarAuditoria('CREAR', 'libros', nuevo.id, 'Libro creado: ' + nuevo.tipo);
      showToast('✅ Libro creado correctamente');
    } else if (modalType === 'editar_libro' && editingItem) {
      const updated = libros.map(l => l.id === editingItem.id ? { ...l, ...libroForm } : l);
      setLibros(updated);
      registrarAuditoria('EDITAR', 'libros', editingItem.id, 'Libro actualizado: ' + libroForm.tipo);
      showToast('✅ Libro actualizado correctamente');
    } else if (modalType === 'nuevo_tomo') {
      const libroId = parseInt(tomoForm.libro_id);
      const updated = libros.map(l => {
        if (l.id === libroId) {
          const nuevoTomo = {
            id: l.tomos.length + 1,
            numero: tomoForm.numero,
            folios: parseInt(tomoForm.folio_final) - parseInt(tomoForm.folio_inicial) + 1,
            registros: 0,
            estado: 'en_proceso',
            folio_inicial: parseInt(tomoForm.folio_inicial),
            folio_final: parseInt(tomoForm.folio_final)
          };
          return { ...l, tomos: [...l.tomos, nuevoTomo], total_tomos: l.tomos.length + 1 };
        }
        return l;
      });
      setLibros(updated);
      registrarAuditoria('CREAR', 'tomos', libroId, 'Tomo creado: ' + tomoForm.numero);
      showToast('✅ Tomo creado correctamente');
    } else if (modalType === 'nueva_correccion') {
      const nueva = { id: correcciones.length + 1, ...correccionForm, estado: 'pendiente' };
      setCorrecciones([...correcciones, nueva]);
      registrarAuditoria('CREAR', 'correcciones', nueva.id, 'Corrección solicitada: ' + correccionForm.registro);
      showToast('✅ Corrección registrada correctamente');
    } else if (modalType === 'editar_correccion' && editingItem) {
      const updated = correcciones.map(c => c.id === editingItem.id ? { ...c, ...correccionForm } : c);
      setCorrecciones(updated);
      registrarAuditoria('EDITAR', 'correcciones', editingItem.id, 'Corrección actualizada');
      showToast('✅ Corrección actualizada correctamente');
    } else if (modalType === 'nueva_observacion') {
      const nueva = { id: observaciones.length + 1, ...observacionForm, estado: 'pendiente' };
      setObservaciones([...observaciones, nueva]);
      registrarAuditoria('CREAR', 'observaciones', nueva.id, 'Observación registrada');
      showToast('✅ Observación registrada correctamente');
    } else if (modalType === 'editar_observacion' && editingItem) {
      const updated = observaciones.map(o => o.id === editingItem.id ? { ...o, ...observacionForm } : o);
      setObservaciones(updated);
      registrarAuditoria('EDITAR', 'observaciones', editingItem.id, 'Observación actualizada');
      showToast('✅ Observación actualizada correctamente');
    }

    setShowModal(false);
    setEditingItem(null);
  };

  // ELIMINAR
  const handleDelete = () => {
    if (!deleteConfirm) return;
    const { item, type } = deleteConfirm;

    if (type === 'libro') {
      setLibros(libros.filter(l => l.id !== item.id));
    } else if (type === 'correccion') {
      setCorrecciones(correcciones.filter(c => c.id !== item.id));
    } else if (type === 'observacion') {
      setObservaciones(observaciones.filter(o => o.id !== item.id));
    }
    registrarAuditoria('ELIMINAR', type, item.id, 'Elemento eliminado');
    showToast('🗑️ Elemento eliminado correctamente', 'warning');
    setDeleteConfirm(null);
  };

  // ============ TABS ============
  const tabs = [
    { id: 'libros', label: '📚 Libros', icon: '📚' },
    { id: 'tomos', label: '📖 Tomos', icon: '📖' },
    { id: 'correcciones', label: '✏️ Correcciones', icon: '✏️' },
    { id: 'observaciones', label: '📝 Observaciones', icon: '📝' },
  ];

  // ============ RENDER ============
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '8px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '25px' }}>
        <h1 style={{ fontSize: '28px', color: '#2c3e50', margin: '0' }}>📚 Gestión Documental</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Administración de libros sacramentales, tomos, folios y documentos</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px', borderRadius: '10px', border: '2px solid #e0e0e0',
              cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s',
              background: activeTab === tab.id ? '#667eea' : 'white',
              color: activeTab === tab.id ? 'white' : '#333'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        
        {/* ===== LIBROS ===== */}
        {activeTab === 'libros' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>📚 Libros Sacramentales</h2>
              <button onClick={() => openModal('nuevo_libro')} style={{ background: '#667eea', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                ➕ Nuevo Libro
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px', minWidth: '200px' }}>
                <span>🔍</span>
                <input type="text" placeholder="Buscar libro..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {libros.filter(l => 
                l.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.numero.toLowerCase().includes(searchTerm.toLowerCase())
              ).map(libro => (
                <div key={libro.id} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', border: '2px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '40px' }}>📕</span>
                    <span style={{ padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', background: '#d4edda', color: '#155724' }}>
                      ✅ {libro.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0', fontSize: '18px', color: '#2c3e50' }}>{libro.tipo}</h3>
                  <p style={{ color: '#667eea', fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>{libro.numero}</p>
                  <p style={{ color: '#777', fontSize: '13px' }}>{libro.descripcion}</p>
                  <div style={{ display: 'flex', gap: '15px', margin: '10px 0', fontSize: '13px', color: '#555', flexWrap: 'wrap' }}>
                    <span>📖 {libro.tomos.length} tomos</span>
                    <span>📄 {libro.total_folios} folios</span>
                    <span>📝 {libro.total_registros} registros</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', margin: '10px 0' }}>
                    📍 {libro.ubicacion} | 🏛️ {parroquias.find(p => p.id === libro.parroquia)?.nombre || libro.parroquia}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '15px', flexWrap: 'wrap' }}>
                    <button onClick={() => setViewingItem(libro)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>👁️ Ver</button>
                    <button onClick={() => openModal('editar_libro', libro)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                    <button onClick={() => setDeleteConfirm({ item: libro, type: 'libro' })} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOMOS ===== */}
        {activeTab === 'tomos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>📖 Tomos</h2>
              <button onClick={() => openModal('nuevo_tomo')} style={{ background: '#667eea', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                ➕ Nuevo Tomo
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Libro</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Tomo</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Folios</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Registros</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {libros.flatMap(l => l.tomos.map(t => ({ ...t, libro_tipo: l.tipo, libro_numero: l.numero }))).map(tomo => (
                    <tr key={`${tomo.libro_numero}-${tomo.numero}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '15px' }}><strong>{tomo.libro_tipo}</strong><div style={{ fontSize: '12px', color: '#999' }}>{tomo.libro_numero}</div></td>
                      <td style={{ padding: '15px' }}>{tomo.numero}</td>
                      <td style={{ padding: '15px' }}>F-{tomo.folio_inicial} a F-{tomo.folio_final}</td>
                      <td style={{ padding: '15px' }}>{tomo.registros}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', background: tomo.estado === 'completo' ? '#d4edda' : '#fff3cd', color: tomo.estado === 'completo' ? '#155724' : '#856404' }}>
                          {tomo.estado === 'completo' ? '✅ Completo' : '⏳ En Proceso'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== CORRECCIONES ===== */}
        {activeTab === 'correcciones' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>✏️ Correcciones</h2>
              <button onClick={() => openModal('nueva_correccion')} style={{ background: '#667eea', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                ➕ Nueva Corrección
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Registro</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Corrección</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Solicitante</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Estado</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {correcciones.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '15px' }}>{c.tipo}</td>
                      <td style={{ padding: '15px' }}><strong>{c.registro}</strong></td>
                      <td style={{ padding: '15px' }}>{c.correccion}</td>
                      <td style={{ padding: '15px' }}>{c.solicitante}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', background: c.estado === 'aprobada' ? '#d4edda' : '#fff3cd', color: c.estado === 'aprobada' ? '#155724' : '#856404' }}>
                          {c.estado === 'aprobada' ? '✅ Aprobada' : '⏳ Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => openModal('editar_correccion', c)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => setDeleteConfirm({ item: c, type: 'correccion' })} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== OBSERVACIONES ===== */}
        {activeTab === 'observaciones' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>📝 Observaciones</h2>
              <button onClick={() => openModal('nueva_observacion')} style={{ background: '#667eea', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                ➕ Nueva Observación
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {observaciones.map(o => (
                <div key={o.id} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', border: '2px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>📝 {o.libro}</h3>
                    <span style={{ padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', background: o.estado === 'atendida' ? '#d4edda' : '#fff3cd', color: o.estado === 'atendida' ? '#155724' : '#856404' }}>
                      {o.estado === 'atendida' ? '✅ Atendida' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <p style={{ color: '#555', margin: '10px 0' }}>{o.observacion}</p>
                  <p style={{ color: '#777', fontSize: '13px' }}>{o.detalle}</p>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '15px' }}>
                    <button onClick={() => openModal('editar_observacion', o)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                    <button onClick={() => setDeleteConfirm({ item: o, type: 'observacion' })} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>
                {modalType.includes('nuevo') ? '➕ Nuevo' : '✏️ Editar'} {modalType.includes('libro') ? ' Libro' : modalType.includes('tomo') ? ' Tomo' : modalType.includes('correccion') ? ' Corrección' : ' Observación'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              {/* FORMULARIO LIBRO */}
              {(modalType === 'nuevo_libro' || modalType === 'editar_libro') && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo *</label>
                    <select value={libroForm.tipo} onChange={(e) => setLibroForm({...libroForm, tipo: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                      <option value="">Seleccionar tipo...</option>
                      <option value="Bautismos">Bautismos</option>
                      <option value="Confirmaciones">Confirmaciones</option>
                      <option value="Matrimonios">Matrimonios</option>
                      <option value="Defunciones">Defunciones</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Número *</label>
                    <input type="text" value={libroForm.numero} onChange={(e) => setLibroForm({...libroForm, numero: e.target.value})} required placeholder="Ej: Libro 02" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Año Inicio</label>
                      <input type="number" value={libroForm.anio_inicio} onChange={(e) => setLibroForm({...libroForm, anio_inicio: e.target.value})} placeholder="2015" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Año Fin</label>
                      <input type="number" value={libroForm.anio_fin} onChange={(e) => setLibroForm({...libroForm, anio_fin: e.target.value})} placeholder="2024" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Parroquia</label>
                    <select value={libroForm.parroquia} onChange={(e) => setLibroForm({...libroForm, parroquia: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                      {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ubicación</label>
                    <input type="text" value={libroForm.ubicacion} onChange={(e) => setLibroForm({...libroForm, ubicacion: e.target.value})} placeholder="Estante A - Fila 1" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descripción</label>
                    <textarea value={libroForm.descripcion} onChange={(e) => setLibroForm({...libroForm, descripcion: e.target.value})} placeholder="Descripción del libro..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px', resize: 'vertical' }} />
                  </div>
                </>
              )}

              {/* FORMULARIO TOMO */}
              {modalType === 'nuevo_tomo' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Libro *</label>
                    <select value={tomoForm.libro_id} onChange={(e) => setTomoForm({...tomoForm, libro_id: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                      <option value="">Seleccionar libro...</option>
                      {libros.map(l => <option key={l.id} value={l.id}>{l.tipo} - {l.numero}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Número de Tomo *</label>
                    <input type="text" value={tomoForm.numero} onChange={(e) => setTomoForm({...tomoForm, numero: e.target.value})} required placeholder="Tomo 5" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Folio Inicial *</label>
                      <input type="number" value={tomoForm.folio_inicial} onChange={(e) => setTomoForm({...tomoForm, folio_inicial: e.target.value})} required placeholder="1" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Folio Final *</label>
                      <input type="number" value={tomoForm.folio_final} onChange={(e) => setTomoForm({...tomoForm, folio_final: e.target.value})} required placeholder="100" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                    </div>
                  </div>
                </>
              )}

              {/* FORMULARIO CORRECCIÓN */}
              {(modalType === 'nueva_correccion' || modalType === 'editar_correccion') && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo *</label>
                    <select value={correccionForm.tipo} onChange={(e) => setCorreccionForm({...correccionForm, tipo: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                      <option value="">Seleccionar...</option>
                      <option value="Bautismos">Bautismos</option>
                      <option value="Confirmaciones">Confirmaciones</option>
                      <option value="Matrimonios">Matrimonios</option>
                      <option value="Defunciones">Defunciones</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registro *</label>
                    <input type="text" value={correccionForm.registro} onChange={(e) => setCorreccionForm({...correccionForm, registro: e.target.value})} required placeholder="B-125" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Folio</label>
                    <input type="text" value={correccionForm.folio} onChange={(e) => setCorreccionForm({...correccionForm, folio: e.target.value})} placeholder="F-45" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Corrección *</label>
                    <input type="text" value={correccionForm.correccion} onChange={(e) => setCorreccionForm({...correccionForm, correccion: e.target.value})} required placeholder="Error en apellido" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Detalle</label>
                    <textarea value={correccionForm.detalle} onChange={(e) => setCorreccionForm({...correccionForm, detalle: e.target.value})} placeholder="Detalle de la corrección..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px', resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Solicitante</label>
                    <input type="text" value={correccionForm.solicitante} onChange={(e) => setCorreccionForm({...correccionForm, solicitante: e.target.value})} placeholder="Nombre del solicitante" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                </>
              )}

              {/* FORMULARIO OBSERVACIÓN */}
              {(modalType === 'nueva_observacion' || modalType === 'editar_observacion') && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Libro *</label>
                    <input type="text" value={observacionForm.libro} onChange={(e) => setObservacionForm({...observacionForm, libro: e.target.value})} required placeholder="Libro 01" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo</label>
                    <input type="text" value={observacionForm.tipo} onChange={(e) => setObservacionForm({...observacionForm, tipo: e.target.value})} placeholder="Bautismos" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Observación *</label>
                    <textarea value={observacionForm.observacion} onChange={(e) => setObservacionForm({...observacionForm, observacion: e.target.value})} required placeholder="Descripción de la observación..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px', resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Detalle</label>
                    <input type="text" value={observacionForm.detalle} onChange={(e) => setObservacionForm({...observacionForm, detalle: e.target.value})} placeholder="Detalle adicional" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL VER ===== */}
      {viewingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setViewingItem(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>👁️ Detalles del Libro</h2>
              <button onClick={() => setViewingItem(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Tipo:</strong><span>{viewingItem.tipo}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Número:</strong><span>{viewingItem.numero}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Descripción:</strong><span>{viewingItem.descripcion}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Ubicación:</strong><span>{viewingItem.ubicacion}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Parroquia:</strong><span>{parroquias.find(p => p.id === viewingItem.parroquia)?.nombre}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Tomos:</strong><span>{viewingItem.tomos?.length || 0}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Años:</strong><span>{viewingItem.anio_inicio} - {viewingItem.anio_fin}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ELIMINAR ===== */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Estás seguro de eliminar?</h3>
            <p style={{ color: '#666' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentos;