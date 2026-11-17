import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Certificados = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || null;
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [activeTab, setActiveTab] = useState('emitidos');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingCertificado, setEditingCertificado] = useState(null);
  const [viewingCertificado, setViewingCertificado] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // Referencia para generar el PDF
  const certificadoRef = useRef(null);

  const [certificadoForm, setCertificadoForm] = useState({
    tipo: 'Bautismo',
    numero: '',
    nombres: '',
    apellidos: '',
    documento: '',
    fecha_sacramento: '',
    parroquia: 'tibu',
    ministro: '',
    libro: '',
    folio: '',
    registro: '',
    notas: ''
  });

  const [certificados, setCertificados] = useState([
    {
      id: 1,
      tipo: 'Bautismo',
      numero: 'CERT-B-001',
      nombres: 'María José',
      apellidos: 'García López',
      documento: '123456789',
      fecha_sacramento: '2023-08-20',
      fecha_emision: '2024-02-15',
      parroquia: 'tibu',
      ministro: 'Padre Juan Pérez',
      libro: 'Libro 01',
      folio: 'F-25',
      registro: 'B-001',
      estado: 'emitido',
      emitido_por: 'Canciller',
      notas: 'Certificado para trámite escolar'
    },
    {
      id: 2,
      tipo: 'Confirmación',
      numero: 'CERT-C-001',
      nombres: 'Carlos Andrés',
      apellidos: 'Martínez García',
      documento: '1001234567',
      fecha_sacramento: '2024-05-10',
      fecha_emision: '2024-06-20',
      parroquia: 'tibu',
      ministro: 'Monseñor Jorge Rodríguez',
      libro: 'Libro C-01',
      folio: 'F-05',
      registro: 'C-001',
      estado: 'emitido',
      emitido_por: 'Canciller',
      notas: ''
    },
    {
      id: 3,
      tipo: 'Matrimonio',
      numero: 'CERT-M-001',
      nombres: 'Miguel Ángel',
      apellidos: 'Torres García',
      documento: '1090123456',
      fecha_sacramento: '2024-06-08',
      fecha_emision: '2024-03-01',
      parroquia: 'tibu',
      ministro: 'Padre Juan Pérez',
      libro: 'M-1',
      folio: 'F-30',
      registro: 'M-005',
      estado: 'emitido',
      emitido_por: 'Canciller',
      notas: 'Certificado interparroquial'
    },
    {
      id: 4,
      tipo: 'Defunción',
      numero: 'CERT-D-001',
      nombres: 'José Antonio',
      apellidos: 'Martínez García',
      documento: '12345678',
      fecha_sacramento: '2024-01-10',
      fecha_emision: '2024-01-15',
      parroquia: 'tibu',
      ministro: 'Padre Juan Pérez',
      libro: 'Libro D-01',
      folio: 'F-05',
      registro: 'D-001',
      estado: 'emitido',
      emitido_por: 'Secretario General',
      notas: 'Certificado para trámite de sucesión'
    },
    {
      id: 5,
      tipo: 'Bautismo',
      numero: 'CERT-B-002',
      nombres: 'Juan Pablo',
      apellidos: 'Pérez Martínez',
      documento: '987654321',
      fecha_sacramento: '2023-06-15',
      fecha_emision: '2024-05-10',
      parroquia: 'sanfaustino',
      ministro: 'Padre Carlos Ruiz',
      libro: 'Libro 02',
      folio: 'F-10',
      registro: 'B-002',
      estado: 'emitido',
      emitido_por: 'Canciller',
      notas: ''
    },
    {
      id: 6,
      tipo: 'Confirmación',
      numero: 'CERT-C-002',
      nombres: 'Laura Valentina',
      apellidos: 'Rodríguez Pérez',
      documento: '1002345678',
      fecha_sacramento: '2024-05-12',
      fecha_emision: '2024-07-01',
      parroquia: 'sanfaustino',
      ministro: 'Monseñor Jorge Rodríguez',
      libro: 'Libro C-02',
      folio: 'F-08',
      registro: 'C-002',
      estado: 'pendiente',
      emitido_por: 'Secretario General',
      notas: 'En proceso de firma'
    },
  ]);

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú' },
    { id: 'sanfaustino', nombre: 'San Faustino' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña' },
    { id: 'cucuta', nombre: 'San José - Cúcuta' },
  ];

  const tiposCertificado = ['Bautismo', 'Confirmación', 'Matrimonio', 'Defunción'];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingCertificado(item);
    
    if (item) {
      setCertificadoForm({
        tipo: item.tipo,
        numero: item.numero,
        nombres: item.nombres,
        apellidos: item.apellidos,
        documento: item.documento,
        fecha_sacramento: item.fecha_sacramento,
        parroquia: item.parroquia,
        ministro: item.ministro,
        libro: item.libro,
        folio: item.folio,
        registro: item.registro,
        notas: item.notas
      });
    } else {
      setCertificadoForm({
        tipo: 'Bautismo',
        numero: '',
        nombres: '',
        apellidos: '',
        documento: '',
        fecha_sacramento: '',
        parroquia: 'tibu',
        ministro: '',
        libro: '',
        folio: '',
        registro: '',
        notas: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (modalType === 'nuevo_certificado') {
      const nuevo = {
        id: certificados.length + 1,
        ...certificadoForm,
        numero: `CERT-${certificadoForm.tipo[0]}-${String(certificados.length + 1).padStart(3, '0')}`,
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: 'emitido',
        emitido_por: usuario?.nombre || 'Sistema'
      };
      setCertificados([nuevo, ...certificados]);
      registrarAuditoria('CREAR', 'certificados', nuevo.id, 'Certificado emitido: ' + nuevo.numero);
      showToast('✅ Certificado emitido correctamente');
    } else if (modalType === 'editar_certificado' && editingCertificado) {
      const updated = certificados.map(c => 
        c.id === editingCertificado.id ? { ...c, ...certificadoForm } : c
      );
      setCertificados(updated);
      registrarAuditoria('EDITAR', 'certificados', editingCertificado.id, 'Certificado actualizado');
      showToast('✅ Certificado actualizado correctamente');
    }
    
    setShowModal(false);
    setEditingCertificado(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setCertificados(certificados.filter(c => c.id !== deleteConfirm.id));
    registrarAuditoria('ELIMINAR', 'certificados', deleteConfirm.id, 'Certificado eliminado');
    showToast('🗑️ Certificado eliminado', 'warning');
    setDeleteConfirm(null);
  };

  const handleAnular = (certificado) => {
    const updated = certificados.map(c => 
      c.id === certificado.id ? { ...c, estado: 'anulado' } : c
    );
    setCertificados(updated);
    registrarAuditoria('ANULAR', 'certificados', certificado.id, 'Certificado anulado: ' + certificado.numero);
    showToast('⚠️ Certificado anulado', 'warning');
  };

  const handleReimprimir = (certificado) => {
    setShowPreview(certificado);
    registrarAuditoria('REIMPRIMIR', 'certificados', certificado.id, 'Reimpresión solicitada');
  };

  const descargarPDF = () => {
    if (!certificadoRef.current) return;

    html2canvas(certificadoRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado_${showPreview.numero}.pdf`);
      showToast('✅ PDF generado y descargado correctamente');
    });
  };

  const filteredCertificados = certificados.filter(c => {
    const matchSearch = !searchTerm || 
      c.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documento.includes(searchTerm);
    const matchTipo = filterTipo === 'todos' || c.tipo === filterTipo;
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado;
    return matchSearch && matchTipo && matchEstado;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredCertificados.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCertificados.length / itemsPerPage);

  const tabs = [
    { id: 'emitidos', label: '📄 Emitidos', icon: '📄' },
    { id: 'pendientes', label: '⏳ Pendientes', icon: '⏳' },
    { id: 'anulados', label: '❌ Anulados', icon: '❌' },
    { id: 'estadisticas', label: '📊 Estadísticas', icon: '📊' },
  ];

  const stats = {
    total: certificados.length,
    emitidos: certificados.filter(c => c.estado === 'emitido').length,
    pendientes: certificados.filter(c => c.estado === 'pendiente').length,
    anulados: certificados.filter(c => c.estado === 'anulado').length,
    bautismos: certificados.filter(c => c.tipo === 'Bautismo').length,
    confirmaciones: certificados.filter(c => c.tipo === 'Confirmación').length,
    matrimonios: certificados.filter(c => c.tipo === 'Matrimonio').length,
    defunciones: certificados.filter(c => c.tipo === 'Defunción').length,
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '8px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#f44336' : '#FF9800',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        borderRadius: '15px',
        padding: '25px 30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 8px 25px rgba(33, 150, 243, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>📄 Certificados Sacramentales</h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Emisión, gestión y control de certificados parroquiales
            </p>
          </div>
          <button 
            onClick={() => openModal('nuevo_certificado')}
            style={{
              background: 'white',
              color: '#1976D2',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s'
            }}
          >
            ➕ Emitir Nuevo Certificado
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              border: '2px solid #e0e0e0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              background: activeTab === tab.id ? '#2196F3' : 'white',
              color: activeTab === tab.id ? 'white' : '#333'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        
        {activeTab === 'emitidos' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: '#f8f9fa', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '10px 15px', minWidth: '200px' }}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, número o documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', marginLeft: '10px', background: 'transparent' }}
                />
              </div>
              <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <option value="todos">Todos los tipos</option>
                {tiposCertificado.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <option value="todos">Todos los estados</option>
                <option value="emitido">Emitido</option>
                <option value="pendiente">Pendiente</option>
                <option value="anulado">Anulado</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {currentItems.map(cert => (
                <div key={cert.id} style={{
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '2px solid #e0e0e0',
                  transition: 'all 0.3s',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{
                      width: '45px', height: '45px', borderRadius: '10px',
                      background: cert.tipo === 'Bautismo' ? '#4FC3F7' : cert.tipo === 'Confirmación' ? '#FF9800' : cert.tipo === 'Matrimonio' ? '#E91E63' : '#9E9E9E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px'
                    }}>
                      {cert.tipo === 'Bautismo' ? '💧' : cert.tipo === 'Confirmación' ? '🔥' : cert.tipo === 'Matrimonio' ? '💑' : '🕊️'}
                    </div>
                    <span style={{
                      padding: '5px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold',
                      background: cert.estado === 'emitido' ? '#d4edda' : cert.estado === 'pendiente' ? '#fff3cd' : '#f8d7da',
                      color: cert.estado === 'emitido' ? '#155724' : cert.estado === 'pendiente' ? '#856404' : '#721c24'
                    }}>
                      {cert.estado === 'emitido' ? '✅ Emitido' : cert.estado === 'pendiente' ? '⏳ Pendiente' : '❌ Anulado'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0', fontSize: '16px', color: '#2c3e50' }}>{cert.nombres} {cert.apellidos}</h3>
                  <p style={{ color: '#2196F3', fontSize: '13px', fontWeight: 'bold', margin: '5px 0' }}>{cert.numero}</p>
                  <p style={{ color: '#666', fontSize: '13px', margin: '5px 0' }}>{cert.tipo} | {cert.fecha_sacramento}</p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '12px', color: '#999', flexWrap: 'wrap' }}>
                    <span>🏛️ {parroquias.find(p => p.id === cert.parroquia)?.nombre}</span>
                    <span>📖 {cert.libro} / {cert.folio}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '5px', marginTop: '15px', flexWrap: 'wrap' }}>
                    <button onClick={() => setViewingCertificado(cert)} style={styles.btnView}>👁️ Ver</button>
                    <button onClick={() => handleReimprimir(cert)} style={styles.btnPrint}>🖨️ Imprimir</button>
                    <button onClick={() => openModal('editar_certificado', cert)} style={styles.btnEdit}>✏️ Editar</button>
                    <button onClick={() => handleAnular(cert)} style={styles.btnCancel}>⚠️ Anular</button>
                    <button onClick={() => setDeleteConfirm(cert)} style={styles.btnDelete}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}>«</button>
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}>←</button>
              <span style={{ color: '#666' }}>Página {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}>→</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}>»</button>
            </div>
          </div>
        )}

        {activeTab === 'pendientes' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>⏳ Certificados Pendientes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {certificados.filter(c => c.estado === 'pendiente').map(cert => (
                <div key={cert.id} style={{ background: '#fff3cd', borderRadius: '12px', padding: '20px', border: '2px solid #ffeeba' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>⏳ {cert.nombres} {cert.apellidos}</h3>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>{cert.numero}</span>
                  </div>
                  <p style={{ margin: '5px 0', color: '#666' }}>{cert.tipo} | {cert.fecha_sacramento}</p>
                  <p style={{ margin: '5px 0', color: '#999', fontSize: '13px' }}>{cert.notas || 'Sin notas'}</p>
                </div>
              ))}
              {certificados.filter(c => c.estado === 'pendiente').length === 0 && (
                <p style={{ color: '#999' }}>No hay certificados pendientes</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'anulados' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>❌ Certificados Anulados</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {certificados.filter(c => c.estado === 'anulado').map(cert => (
                <div key={cert.id} style={{ background: '#f8d7da', borderRadius: '12px', padding: '20px', border: '2px solid #f5c6cb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>❌ {cert.nombres} {cert.apellidos}</h3>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#721c24' }}>{cert.numero}</span>
                  </div>
                  <p style={{ margin: '5px 0', color: '#666' }}>{cert.tipo} | {cert.fecha_sacramento}</p>
                  <p style={{ margin: '5px 0', color: '#999', fontSize: '13px' }}>{cert.notas || 'Sin motivo registrado'}</p>
                </div>
              ))}
              {certificados.filter(c => c.estado === 'anulado').length === 0 && (
                <p style={{ color: '#999' }}>No hay certificados anulados</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📊 Estadísticas de Certificados</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: '#e3f2fd', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px' }}>📄</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976D2' }}>{stats.total}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Certificados</div>
              </div>
              <div style={{ background: '#d4edda', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px' }}>✅</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>{stats.emitidos}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Emitidos</div>
              </div>
              <div style={{ background: '#fff3cd', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px' }}>⏳</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{stats.pendientes}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Pendientes</div>
              </div>
              <div style={{ background: '#f8d7da', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '30px' }}>❌</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>{stats.anulados}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Anulados</div>
              </div>
            </div>

            <h3 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px' }}>📈 Por Tipo de Sacramento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>💧 Bautismos</span>
                  <strong>{stats.bautismos}</strong>
                </div>
                <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${(stats.bautismos / stats.total) * 100}%`, background: '#4FC3F7', borderRadius: '4px' }}></div>
                </div>
              </div>
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>🔥 Confirmaciones</span>
                  <strong>{stats.confirmaciones}</strong>
                </div>
                <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${(stats.confirmaciones / stats.total) * 100}%`, background: '#FF9800', borderRadius: '4px' }}></div>
                </div>
              </div>
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>💑 Matrimonios</span>
                  <strong>{stats.matrimonios}</strong>
                </div>
                <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${(stats.matrimonios / stats.total) * 100}%`, background: '#E91E63', borderRadius: '4px' }}></div>
                </div>
              </div>
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>🕊️ Defunciones</span>
                  <strong>{stats.defunciones}</strong>
                </div>
                <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${(stats.defunciones / stats.total) * 100}%`, background: '#9E9E9E', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', borderRadius: '10px 10px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>
                {modalType === 'nuevo_certificado' ? '➕ Emitir Certificado' : '✏️ Editar Certificado'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Tipo *</label>
                  <select value={certificadoForm.tipo} onChange={(e) => setCertificadoForm({...certificadoForm, tipo: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    {tiposCertificado.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Parroquia *</label>
                  <select value={certificadoForm.parroquia} onChange={(e) => setCertificadoForm({...certificadoForm, parroquia: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombres *</label>
                  <input type="text" value={certificadoForm.nombres} onChange={(e) => setCertificadoForm({...certificadoForm, nombres: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Apellidos *</label>
                  <input type="text" value={certificadoForm.apellidos} onChange={(e) => setCertificadoForm({...certificadoForm, apellidos: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Documento</label>
                  <input type="text" value={certificadoForm.documento} onChange={(e) => setCertificadoForm({...certificadoForm, documento: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Fecha Sacramento *</label>
                  <input type="date" value={certificadoForm.fecha_sacramento} onChange={(e) => setCertificadoForm({...certificadoForm, fecha_sacramento: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Libro</label>
                  <input type="text" value={certificadoForm.libro} onChange={(e) => setCertificadoForm({...certificadoForm, libro: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Folio</label>
                  <input type="text" value={certificadoForm.folio} onChange={(e) => setCertificadoForm({...certificadoForm, folio: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Registro</label>
                  <input type="text" value={certificadoForm.registro} onChange={(e) => setCertificadoForm({...certificadoForm, registro: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Ministro</label>
                <input type="text" value={certificadoForm.ministro} onChange={(e) => setCertificadoForm({...certificadoForm, ministro: e.target.value})} placeholder="Nombre del sacerdote/obispo" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Notas</label>
                <textarea value={certificadoForm.notas} onChange={(e) => setCertificadoForm({...certificadoForm, notas: e.target.value})} placeholder="Notas adicionales..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '60px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#f0f0f0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 {modalType === 'nuevo_certificado' ? 'Emitir Certificado' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingCertificado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setViewingCertificado(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>👁️ Detalles del Certificado</h2>
              <button onClick={() => setViewingCertificado(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Número:</strong><span>{viewingCertificado.numero}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Tipo:</strong><span>{viewingCertificado.tipo}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Persona:</strong><span>{viewingCertificado.nombres} {viewingCertificado.apellidos}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Documento:</strong><span>{viewingCertificado.documento}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Fecha Sacramento:</strong><span>{viewingCertificado.fecha_sacramento}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Fecha Emisión:</strong><span>{viewingCertificado.fecha_emision}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Parroquia:</strong><span>{parroquias.find(p => p.id === viewingCertificado.parroquia)?.nombre}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Ministro:</strong><span>{viewingCertificado.ministro}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Libro/Folio:</strong><span>{viewingCertificado.libro} / {viewingCertificado.folio}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}><strong>Registro:</strong><span>{viewingCertificado.registro}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><strong>Emitido por:</strong><span>{viewingCertificado.emitido_por}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW CERTIFICADO - DISEÑO IDÉNTICO A LA IMAGEN */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, overflowY: 'auto', padding: '20px' }} onClick={() => setShowPreview(null)}>
          <div style={{ width: '100%', maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            
            {/* ENCABEZADO DEL MODAL */}
            <div style={{ background: '#2196F3', color: 'white', padding: '15px 20px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Vista previa del certificado</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', opacity: 0.9 }}>Certificado autorizado para descarga interparroquial</p>
              </div>
              <button onClick={() => setShowPreview(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* CUERPO DEL CERTIFICADO (Aquí se genera el PDF) */}
            <div ref={certificadoRef} style={{ background: 'white', padding: '40px', border: '1px solid #ccc', borderBottom: 'none' }}>
              
              {/* Membrete */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ fontSize: '40px' }}>⛪</div>
                  <div>
                    <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#666' }}>DIÓCESIS DE TIBÚ</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Iglesia Católica</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                  <div style={{ fontWeight: 'bold' }}>{parroquias.find(p => p.id === showPreview.parroquia)?.nombre}</div>
                  <div>Tibú, Norte de Santander</div>
                </div>
              </div>

              {/* Título */}
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '22px', color: '#2c3e50', margin: '0 0 5px 0', fontFamily: 'serif' }}>CERTIFICADO DE {showPreview.tipo.toUpperCase()}</h1>
                <div style={{ fontSize: '10px', letterSpacing: '1px', color: '#666', marginBottom: '10px' }}>DOCUMENTO AUTORIZADO INTERPARROQUIALMENTE</div>
                <div style={{ width: '80px', height: '2px', background: '#2c3e50', margin: '0 auto' }}></div>
              </div>

              {/* Cuerpo del texto */}
              <div style={{ textAlign: 'justify', fontSize: '13px', lineHeight: '1.6', color: '#333' }}>
                <p>
                  Por medio de la presente, la <strong>{parroquias.find(p => p.id === showPreview.parroquia)?.nombre}</strong>, perteneciente a la Diócesis de Tibú, certifica que:
                </p>
                
                <h2 style={{ fontSize: '18px', color: '#2c3e50', textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>
                  {showPreview.nombres} {showPreview.apellidos}
                </h2>
                
                {showPreview.tipo === 'Matrimonio' ? (
                  <p style={{ textAlign: 'center' }}>
                    y<br/>
                    <strong>Camila Andrea Pérez Gómez</strong><br/>
                    Contrajeron matrimonio el día <strong>{showPreview.fecha_sacramento}</strong><br/>
                    En la parroquia <strong>{parroquias.find(p => p.id === showPreview.parroquia)?.nombre}</strong><br/>
                    Siendo el ministro <strong>{showPreview.ministro}</strong>
                  </p>
                ) : (
                  <p style={{ textAlign: 'center' }}>
                    Recibió el sacramento de <strong>{showPreview.tipo}</strong> el día <strong>{showPreview.fecha_sacramento}</strong><br/>
                    En la parroquia <strong>{parroquias.find(p => p.id === showPreview.parroquia)?.nombre}</strong><br/>
                    Siendo el ministro <strong>{showPreview.ministro}</strong>
                  </p>
                )}

                {/* Tabla de datos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: '#ccc', border: '1px solid #ccc', margin: '25px 0', fontSize: '11px' }}>
                  <div style={{ background: 'white', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#666', marginBottom: '3px' }}>Libro:</div>
                    <div>{showPreview.libro}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#666', marginBottom: '3px' }}>Folio:</div>
                    <div>{showPreview.folio}</div>
                  </div>
                  <div style={{ background: 'white', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', color: '#666', marginBottom: '3px' }}>Número:</div>
                    <div>{showPreview.registro}</div>
                  </div>
                </div>

                <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '30px' }}>
                  Se expide el presente certificado a solicitud de la Parroquia Nuestra Señora del Rosario de El Zulia, para los fines pertinentes correspondientes.
                </p>

                <p style={{ textAlign: 'right', fontSize: '12px', marginBottom: '40px' }}>
                  Tibú, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Firmas y Sello */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                
                {/* Sello */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', border: '2px solid #2c3e50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#2c3e50', fontSize: '8px', fontWeight: 'bold' }}>
                    PARROQUIA<br/>SAN LUÍS<br/>BELTRÁN
                  </div>
                </div>

                {/* Firma y QR */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'cursive', fontSize: '20px', color: '#333', marginBottom: '5px' }}>Juan Pérez</div>
                    <div style={{ borderTop: '1px solid #333', paddingTop: '5px', width: '150px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{showPreview.ministro}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>Párroco</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{parroquias.find(p => p.id === showPreview.parroquia)?.nombre}</div>
                    </div>
                  </div>
                  
                  {/* QR CODE */}
                  <div style={{ textAlign: 'center' }}>
                    <QRCodeSVG value={`https://diocesisdetibu.com/validar/${showPreview.numero}`} size={60} />
                    <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>Validar</div>
                  </div>
                </div>

              </div>
            </div>

            {/* BOTONES DEL MODAL (Idénticos a la imagen) */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', display: 'flex', justifyContent: 'center', gap: '10px', border: '1px solid #ccc', borderTop: 'none' }}>
              <button onClick={() => setShowPreview(null)} style={{ background: '#e0e0e0', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                ✕ Cerrar
              </button>
              <button onClick={() => window.print()} style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                🖨️ Imprimir
              </button>
              <button onClick={descargarPDF} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                📥 Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: '10px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Eliminar certificado?</h3>
            <p style={{ color: '#666' }}>{deleteConfirm.numero} - {deleteConfirm.nombres} {deleteConfirm.apellidos}</p>
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

const styles = {
  btnView: { background: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  btnPrint: { background: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  btnEdit: { background: '#ffc107', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  btnCancel: { background: '#fd7e14', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  btnDelete: { background: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  pageBtn: { background: 'white', border: '1px solid #dee2e6', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' },
};

export default Certificados;