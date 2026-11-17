import React, { useState } from 'react';

const Respaldos = () => {
  const [toast, setToast] = useState(null);
  const [autoBackup, setAutoBackup] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estado inicial de los respaldos (idéntico a la imagen)
  const [respaldos, setRespaldos] = useState([
    { id: 1, fecha: '2024-10-12 02:00 a.m.', tipo: 'Automático', tamano: '245 MB', responsable: 'Administrador General', estado: 'Completado' },
    { id: 2, fecha: '2024-10-05 02:00 a.m.', tipo: 'Automático', tamano: '242 MB', responsable: 'Administrador General', estado: 'Completado' },
    { id: 3, fecha: '2024-09-28 02:00 a.m.', tipo: 'Automático', tamano: '238 MB', responsable: 'Administrador General', estado: 'Completado' },
    { id: 4, fecha: '2024-09-20 10:15 a.m.', tipo: 'Manual', tamano: '251 MB', responsable: 'Administrador General', estado: 'Completado' },
    { id: 5, fecha: '2024-09-12 02:00 a.m.', tipo: 'Automático', tamano: '236 MB', responsable: 'Administrador General', estado: 'Completado' },
  ]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCrearRespaldo = () => {
    setIsCreating(true);
    showToast('⏳ Generando respaldo completo del sistema...', 'warning');
    
    // Simular tiempo de creación
    setTimeout(() => {
      const nuevoRespaldo = {
        id: respaldos.length + 1,
        fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
        tipo: 'Manual',
        tamano: `${Math.floor(Math.random() * (260 - 240 + 1) + 240)} MB`, // Tamaño aleatorio entre 240 y 260
        responsable: 'Administrador General',
        estado: 'Completado'
      };
      
      setRespaldos([nuevoRespaldo, ...respaldos]);
      setIsCreating(false);
      showToast('✅ Respaldo completado y guardado exitosamente');
    }, 2000);
  };

  const handleDescargar = (respaldo) => {
    showToast(`⬇️ Descargando respaldo del ${respaldo.fecha}...`);
  };

  const handleRestaurar = (respaldo) => {
    if(window.confirm(`⚠️ ¿Está seguro que desea restaurar el respaldo del ${respaldo.fecha}? Los datos actuales serán reemplazados.`)) {
      showToast('🔄 Restaurando datos del sistema...', 'warning');
      setTimeout(() => {
        showToast('✅ Sistema restaurado correctamente');
      }, 2000);
    }
  };

  const handleEliminar = (id) => {
    if(window.confirm('⚠️ ¿Está seguro de eliminar este archivo de respaldo? Esta acción no se puede deshacer.')) {
      setRespaldos(respaldos.filter(r => r.id !== id));
      showToast('🗑️ Respaldo eliminado', 'warning');
    }
  };

  const toggleAutoBackup = () => {
    setAutoBackup(!autoBackup);
    showToast(autoBackup ? '🔕 Respaldos automáticos desactivados' : '🔔 Respaldos automáticos activados');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '8px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : toast.type === 'warning' ? '#FF9800' : '#2196F3',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      {/* HEADER MORADO (Idéntico a la imagen) */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        padding: '25px 30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
      }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔄 Respaldos del Sistema
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          Protección y recuperación de la información parroquial
        </p>
      </div>

      {/* 3 TARJETAS SUPERIORES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        
        {/* Tarjeta 1: Crear Respaldo */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>Crear respaldo ahora</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#666' }}>Genera un respaldo completo del sistema</p>
          <button 
            onClick={handleCrearRespaldo} 
            disabled={isCreating}
            style={{ 
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: isCreating ? 'not-allowed' : 'pointer',
              background: isCreating ? '#90CAF9' : '#2196F3', color: 'white', transition: 'all 0.3s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}
          >
            {isCreating ? '⏳ Creando...' : '▶ Crear Respaldo'}
          </button>
        </div>

        {/* Tarjeta 2: Programar Respaldo */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>Programar respaldo</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#666' }}>Configura la frecuencia de los respaldos</p>
          <button 
            onClick={() => showToast('⚙️ Módulo de configuración de frecuencia en desarrollo')}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', background: 'white', color: '#333', transition: 'all 0.3s' }}
          >
            ⚙️ Configurar Programación
          </button>
        </div>

        {/* Tarjeta 3: Respaldos Automáticos */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Respaldos automáticos</h3>
              {/* Toggle Switch */}
              <div 
                onClick={toggleAutoBackup}
                style={{ 
                  width: '45px', height: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s',
                  background: autoBackup ? '#4CAF50' : '#ccc', position: 'relative' 
                }}
              >
                <div style={{ 
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', 
                  left: autoBackup ? '23px' : '2px', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' 
                }}></div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Realizar respaldos diarios del sistema</p>
          </div>
          <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px', marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <div style={{ fontSize: '11px', color: '#1976D2', lineHeight: '1.4' }}>
              Se realizará un respaldo automático todos los días a las 02:00 a.m.
            </div>
          </div>
        </div>
      </div>

      {/* MENSAJE DE SEGURIDAD */}
      <div style={{ background: '#e8f5e9', borderLeft: '4px solid #4CAF50', borderRadius: '8px', padding: '15px 20px', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ background: '#4CAF50', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
          🛡️
        </div>
        <div>
          <h4 style={{ margin: '0 0 5px 0', color: '#2e7d32', fontSize: '14px' }}>Seguridad de la información</h4>
          <p style={{ margin: 0, color: '#388e3c', fontSize: '12px' }}>
            Los respaldos incluyen todos los documentos sacramentales, configuraciones y datos del sistema. Se almacenan de forma segura y pueden ser utilizados para restaurar el sistema en caso de cualquier incidencia.
          </p>
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Historial de respaldos
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0', color: '#666', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px', fontWeight: 'normal' }}>Fecha</th>
                <th style={{ padding: '12px 10px', fontWeight: 'normal' }}>Tipo</th>
                <th style={{ padding: '12px 10px', fontWeight: 'normal' }}>Tamaño</th>
                <th style={{ padding: '12px 10px', fontWeight: 'normal' }}>Responsable</th>
                <th style={{ padding: '12px 10px', fontWeight: 'normal' }}>Estado</th>
                <th style={{ padding: '12px 10px', fontWeight: 'normal', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {respaldos.map((respaldo) => (
                <tr key={respaldo.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }}>
                  <td style={{ padding: '15px 10px', color: '#333', fontWeight: 'bold' }}>
                    {respaldo.fecha}
                  </td>
                  <td style={{ padding: '15px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {respaldo.tipo === 'Automático' ? (
                        <span style={{ fontSize: '16px' }}>☁️</span>
                      ) : (
                        <span style={{ fontSize: '16px' }}>💾</span>
                      )}
                      <span style={{ color: '#555' }}>{respaldo.tipo}</span>
                    </div>
                  </td>
                  <td style={{ padding: '15px 10px', color: '#555' }}>{respaldo.tamano}</td>
                  <td style={{ padding: '15px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '25px', height: '25px', borderRadius: '50%', background: '#667eea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        {respaldo.responsable.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ color: '#555' }}>{respaldo.responsable}</span>
                    </div>
                  </td>
                  <td style={{ padding: '15px 10px' }}>
                    <span style={{ padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', background: '#e8f5e9', color: '#2e7d32', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✓ {respaldo.estado}
                    </span>
                  </td>
                  <td style={{ padding: '15px 10px' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => showToast(`👁️ Ver detalle del respaldo: ${respaldo.tamano}`)} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        👁️ Ver detalle
                      </button>
                      <button onClick={() => handleDescargar(respaldo)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        ⬇️ Descargar
                      </button>
                      <button onClick={() => handleRestaurar(respaldo)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        🔄 Restaurar
                      </button>
                      <button onClick={() => handleEliminar(respaldo.id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Respaldos;