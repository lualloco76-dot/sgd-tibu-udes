import React, { useState } from 'react';

const Configuracion = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [toast, setToast] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [generalForm, setGeneralForm] = useState({
    nombreSistema: 'Gestor Documental Parroquial',
    nombreIglesia: 'Diócesis de Tibú',
    obispo: 'Monseñor Jorge Rodríguez',
    canciller: 'Padre Juan Pérez',
    direccion: 'Calle Principal #123, Tibú, Norte de Santander',
    telefono: '+57 300 123 4567',
    email: 'info@diocesis-tibu.org',
    sitioWeb: 'www.diocesis-tibu.org'
  });

  const [certificadoForm, setCertificadoForm] = useState({
    encabezado: 'IGLESIA CATÓLICA',
    subencabezado: 'Diócesis de Tibú',
    pieTexto: 'Certificado válido solo con firma y sello original',
    incluirQR: true,
    incluirCodigo: true,
    formatoFecha: 'DD/MM/YYYY',
    colorPrimario: '#2c3e50'
  });

  const [seguridadForm, setSeguridadForm] = useState({
    longitudMinima: 8,
    requerirMayusculas: true,
    requerirNumeros: true,
    requerirSimbolos: false,
    expiracionSesion: 30,
    intentosFallidos: 3,
    bloqueoAutomatico: true,
    dobleFactor: false,
    sslObligatorio: true
  });

  const [respaldoForm, setRespaldoForm] = useState({
    frecuencia: 'diario',
    hora: '02:00',
    retencionDias: 30,
    incluirArchivos: true,
    comprimirRespaldos: true,
    respaldoAutomatico: true
  });

  const [aparienciaForm, setAparienciaForm] = useState({
    tema: 'claro',
    colorPrimario: '#667eea',
    colorSecundario: '#764ba2',
    mostrarAnimaciones: true,
    sidebarExpandido: true
  });

  const [parroquias, setParroquias] = useState([
    { id: 1, nombre: 'San Luís Beltrán', municipio: 'Tibú', codigo: 'TIB-01', activa: true },
    { id: 2, nombre: 'San Faustino', municipio: 'San Faustino', codigo: 'SFA-02', activa: true },
    { id: 3, nombre: 'Santa Ana', municipio: 'Ocaña', codigo: 'OCA-03', activa: true },
    { id: 4, nombre: 'San José', municipio: 'Cúcuta', codigo: 'CUC-04', activa: true },
  ]);

  const [showParroquiaModal, setShowParroquiaModal] = useState(false);
  const [editingParroquia, setEditingParroquia] = useState(null);
  const [parroquiaForm, setParroquiaForm] = useState({ nombre: '', municipio: '', codigo: '', activa: true });
  const [deleteParroquia, setDeleteParroquia] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    setHasChanges(false);
    showToast('✅ Configuración guardada correctamente');
  };

  const handleChange = (setter, form, field, value) => {
    setter({ ...form, [field]: value });
    setHasChanges(true);
  };

  const handleSaveParroquia = (e) => {
    e.preventDefault();
    if (editingParroquia) {
      setParroquias(parroquias.map(p => p.id === editingParroquia.id ? { ...p, ...parroquiaForm } : p));
      showToast('✅ Parroquia actualizada');
    } else {
      setParroquias([...parroquias, { id: parroquias.length + 1, ...parroquiaForm }]);
      showToast('✅ Parroquia agregada');
    }
    setShowParroquiaModal(false);
    setEditingParroquia(null);
    setParroquiaForm({ nombre: '', municipio: '', codigo: '', activa: true });
  };

  const handleDeleteParroquia = () => {
    if (!deleteParroquia) return;
    setParroquias(parroquias.filter(p => p.id !== deleteParroquia.id));
    showToast('🗑️ Parroquia eliminada', 'warning');
    setDeleteParroquia(null);
  };

  const handleBackup = () => {
    showToast('💾 Generando respaldo... Espere por favor');
    setTimeout(() => showToast('✅ Respaldo generado correctamente'), 2000);
  };

  const handleRestore = () => {
    showToast('⚠️ Seleccione un archivo de respaldo');
  };

  const sections = [
    { id: 'general', label: 'General', icon: '🏛️' },
    { id: 'certificados', label: 'Certificados', icon: '📄' },
    { id: 'seguridad', label: 'Seguridad', icon: '🔒' },
    { id: 'respaldos', label: 'Respaldos', icon: '💾' },
    { id: 'parroquias', label: 'Parroquias', icon: '⛪' },
    { id: 'apariencia', label: 'Apariencia', icon: '🎨' },
  ];

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#333'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>🏛️ Configuración General</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Nombre del Sistema</label>
                <input type="text" value={generalForm.nombreSistema} onChange={(e) => handleChange(setGeneralForm, generalForm, 'nombreSistema', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nombre de la Iglesia/Diócesis</label>
                <input type="text" value={generalForm.nombreIglesia} onChange={(e) => handleChange(setGeneralForm, generalForm, 'nombreIglesia', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Obispo</label>
                <input type="text" value={generalForm.obispo} onChange={(e) => handleChange(setGeneralForm, generalForm, 'obispo', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Canciller</label>
                <input type="text" value={generalForm.canciller} onChange={(e) => handleChange(setGeneralForm, generalForm, 'canciller', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={generalForm.direccion} onChange={(e) => handleChange(setGeneralForm, generalForm, 'direccion', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input type="tel" value={generalForm.telefono} onChange={(e) => handleChange(setGeneralForm, generalForm, 'telefono', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={generalForm.email} onChange={(e) => handleChange(setGeneralForm, generalForm, 'email', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sitio Web</label>
                <input type="text" value={generalForm.sitioWeb} onChange={(e) => handleChange(setGeneralForm, generalForm, 'sitioWeb', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        );

      case 'certificados':
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📄 Configuración de Certificados</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Encabezado</label>
                <input type="text" value={certificadoForm.encabezado} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'encabezado', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subencabezado</label>
                <input type="text" value={certificadoForm.subencabezado} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'subencabezado', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Formato de Fecha</label>
                <select value={certificadoForm.formatoFecha} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'formatoFecha', e.target.value)} style={inputStyle}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Color Primario</label>
                <input type="color" value={certificadoForm.colorPrimario} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'colorPrimario', e.target.value)} style={{ ...inputStyle, height: '45px' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Pie de Certificado</label>
                <textarea value={certificadoForm.pieTexto} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'pieTexto', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                  <input type="checkbox" checked={certificadoForm.incluirQR} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'incluirQR', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>Incluir código QR de verificación</span>
                </label>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                  <input type="checkbox" checked={certificadoForm.incluirCodigo} onChange={(e) => handleChange(setCertificadoForm, certificadoForm, 'incluirCodigo', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>Incluir código de verificación</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'seguridad':
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>🔒 Configuración de Seguridad</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Longitud Mínima de Contraseña</label>
                <input type="number" min="6" max="20" value={seguridadForm.longitudMinima} onChange={(e) => handleChange(setSeguridadForm, seguridadForm, 'longitudMinima', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expiración de Sesión (minutos)</label>
                <input type="number" min="5" max="120" value={seguridadForm.expiracionSesion} onChange={(e) => handleChange(setSeguridadForm, seguridadForm, 'expiracionSesion', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Intentos Fallidos Permitidos</label>
                <input type="number" min="1" max="10" value={seguridadForm.intentosFallidos} onChange={(e) => handleChange(setSeguridadForm, seguridadForm, 'intentosFallidos', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'requerirMayusculas', label: 'Requerir letras mayúsculas en contraseñas' },
                { key: 'requerirNumeros', label: 'Requerir números en contraseñas' },
                { key: 'requerirSimbolos', label: 'Requerir símbolos en contraseñas' },
                { key: 'bloqueoAutomatico', label: 'Bloqueo automático tras intentos fallidos' },
                { key: 'dobleFactor', label: 'Autenticación de doble factor (2FA)' },
                { key: 'sslObligatorio', label: 'Conexión SSL obligatoria' },
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                  <input type="checkbox" checked={seguridadForm[item.key]} onChange={(e) => handleChange(setSeguridadForm, seguridadForm, item.key, e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'respaldos':
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>💾 Configuración de Respaldos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label style={labelStyle}>Frecuencia</label>
                <select value={respaldoForm.frecuencia} onChange={(e) => handleChange(setRespaldoForm, respaldoForm, 'frecuencia', e.target.value)} style={inputStyle}>
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Hora del Respaldo</label>
                <input type="time" value={respaldoForm.hora} onChange={(e) => handleChange(setRespaldoForm, respaldoForm, 'hora', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Retención (días)</label>
                <input type="number" value={respaldoForm.retencionDias} onChange={(e) => handleChange(setRespaldoForm, respaldoForm, 'retencionDias', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              {[
                { key: 'respaldoAutomatico', label: 'Activar respaldos automáticos' },
                { key: 'incluirArchivos', label: 'Incluir archivos adjuntos en el respaldo' },
                { key: 'comprimirRespaldos', label: 'Comprimir respaldos para ahorrar espacio' },
              ].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                  <input type="checkbox" checked={respaldoForm[item.key]} onChange={(e) => handleChange(setRespaldoForm, respaldoForm, item.key, e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button onClick={handleBackup} style={{
                padding: '15px 30px', background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
              }}>
                💾 Generar Respaldo Ahora
              </button>
              <button onClick={handleRestore} style={{
                padding: '15px 30px', background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)'
              }}>
                📂 Restaurar Respaldo
              </button>
            </div>
          </div>
        );

      case 'parroquias':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>⛪ Gestión de Parroquias</h2>
              <button onClick={() => { setEditingParroquia(null); setParroquiaForm({ nombre: '', municipio: '', codigo: '', activa: true }); setShowParroquiaModal(true); }} style={{
                padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}>
                ➕ Nueva Parroquia
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Código</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Municipio</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Estado</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {parroquias.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#667eea' }}>{p.codigo}</td>
                      <td style={{ padding: '12px' }}>{p.nombre}</td>
                      <td style={{ padding: '12px', color: '#666' }}>{p.municipio}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                          background: p.activa ? '#d4edda' : '#f8d7da',
                          color: p.activa ? '#155724' : '#721c24'
                        }}>
                          {p.activa ? '✅ Activa' : '❌ Inactiva'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => { setEditingParroquia(p); setParroquiaForm(p); setShowParroquiaModal(true); }} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                          <button onClick={() => setDeleteParroquia(p)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'apariencia':
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>🎨 Configuración de Apariencia</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Tema</label>
                <select value={aparienciaForm.tema} onChange={(e) => handleChange(setAparienciaForm, aparienciaForm, 'tema', e.target.value)} style={inputStyle}>
                  <option value="claro">Claro</option>
                  <option value="oscuro">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Color Primario</label>
                <input type="color" value={aparienciaForm.colorPrimario} onChange={(e) => handleChange(setAparienciaForm, aparienciaForm, 'colorPrimario', e.target.value)} style={{ ...inputStyle, height: '45px' }} />
              </div>
              <div>
                <label style={labelStyle}>Color Secundario</label>
                <input type="color" value={aparienciaForm.colorSecundario} onChange={(e) => handleChange(setAparienciaForm, aparienciaForm, 'colorSecundario', e.target.value)} style={{ ...inputStyle, height: '45px' }} />
              </div>
            </div>
            <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                <input type="checkbox" checked={aparienciaForm.mostrarAnimaciones} onChange={(e) => handleChange(setAparienciaForm, aparienciaForm, 'mostrarAnimaciones', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <span>Mostrar animaciones y transiciones</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px' }}>
                <input type="checkbox" checked={aparienciaForm.sidebarExpandido} onChange={(e) => handleChange(setAparienciaForm, aparienciaForm, 'sidebarExpandido', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <span>Sidebar expandido por defecto</span>
              </label>
            </div>

            <div style={{ marginTop: '25px', padding: '20px', background: '#f8f9fa', borderRadius: '15px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>👁️ Vista Previa</h3>
              <div style={{ background: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `linear-gradient(135deg, ${aparienciaForm.colorPrimario} 0%, ${aparienciaForm.colorSecundario} 100%)` }}></div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Gestor Documental</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>Vista previa</div>
                  </div>
                </div>
                <button style={{ background: `linear-gradient(135deg, ${aparienciaForm.colorPrimario} 0%, ${aparienciaForm.colorSecundario} 100%)`, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Botón de ejemplo
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #FF5722 0%, #D84315 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(255, 87, 34, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>⚙️ Configuración del Sistema</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Personaliza todos los aspectos del sistema parroquial
            </p>
          </div>
          {hasChanges && (
            <button onClick={handleSave} style={{
              padding: '14px 28px', background: 'white', color: '#D84315',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              💾 Guardar Cambios
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '25px' }}>
        <div style={{ background: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', height: 'fit-content' }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%',
                padding: '14px 16px',
                marginBottom: '5px',
                background: activeSection === section.id ? 'linear-gradient(135deg, #FF5722 0%, #D84315 100%)' : 'transparent',
                color: activeSection === section.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeSection === section.id ? 'bold' : 'normal',
                textAlign: 'left',
                transition: 'all 0.3s',
                boxShadow: activeSection === section.id ? '0 4px 15px rgba(255, 87, 34, 0.3)' : 'none'
              }}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '15px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
          {renderSection()}
        </div>
      </div>

      {showParroquiaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowParroquiaModal(false)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '15px 15px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>
                {editingParroquia ? '✏️ Editar Parroquia' : '➕ Nueva Parroquia'}
              </h2>
              <button onClick={() => setShowParroquiaModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
            </div>
            <form onSubmit={handleSaveParroquia} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Nombre *</label>
                <input type="text" value={parroquiaForm.nombre} onChange={(e) => setParroquiaForm({...parroquiaForm, nombre: e.target.value})} required style={inputStyle} placeholder="Ej: San Luís Beltrán" />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Municipio *</label>
                <input type="text" value={parroquiaForm.municipio} onChange={(e) => setParroquiaForm({...parroquiaForm, municipio: e.target.value})} required style={inputStyle} placeholder="Ej: Tibú" />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>Código *</label>
                <input type="text" value={parroquiaForm.codigo} onChange={(e) => setParroquiaForm({...parroquiaForm, codigo: e.target.value})} required style={inputStyle} placeholder="Ej: TIB-01" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '15px' }}>
                <input type="checkbox" checked={parroquiaForm.activa} onChange={(e) => setParroquiaForm({...parroquiaForm, activa: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <span>Parroquia activa</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowParroquiaModal(false)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteParroquia && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteParroquia(null)}>
          <div style={{ background: 'white', borderRadius: '15px', width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
            <h3>¿Eliminar parroquia?</h3>
            <p style={{ color: '#666' }}>{deleteParroquia.nombre} - {deleteParroquia.municipio}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setDeleteParroquia(null)} style={{ padding: '10px 20px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDeleteParroquia} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;