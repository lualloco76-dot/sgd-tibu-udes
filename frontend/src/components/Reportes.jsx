import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const Reportes = () => {
  const auth = useAuth();
  const usuario = auth?.usuario || null;
  const registrarAuditoria = auth?.registrarAuditoria || (() => {});

  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState(null);
  const [dateRange, setDateRange] = useState({ desde: '2024-01-01', hasta: '2024-12-31' });
  const [filterParroquia, setFilterParroquia] = useState('todas');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showExportModal, setShowExportModal] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const parroquias = [
    { id: 'tibu', nombre: 'San Luís Beltrán - Tibú', color: '#4FC3F7' },
    { id: 'sanfaustino', nombre: 'San Faustino', color: '#FF9800' },
    { id: 'ocana', nombre: 'Santa Ana - Ocaña', color: '#4CAF50' },
    { id: 'cucuta', nombre: 'San José - Cúcuta', color: '#E91E63' },
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Datos completos por mes y parroquia
  const datosCompletos = useMemo(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const tipos = ['Bautismos', 'Confirmaciones', 'Matrimonios', 'Defunciones'];
    
    const data = [];
    meses.forEach((mes, mesIdx) => {
      parroquias.forEach(parroquia => {
        tipos.forEach(tipo => {
          const base = {
            'Bautismos': { tibu: 5, sanfaustino: 3, ocana: 2, cucuta: 2 },
            'Confirmaciones': { tibu: 3, sanfaustino: 2, ocana: 2, cucuta: 1 },
            'Matrimonios': { tibu: 2, sanfaustino: 2, ocana: 1, cucuta: 1 },
            'Defunciones': { tibu: 1, sanfaustino: 1, ocana: 1, cucuta: 0 },
          }[tipo][parroquia.id];
          
          const variacion = Math.floor(Math.random() * 3) - 1;
          const total = Math.max(0, base + variacion);
          
          data.push({
            mes,
            mesIdx,
            parroquia: parroquia.id,
            parroquiaNombre: parroquia.nombre,
            tipo,
            total
          });
        });
      });
    });
    return data;
  }, []);

  // Filtros aplicados
  const datosFiltrados = useMemo(() => {
    return datosCompletos.filter(d => {
      const matchParroquia = filterParroquia === 'todas' || d.parroquia === filterParroquia;
      const matchTipo = filterTipo === 'todos' || d.tipo === filterTipo;
      return matchParroquia && matchTipo;
    });
  }, [datosCompletos, filterParroquia, filterTipo]);

  // Totales por tipo
  const totalesPorTipo = useMemo(() => {
    return ['Bautismos', 'Confirmaciones', 'Matrimonios', 'Defunciones'].map(tipo => ({
      tipo,
      total: datosFiltrados.filter(d => d.tipo === tipo).reduce((s, d) => s + d.total, 0)
    }));
  }, [datosFiltrados]);

  // Totales por parroquia
  const totalesPorParroquia = useMemo(() => {
    return parroquias.map(p => ({
      ...p,
      total: datosFiltrados.filter(d => d.parroquia === p.id).reduce((s, d) => s + d.total, 0)
    }));
  }, [datosFiltrados]);

  // Totales por mes
  const totalesPorMes = useMemo(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses.map(mes => ({
      mes,
      total: datosFiltrados.filter(d => d.mes === mes).reduce((s, d) => s + d.total, 0),
      bautismos: datosFiltrados.filter(d => d.mes === mes && d.tipo === 'Bautismos').reduce((s, d) => s + d.total, 0),
      confirmaciones: datosFiltrados.filter(d => d.mes === mes && d.tipo === 'Confirmaciones').reduce((s, d) => s + d.total, 0),
      matrimonios: datosFiltrados.filter(d => d.mes === mes && d.tipo === 'Matrimonios').reduce((s, d) => s + d.total, 0),
      defunciones: datosFiltrados.filter(d => d.mes === mes && d.tipo === 'Defunciones').reduce((s, d) => s + d.total, 0),
    }));
  }, [datosFiltrados]);

  const totalGeneral = totalesPorTipo.reduce((s, t) => s + t.total, 0);
  const maxTotalMes = Math.max(...totalesPorMes.map(m => m.total), 1);
  const maxTotalParroquia = Math.max(...totalesPorParroquia.map(p => p.total), 1);

  const tipoInfo = {
    'Bautismos': { icon: '💧', color: '#4FC3F7', bg: '#e3f2fd' },
    'Confirmaciones': { icon: '🔥', color: '#FF9800', bg: '#fff3e0' },
    'Matrimonios': { icon: '💑', color: '#E91E63', bg: '#fce4ec' },
    'Defunciones': { icon: '🕊️', color: '#9E9E9E', bg: '#f5f5f5' },
  };

  const handleExport = (format) => {
    registrarAuditoria('EXPORTAR', 'reportes', 0, `Exportación en formato ${format.toUpperCase()}`);
    showToast(`📥 Reporte exportado en formato ${format.toUpperCase()} correctamente`);
    setShowExportModal(false);
  };

  const tabs = [
    { id: 'general', label: '📊 Resumen General', icon: '📊' },
    { id: 'tendencias', label: '📈 Tendencias', icon: '📈' },
    { id: 'comparativo', label: '🏛️ Comparativo', icon: '🏛️' },
    { id: 'detalle', label: '📋 Detalle', icon: '📋' },
    { id: 'exportar', label: '📥 Exportar', icon: '📥' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
          borderRadius: '10px', color: 'white', fontWeight: 'bold', zIndex: 3000,
          background: toast.type === 'success' ? '#4CAF50' : '#FF9800',
          boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
          animation: 'slideInRight 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: 'white',
        marginBottom: '25px',
        boxShadow: '0 10px 30px rgba(0, 137, 123, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}></div>
        <div style={{ position: 'absolute', bottom: '-40%', left: '30%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>📈 Reportes y Estadísticas</h1>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Análisis completo del sistema documental parroquial
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '15px 20px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalGeneral}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>Total Registros</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '15px 20px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{parroquias.length}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>Parroquias</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros globales */}
      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold', color: '#333' }}>🔍 Filtros:</span>
        <select 
          value={filterParroquia} 
          onChange={(e) => setFilterParroquia(e.target.value)}
          style={{ padding: '10px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}
        >
          <option value="todas">Todas las Parroquias</option>
          {parroquias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select 
          value={filterTipo} 
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{ padding: '10px 15px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'white' }}
        >
          <option value="todos">Todos los Tipos</option>
          <option value="Bautismos">Bautismos</option>
          <option value="Confirmaciones">Confirmaciones</option>
          <option value="Matrimonios">Matrimonios</option>
          <option value="Defunciones">Defunciones</option>
        </select>
        <input 
          type="date" 
          value={dateRange.desde} 
          onChange={(e) => setDateRange({...dateRange, desde: e.target.value})}
          style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }}
        />
        <span style={{ color: '#999' }}>a</span>
        <input 
          type="date" 
          value={dateRange.hasta} 
          onChange={(e) => setDateRange({...dateRange, hasta: e.target.value})}
          style={{ padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }}
        />
        <button
          onClick={() => {
            setFilterParroquia('todas');
            setFilterTipo('todos');
            setDateRange({ desde: '2024-01-01', hasta: '2024-12-31' });
          }}
          style={{ padding: '10px 15px', background: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          🔄 Limpiar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 22px',
              borderRadius: '12px',
              border: '2px solid #e0e0e0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #00897B 0%, #00695C 100%)' : 'white',
              color: activeTab === tab.id ? 'white' : '#333',
              boxShadow: activeTab === tab.id ? '0 6px 20px rgba(0, 137, 123, 0.3)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
        
        {/* ============ TAB GENERAL ============ */}
        {activeTab === 'general' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📊 Resumen Ejecutivo</h2>
            
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              {totalesPorTipo.map(t => (
                <div key={t.tipo} style={{
                  background: tipoInfo[t.tipo].bg,
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: `2px solid ${tipoInfo[t.tipo].color}30`
                }}>
                  <div style={{ fontSize: '35px', marginBottom: '10px' }}>{tipoInfo[t.tipo].icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: tipoInfo[t.tipo].color }}>{t.total}</div>
                  <div style={{ fontSize: '13px', color: '#555', marginTop: '5px' }}>{t.tipo}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    {totalGeneral > 0 ? Math.round((t.total / totalGeneral) * 100) : 0}% del total
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfico de barras apiladas */}
            <div style={{ background: '#f8f9fa', borderRadius: '15px', padding: '25px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#2c3e50' }}>📈 Registros Mensuales por Tipo</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '250px', padding: '10px', overflowX: 'auto' }}>
                {totalesPorMes.map(mes => (
                  <div 
                    key={mes.mes} 
                    style={{ flex: '1 0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredBar(mes.mes)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => setSelectedMonth(mes)}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: hoveredBar === mes.mes ? '#00897B' : '#666' }}>
                      {mes.total}
                    </span>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '180px' }}>
                      <div style={{ width: '8px', height: `${(mes.bautismos / maxTotalMes) * 180}px`, background: '#4FC3F7', borderRadius: '3px 3px 0 0', transition: 'all 0.3s' }} title={`Bautismos: ${mes.bautismos}`}></div>
                      <div style={{ width: '8px', height: `${(mes.confirmaciones / maxTotalMes) * 180}px`, background: '#FF9800', borderRadius: '3px 3px 0 0', transition: 'all 0.3s' }} title={`Confirmaciones: ${mes.confirmaciones}`}></div>
                      <div style={{ width: '8px', height: `${(mes.matrimonios / maxTotalMes) * 180}px`, background: '#E91E63', borderRadius: '3px 3px 0 0', transition: 'all 0.3s' }} title={`Matrimonios: ${mes.matrimonios}`}></div>
                      <div style={{ width: '8px', height: `${(mes.defunciones / maxTotalMes) * 180}px`, background: '#9E9E9E', borderRadius: '3px 3px 0 0', transition: 'all 0.3s' }} title={`Defunciones: ${mes.defunciones}`}></div>
                    </div>
                    <span style={{ fontSize: '9px', color: '#999' }}>{mes.mes.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
                {['Bautismos', 'Confirmaciones', 'Matrimonios', 'Defunciones'].map(tipo => (
                  <span key={tipo} style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: tipoInfo[tipo].color, display: 'inline-block' }}></span>
                    {tipoInfo[tipo].icon} {tipo}
                  </span>
                ))}
              </div>
            </div>

            {/* Detalle del mes seleccionado */}
            {selectedMonth && (
              <div style={{ marginTop: '20px', background: '#e0f2f1', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#00695C' }}>
                  📅 Detalle de {selectedMonth.mes}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px' }}>💧</div>
                    <strong>{selectedMonth.bautismos}</strong>
                    <div style={{ fontSize: '11px', color: '#999' }}>Bautismos</div>
                  </div>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px' }}>🔥</div>
                    <strong>{selectedMonth.confirmaciones}</strong>
                    <div style={{ fontSize: '11px', color: '#999' }}>Confirmaciones</div>
                  </div>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px' }}>💑</div>
                    <strong>{selectedMonth.matrimonios}</strong>
                    <div style={{ fontSize: '11px', color: '#999' }}>Matrimonios</div>
                  </div>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px' }}>🕊️</div>
                    <strong>{selectedMonth.defunciones}</strong>
                    <div style={{ fontSize: '11px', color: '#999' }}>Defunciones</div>
                  </div>
                </div>
                <button onClick={() => setSelectedMonth(null)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#00695C', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  ✕ Cerrar detalle
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============ TAB TENDENCIAS ============ */}
        {activeTab === 'tendencias' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📈 Tendencias por Tipo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
              {totalesPorTipo.map(t => {
                const datosMes = totalesPorMes.map(m => ({ mes: m.mes, total: m[t.tipo.toLowerCase()] || 0 }));
                const maxVal = Math.max(...datosMes.map(d => d.total), 1);
                return (
                  <div key={t.tipo} style={{ background: '#f8f9fa', borderRadius: '15px', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: tipoInfo[t.tipo].color }}>
                      {tipoInfo[t.tipo].icon} {t.tipo} por Mes
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '150px' }}>
                      {datosMes.map(d => (
                        <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#666' }}>{d.total}</span>
                          <div style={{
                            width: '100%', maxWidth: '25px',
                            height: `${(d.total / maxVal) * 120}px`,
                            background: tipoInfo[t.tipo].color,
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.5s ease'
                          }}></div>
                          <span style={{ fontSize: '8px', color: '#999' }}>{d.mes.slice(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                      Total: <strong>{t.total}</strong> | Promedio mensual: <strong>{(t.total / 12).toFixed(1)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ TAB COMPARATIVO ============ */}
        {activeTab === 'comparativo' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>🏛️ Comparativo por Parroquia</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {totalesPorParroquia.map(p => (
                <div key={p.id} style={{ background: '#f8f9fa', borderRadius: '15px', padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>
                      <span style={{ color: p.color }}>●</span> {p.nombre}
                    </h3>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: p.color }}>{p.total} registros</span>
                  </div>
                  <div style={{ height: '14px', background: '#e0e0e0', borderRadius: '7px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(p.total / maxTotalParroquia) * 100}%`,
                      background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}80 100%)`,
                      borderRadius: '7px',
                      transition: 'width 1s ease'
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '15px', flexWrap: 'wrap' }}>
                    {totalesPorTipo.map(t => {
                      const valorParroquia = datosFiltrados.filter(d => d.parroquia === p.id && d.tipo === t.tipo).reduce((s, d) => s + d.total, 0);
                      return (
                        <span key={t.tipo} style={{ fontSize: '12px', color: '#666' }}>
                          {tipoInfo[t.tipo].icon} {t.tipo}: <strong>{valorParroquia}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ TAB DETALLE ============ */}
        {activeTab === 'detalle' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📋 Tabla de Detalle</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#00897B', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Mes</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Parroquia</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>💧 Bautismos</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>🔥 Confirmaciones</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>💑 Matrimonios</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>🕊️ Defunciones</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {totalesPorMes.map(mes => (
                    <tr key={mes.mes} style={{ borderBottom: '1px solid #f0f0f0', background: 'white' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#333' }}>{mes.mes}</td>
                      <td style={{ padding: '10px', color: '#666' }}>
                        {filterParroquia === 'todas' ? 'Todas' : parroquias.find(p => p.id === filterParroquia)?.nombre}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#4FC3F7', fontWeight: 'bold' }}>{mes.bautismos}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#FF9800', fontWeight: 'bold' }}>{mes.confirmaciones}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#E91E63', fontWeight: 'bold' }}>{mes.matrimonios}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#9E9E9E', fontWeight: 'bold' }}>{mes.defunciones}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00897B' }}>{mes.total}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#e0f2f1', fontWeight: 'bold' }}>
                    <td style={{ padding: '12px' }} colSpan="2">TOTAL GENERAL</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#4FC3F7' }}>{totalesPorTipo[0].total}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#FF9800' }}>{totalesPorTipo[1].total}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#E91E63' }}>{totalesPorTipo[2].total}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#9E9E9E' }}>{totalesPorTipo[3].total}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#00897B' }}>{totalGeneral}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ TAB EXPORTAR ============ */}
        {activeTab === 'exportar' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' }}>📥 Exportar Reportes</h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>
              Seleccione el formato de exportación para generar el reporte con los filtros actuales.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <button onClick={() => handleExport('pdf')} style={exportBtn('#f44336')}>
                <div style={{ fontSize: '45px', marginBottom: '15px' }}>📕</div>
                <strong>PDF</strong>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>Documento portable</div>
              </button>
              <button onClick={() => handleExport('excel')} style={exportBtn('#4CAF50')}>
                <div style={{ fontSize: '45px', marginBottom: '15px' }}>📗</div>
                <strong>Excel</strong>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>Hoja de cálculo</div>
              </button>
              <button onClick={() => handleExport('csv')} style={exportBtn('#2196F3')}>
                <div style={{ fontSize: '45px', marginBottom: '15px' }}>📘</div>
                <strong>CSV</strong>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>Valores separados</div>
              </button>
              <button onClick={() => handleExport('json')} style={exportBtn('#FF9800')}>
                <div style={{ fontSize: '45px', marginBottom: '15px' }}>📙</div>
                <strong>JSON</strong>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>Datos estructurados</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const exportBtn = (color) => ({
  background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
  color: 'white',
  border: 'none',
  borderRadius: '15px',
  padding: '25px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 'bold',
  boxShadow: `0 8px 25px ${color}40`,
  transition: 'all 0.3s',
  textAlign: 'center'
});

export default Reportes;