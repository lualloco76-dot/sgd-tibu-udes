import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Solicitudes = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || { nombre: 'Secretario', parroquia: 'tibu' };
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const certificadoRef = useRef(null);

  // Estados locales para la aprobación en el modal
  const [autorizarDescarga, setAutorizarDescarga] = useState(false);
  const [firmaResponsable, setFirmaResponsable] = useState(false);

  // Formulario nueva solicitud
  const [formData, setFormData] = useState({
    parroquiaDestino: '',
    tipoPartida: 'Bautismo',
    nombrePersona: '',
    fechaAproximada: '',
    motivo: ''
  });

  // Datos de prueba (enriquecidos para igualar la imagen)
  const [solicitudes, setSolicitudes] = useState([
    { 
      id: 1, 
      solicitante: 'Laura Milena Contreras', 
      email: 'laura@email.com',
      parroquiaOrigen: 'tibu', 
      parroquiaDestino: 'sanfaustino', 
      tipoPartida: 'Bautismo', 
      nombrePersona: 'María José García López', 
      fecha: '2024-10-12', 
      motivo: 'Sacramento de Confirmación del mismo fiel. Se requiere la partida de bautismo para completar el expediente.', 
      observaciones: 'El solicitante no proporcionó el nombre completo, por lo que se ha verificado en el sistema.',
      documento: 'CERT-B-2024-015',
      estado: 'pendiente',
      fechaSacramento: '2023-08-20',
      libro: 'Libro 1',
      folio: 'F-25',
      numero: 'B-001',
      ministro: 'Padre Juan Pérez'
    },
    { 
      id: 2, 
      solicitante: 'Carlos Andrés Ramírez', 
      email: 'carlos@email.com',
      parroquiaOrigen: 'sanfaustino', 
      parroquiaDestino: 'tibu', 
      tipoPartida: 'Confirmación', 
      nombrePersona: 'Andrés Felipe Gómez', 
      fecha: '2024-10-08', 
      motivo: 'Trámite de matrimonio civil.', 
      observaciones: 'Registro verificado correctamente.',
      documento: 'CERT-C-2024-003',
      estado: 'aprobada',
      fechaSacramento: '2022-05-15',
      libro: 'Libro C-1',
      folio: 'F-12',
      numero: 'C-010',
      ministro: 'Monseñor Jorge Rodríguez'
    },
    { 
      id: 3, 
      solicitante: 'María José Martínez', 
      email: 'maria@email.com',
      parroquiaOrigen: 'ocana', 
      parroquiaDestino: 'sanfaustino', 
      tipoPartida: 'Matrimonio', 
      nombrePersona: 'Jorge Luis Pérez', 
      fecha: '2024-10-05', 
      motivo: 'Solicitud del feligrés.', 
      observaciones: '',
      documento: 'CERT-M-2024-001',
      estado: 'rechazada',
      fechaSacramento: '2021-11-20',
      libro: 'Libro M-2',
      folio: 'F-45',
      numero: 'M-008',
      ministro: 'Padre Carlos Ruiz'
    },
    { 
      id: 4, 
      solicitante: 'Juan Gabriel Torres', 
      email: 'juan@email.com',
      parroquiaOrigen: 'tibu', 
      parroquiaDestino: 'sanfaustino', 
      tipoPartida: 'Defunción', 
      nombrePersona: 'Pedro Pérez', 
      fecha: '2024-10-01', 
      motivo: 'Trámite legal.', 
      observaciones: '',
      documento: 'CERT-D-2024-002',
      estado: 'aprobada',
      fechaSacramento: '2020-02-10',
      libro: 'Libro D-1',
      folio: 'F-08',
      numero: 'D-015',
      ministro: 'Padre Juan Pérez'
    },
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

  const handleCrearSolicitud = (e) => {
    e.preventDefault();
    const nueva = {
      id: solicitudes.length + 1,
      solicitante: usuario.nombre,
      email: usuario.email,
      parroquiaOrigen: usuario.parroquia,
      parroquiaDestino: formData.parroquiaDestino,
      tipoPartida: formData.tipoPartida,
      nombrePersona: formData.nombrePersona,
      fecha: formData.fechaAproximada || new Date().toISOString().split('T')[0],
      motivo: formData.motivo,
      observaciones: '',
      documento: `CERT-${formData.tipoPartida[0]}-2024-XXX`,
      estado: 'pendiente',
      fechaSacramento: formData.fechaAproximada,
      libro: 'N/A',
      folio: 'N/A',
      numero: 'N/A',
      ministro: 'N/A'
    };
    setSolicitudes([nueva, ...solicitudes]);
    setShowModal(false);
    setFormData({ parroquiaDestino: '', tipoPartida: 'Bautismo', nombrePersona: '', fechaAproximada: '', motivo: '' });
    showToast('✅ Solicitud enviada correctamente');
  };

  const openModal = (sol) => {
    setSelectedSolicitud(sol);
    setAutorizarDescarga(sol.estado === 'aprobada');
    setFirmaResponsable(sol.estado === 'aprobada');
  };

  const handleAprobar = () => {
    if (!autorizarDescarga || !firmaResponsable) {
      showToast('⚠️ Debe autorizar la descarga y confirmar la firma', 'warning');
      return;
    }
    const updated = solicitudes.map(s => s.id === selectedSolicitud.id ? { ...s, estado: 'aprobada' } : s);
    setSolicitudes(updated);
    setSelectedSolicitud({ ...selectedSolicitud, estado: 'aprobada' });
    showToast('✅ Solicitud aprobada correctamente');
  };

  const handleRechazar = () => {
    const updated = solicitudes.map(s => s.id === selectedSolicitud.id ? { ...s, estado: 'rechazada' } : s);
    setSolicitudes(updated);
    setSelectedSolicitud({ ...selectedSolicitud, estado: 'rechazada' });
    showToast('❌ Solicitud rechazada', 'warning');
  };

  const descargarPDF = () => {
    if (!certificadoRef.current) return;
    
    html2canvas(certificadoRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Solicitud_${selectedSolicitud.documento}.pdf`);
      showToast('✅ PDF generado y descargado');
    });
  };

  // Cálculos para las tarjetas superiores
  const totalPendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const totalAprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
  const totalRechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: 'bold', zIndex: 3000, background: toast.type === 'success' ? '#4CAF50' : '#FF9800', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          {toast.message}
        </div>
      )}

      {/* HEADER MORADO */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '15px', padding: '25px 30px', color: 'white', marginBottom: '25px', boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🔄 Solicitudes Interparroquiales</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '13px' }}>Gestión de solicitudes entre parroquias de la Diócesis de Tibú.</p>
        </div>
        
        {/* TARJETAS DE ESTADÍSTICAS EN EL HEADER */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalPendientes}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>PENDIENTES</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalAprobadas}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>APROBADAS</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalRechazadas}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>RECHAZADAS</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: 'white', color: '#764ba2', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' }}>
            + Nueva Solicitud
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="text" placeholder="🔍 Buscar por solicitante, tipo de acta o nombre..." style={{ flex: 1, padding: '10px 15px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }} />
          <select style={{ padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }}>
            <option>Todos los estados</option>
            <option>Pendiente</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
          </select>
          <select style={{ padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }}>
            <option>Todas las parroquias</option>
            {parroquias.map(p => <option key={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0', color: '#666', textAlign: 'left' }}>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Solicitante</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Tipo de acta</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Parroquia origen</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Parroquia destino</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Estado</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal' }}>Fecha</th>
              <th style={{ padding: '15px 10px', fontWeight: 'normal', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(sol => (
              <tr key={sol.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '15px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                      {sol.solicitante.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{sol.solicitante}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{sol.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '15px 10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>Partida de {sol.tipoPartida}</span>
                </td>
                <td style={{ padding: '15px 10px', color: '#555' }}>{parroquias.find(p => p.id === sol.parroquiaOrigen)?.nombre || sol.parroquiaOrigen}</td>
                <td style={{ padding: '15px 10px', color: '#555' }}>{parroquias.find(p => p.id === sol.parroquiaDestino)?.nombre || sol.parroquiaDestino}</td>
                <td style={{ padding: '15px 10px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: sol.estado === 'aprobada' ? '#d4edda' : sol.estado === 'rechazada' ? '#f8d7da' : '#fff3cd',
                    color: sol.estado === 'aprobada' ? '#155724' : sol.estado === 'rechazada' ? '#721c24' : '#856404'
                  }}>
                    {sol.estado === 'aprobada' ? '✓ Aprobada' : sol.estado === 'rechazada' ? '✕ Rechazada' : '⏳ Pendiente'}
                  </span>
                </td>
                <td style={{ padding: '15px 10px', color: '#555' }}>{sol.fecha}</td>
                <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button onClick={() => openModal(sol)} style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer' }} title="Ver detalles">👁️</button>
                    <button onClick={() => openModal(sol)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer' }} title="Aprobar">✔️</button>
                    <button onClick={() => { setSelectedSolicitud(sol); handleRechazar(); }} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer' }} title="Rechazar">❌</button>
                    <button 
                      onClick={() => { setSelectedSolicitud(sol); openModal(sol); }} 
                      disabled={sol.estado !== 'aprobada'} 
                      style={{ background: sol.estado === 'aprobada' ? '#667eea' : '#e0e0e0', color: sol.estado === 'aprobada' ? 'white' : '#999', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: sol.estado === 'aprobada' ? 'pointer' : 'not-allowed' }} 
                      title="Descargar"
                    >
                      ⬇️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Paginación ficticia para igualar diseño */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <span>Anterior</span>
          <button style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 10px' }}>1</button>
          <button style={{ background: '#f0f0f0', border: 'none', borderRadius: '5px', padding: '5px 10px' }}>2</button>
          <button style={{ background: '#f0f0f0', border: 'none', borderRadius: '5px', padding: '5px 10px' }}>3</button>
          <span>Siguiente</span>
        </div>
      </div>

      {/* MODAL DE REVISIÓN (Idéntico a la imagen 1) */}
      {selectedSolicitud && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            
            {/* Header Modal */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Revisar Solicitud
                </h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>Detalle de la solicitud interparroquial</p>
              </div>
              <button onClick={() => setSelectedSolicitud(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
              
              {/* Columna Izquierda: Detalles */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* Solicitante */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#17a2b8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedSolicitud.solicitante}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{selectedSolicitud.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Documento solicitado</div>
                      <div style={{ color: '#dc3545' }}>{selectedSolicitud.documento}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Tipo de acta</div>
                      <div style={{ color: '#666' }}>{selectedSolicitud.tipoPartida}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Parroquia solicitante</div>
                      <div style={{ color: '#666' }}>{parroquias.find(p => p.id === selectedSolicitud.parroquiaOrigen)?.nombre}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px' }}>Parroquia propietaria</div>
                      <div style={{ color: '#666' }}>{parroquias.find(p => p.id === selectedSolicitud.parroquiaDestino)?.nombre}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px', fontSize: '13px' }}>Motivo de la solicitud</div>
                    <div style={{ color: '#666', fontSize: '13px', background: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>{selectedSolicitud.motivo}</div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px', fontSize: '13px' }}>Observaciones de la solicitud</div>
                    <div style={{ color: '#666', fontSize: '13px', background: '#fff3cd', padding: '10px', borderRadius: '5px', border: '1px solid #ffeeba' }}>{selectedSolicitud.observaciones || 'Ninguna'}</div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '3px', fontSize: '13px' }}>Estado</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                       <span style={{ padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', background: selectedSolicitud.estado === 'aprobada' ? '#d4edda' : selectedSolicitud.estado === 'rechazada' ? '#f8d7da' : '#fff3cd', color: selectedSolicitud.estado === 'aprobada' ? '#155724' : selectedSolicitud.estado === 'rechazada' ? '#721c24' : '#856404' }}>
                        {selectedSolicitud.estado.toUpperCase()}
                      </span>
                      <span style={{ color: '#999', fontSize: '11px' }}>Recibida el {selectedSolicitud.fecha} a las 10:24 a.m.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Vista Previa y Controles */}
              <div style={{ flex: 1, background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#333' }}>Vista previa del certificado</h3>
                
                {/* EL CERTIFICADO (Este div se convierte en PDF) */}
                <div ref={certificadoRef} style={{ background: 'white', border: '2px solid #ccc', padding: '20px', borderRadius: '5px', position: 'relative' }}>
                  <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <div style={{ fontSize: '10px', color: '#666' }}>⛪ DIÓCESIS DE TIBÚ</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>CERTIFICADO DE {selectedSolicitud.tipoPartida.toUpperCase()}</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Documento autorizado interparroquialmente</div>
                  </div>
                  
                  <div style={{ fontSize: '10px', textAlign: 'justify', lineHeight: '1.5' }}>
                    <p>Por medio de la presente, la {parroquias.find(p => p.id === selectedSolicitud.parroquiaDestino)?.nombre}, certifica que:</p>
                    <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', margin: '10px 0' }}>{selectedSolicitud.nombrePersona}</p>
                    <p>Recibió el sacramento de {selectedSolicitud.tipoPartida} el día {selectedSolicitud.fechaSacramento}, siendo ministro {selectedSolicitud.ministro}.</p>
                    
                    <div style={{ background: '#f0f0f0', padding: '8px', marginTop: '10px', fontSize: '9px' }}>
                      <div>Libro: {selectedSolicitud.libro} | Folio: {selectedSolicitud.folio}</div>
                      <div>Número: {selectedSolicitud.numero}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                    <div style={{ textAlign: 'center', width: '100px' }}>
                      <div style={{ borderBottom: '1px solid #333', height: '20px' }}></div>
                      <div style={{ fontSize: '9px', marginTop: '2px' }}>Firma Párroco</div>
                    </div>
                    
                    {/* QR CODE */}
                    <div style={{ textAlign: 'center' }}>
                      <QRCodeSVG value={`https://diocesisdetibu.com/validar/${selectedSolicitud.documento}`} size={50} />
                    </div>

                    <div style={{ textAlign: 'center', width: '80px' }}>
                      <div style={{ width: '60px', height: '60px', border: '1px dashed #999', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '7px', color: '#999' }}>SELLO</div>
                    </div>
                  </div>
                </div>

                <button onClick={descargarPDF} style={{ width: '100%', padding: '8px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', marginTop: '10px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ⬇️ Descargar PDF de Vista Previa
                </button>

                <div style={{ marginTop: '15px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#333' }}>Adjuntos</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e3f2fd', padding: '8px', borderRadius: '5px', fontSize: '11px' }}>
                    <span>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{selectedSolicitud.documento}.pdf</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>Certificado de bautismo (245 KB)</div>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2196F3' }}>⬇️</button>
                  </div>
                </div>

                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autorizarDescarga} onChange={(e) => setAutorizarDescarga(e.target.checked)} />
                    <span>Autorizar descarga del certificado</span>
                  </label>
                  <div style={{ fontSize: '9px', color: '#666', paddingLeft: '20px' }}>Al aprobar, se permitirá la descarga del certificado para la parroquia solicitante.</div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', marginTop: '5px' }}>
                    <input type="checkbox" checked={firmaResponsable} onChange={(e) => setFirmaResponsable(e.target.checked)} />
                    <span>Firma del responsable parroquial</span>
                  </label>
                  <div style={{ fontSize: '9px', color: '#dc3545', paddingLeft: '20px', background: '#f8d7da', padding: '5px', borderRadius: '4px' }}>Al aprobar, se notificará con la firma del Párroco Juan Pérez.</div>
                </div>
              </div>
            </div>

            {/* Footer Modal: Botones de Acción */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8f9fa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button onClick={handleRechazar} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ❌ Rechazar
              </button>
              <button style={{ background: '#ffc107', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📝 Solicitar corrección
              </button>
              <button onClick={handleAprobar} style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ✔️ Aprobar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Solicitud (Mantenido del código anterior) */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '500px', padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>➕ Nueva Solicitud Interparroquial</h2>
            <form onSubmit={handleCrearSolicitud}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Parroquia a la que solicita *</label>
                <select required value={formData.parroquiaDestino} onChange={(e) => setFormData({...formData, parroquiaDestino: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <option value="">Seleccione...</option>
                  {parroquias.filter(p => p.id !== usuario.parroquia).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Tipo de Partida *</label>
                <select required value={formData.tipoPartida} onChange={(e) => setFormData({...formData, tipoPartida: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}>
                  <option value="Bautismo">Bautismo</option>
                  <option value="Confirmación">Confirmación</option>
                  <option value="Matrimonio">Matrimonio</option>
                  <option value="Defunción">Defunción</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombre Completo del Feligrés *</label>
                <input required type="text" value={formData.nombrePersona} onChange={(e) => setFormData({...formData, nombrePersona: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Año Aproximado del Registro *</label>
                <input required type="date" value={formData.fechaAproximada} onChange={(e) => setFormData({...formData, fechaAproximada: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Motivo / Justificación *</label>
                <textarea required value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', minHeight: '80px' }} placeholder="Ej: Trámite de matrimonio civil..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#f0f0f0', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#667eea', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solicitudes;