import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL) || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api'),
  timeout: 20000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sgd-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && error.config?.headers?.Authorization) {
    window.dispatchEvent(new Event('sgd-session-expired'));
  }
  return Promise.reject(error);
});
const fieldLabels = {
  nombres: 'Nombres', apellidos: 'Apellidos', nombre: 'Nombre', email: 'Correo electrónico',
  password: 'Contraseña', actual: 'Contraseña actual', nueva: 'Nueva contraseña',
  parroquia_id: 'Parroquia', origen_id: 'Parroquia solicitante', destino_id: 'Parroquia custodiante',
  persona_id: 'Persona titular', conyuge_persona_id: 'Otra persona contrayente',
  registro_id: 'Partida sacramental', solicitud_id: 'Solicitud', sacramento_id: 'Tipo de partida',
  fecha_nacimiento: 'Fecha de nacimiento', fecha_celebracion: 'Fecha de celebración',
  fecha_defuncion: 'Fecha de defunción', numero_identificacion: 'Identificación',
  libro: 'Libro', folio: 'Folio', numero: 'Número de partida', motivo: 'Motivo',
  motivo_curia: 'Motivo de competencia de la Curia', motivo_actuacion: 'Motivo de la actuación',
  lugar: 'Lugar de celebración', ministro: 'Ministro responsable', archivo: 'Archivo PDF',
  rol: 'Rol', telefono: 'Teléfono', codigo: 'Código institucional', direccion: 'Dirección',
  municipio: 'Municipio', localidad: 'Localidad', texto: 'Texto de la nota', notas: 'Notas marginales',
};
function validationMessage(item) {
  const field = [...(item.loc || [])].reverse().find(key => fieldLabels[key]);
  const label = fieldLabels[field] || 'Datos del formulario';
  const type = item.type || '';
  const context = item.ctx || {};
  let message;
  if (type === 'missing') message = 'Este dato es obligatorio.';
  else if (type === 'string_too_short') message = `Escriba al menos ${context.min_length || 1} caracteres.`;
  else if (type === 'string_too_long') message = `Escriba como máximo ${context.max_length || ''} caracteres.`;
  else if (type.includes('int_') || type.includes('float_') || type === 'greater_than' || type === 'greater_than_equal') message = 'Seleccione una referencia o un número válido.';
  else if (type.includes('date')) message = 'Introduzca una fecha válida.';
  else if (type === 'enum' || type === 'literal_error' || type.includes('bool')) message = 'Seleccione una de las opciones disponibles.';
  else if (field === 'email') message = 'Introduzca un correo electrónico válido.';
  else message = 'Revise el dato indicado y vuelva a intentarlo.';
  return `${label}: ${message}`;
}
export function errorMessage(error) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(validationMessage).join(' ');
  if (typeof detail === 'string') return detail;
  return error.response ? 'No se pudo completar la operación.' : 'No hay conexión con el servidor. Compruebe que el sistema esté iniciado e inténtelo de nuevo.';
}
export async function downloadFile(path, filename, options = {}) {
  let response;
  try { response = await api.get(path, { responseType: 'blob', ...options }); }
  catch (error) {
    const body = error.response?.data;
    if (body?.type?.includes('json') && typeof body.text === 'function') {
      try { error.response.data = JSON.parse(await body.text()); } catch { /* Preserve the original download error. */ }
    }
    throw error;
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}
export default api;
