import React, { useState } from 'react';
import api from '../../api/axiosConfig';

const SubirDocumento = () => {
  const [archivo, setArchivo] = useState(null);
  const [registroId, setRegistroId] = useState('');
  const [tipo, setTipo] = useState('acta');
  const [mensaje, setMensaje] = useState('');

  const manejarSubida = async (e) => {
    e.preventDefault();
    if (!archivo || !registroId) {
      setMensaje('Por favor complete todos los campos');
      return;
    }

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipo_documento', tipo);

    try {
      await api.post(`/documentos/?registro_id=${registroId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMensaje('Documento subido correctamente');
      setArchivo(null);
      setRegistroId('');
    } catch (error) {
      setMensaje('Error al subir el documento');
    }
  };

  return (
    <div>
      <h2>Subir documento</h2>
      <form onSubmit={manejarSubida}>
        <div style={{ marginBottom: '15px' }}>
          <label>Registro ID:</label>
          <input
            type="number"
            value={registroId}
            onChange={(e) => setRegistroId(e.target.value)}
            required
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Tipo de documento:</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="acta">Acta</option>
            <option value="certificado">Certificado</option>
            <option value="partida">Partida</option>
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Archivo:</label>
          <input
            type="file"
            onChange={(e) => setArchivo(e.target.files[0])}
            required
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}>
          Subir documento
        </button>
        {mensaje && <p>{mensaje}</p>}
      </form>
    </div>
  );
};

export default SubirDocumento;