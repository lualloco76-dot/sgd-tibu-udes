import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth, permissionsFor } from '../context/AuthContext';
import Dashboard from './Dashboard';
import { CertificadosPage, ConfiguracionPage, ParroquiasPage, SolicitudesPage, UsuariosPage, Verificacion } from './ConnectedPages';
import Login from './Login';
import { downloadFile } from '../api/axiosConfig';
import ConnectedRecords from './ConnectedRecords';

vi.mock('../context/AuthContext', async (importOriginal) => ({ ...await importOriginal(), useAuth: vi.fn() }));
vi.mock('../api/axiosConfig', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  errorMessage: (error) => error.message,
  downloadFile: vi.fn(),
}));

let container, root;
const user = { id: 1, nombre: 'Cuenta sintética', rol: 'administrador', parroquia_id: 1 };
const parishes = [{ id: 1, nombre: 'Parroquia prueba A', codigo: 'TEST_A', activa: true }, { id: 2, nombre: 'Parroquia prueba B', codigo: 'TEST_B', activa: true }];
const record = { id: 10, persona_id: 3, sacramento_id: 1, parroquia_id: 1, fecha_celebracion: '2020-01-01', libro: '1', folio: '2', numero: '3', datos: {}, persona: { nombres: 'Persona', apellidos: 'Sintética' } };
const buttons = (text) => [...container.querySelectorAll('button')].filter((item) => item.textContent === text);
const input = (name) => container.querySelector(`[name="${name}"]`);
async function render(element, path = '/') {
  await act(async () => { root.render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{element}</MemoryRouter>); });
}
async function click(button) { await act(async () => button.click()); }
async function change(name, value) {
  const element = input(name);
  await act(async () => {
    const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit(form) { await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function respondWithRecords(records) {
  const previous = api.get.getMockImplementation();
  api.get.mockImplementation((path, ...args) => path === '/registros/' ? Promise.resolve({ data: records }) : previous(path, ...args));
}

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  vi.clearAllMocks();
  useAuth.mockReturnValue({ usuario: user, ...permissionsFor(user), logout: vi.fn() });
  api.get.mockImplementation(async (path) => ({ data: path === '/parroquias/' ? parishes : path === '/sacramentos/' ? [{ id: 1, nombre: 'Bautismo' }] : path === '/personas/' ? [{ id: 3, nombres: 'Persona', apellidos: 'Sintética', parroquia_id: 1 }] : path === '/registros/' ? [record] : [] }));
  api.post.mockResolvedValue({ data: {} }); api.patch.mockResolvedValue({ data: {} });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('las rutas directas respetan roles y el menú no muestra administración a consulta', async () => {
  useAuth.mockReturnValue({ usuario: { ...user, rol: 'consulta' }, canWrite: false, canManage: false });
  await render(<Dashboard />, '/usuarios');
  expect(container.textContent).toContain('Acceso restringido');
  expect(container.querySelector('a[href="/usuarios"]')).toBeNull();
  expect(api.get).not.toHaveBeenCalled();
});

test('navegación a bautismos carga registros reales y conserva ruta', async () => {
  await render(<Dashboard />, '/bautismos');
  expect(container.textContent).toContain('Persona Sintética');
  expect(api.get).toHaveBeenCalledWith('/registros/', expect.objectContaining({ params: expect.objectContaining({ sacramento_id: 1 }) }));
  expect(container.querySelector('a[href="/bautismos"]').getAttribute('aria-current')).toBe('page');
});

test('alta y edición de parroquias usan campos compatibles con cada endpoint', async () => {
  await render(<ParroquiasPage />); await click(buttons('Agregar')[0]);
  await change('nombre', 'Parroquia sintética'); await change('codigo', 'PRUEBA');
  await submit(container.querySelector('form'));
  expect(api.post).toHaveBeenCalledWith('/parroquias/', { nombre: 'Parroquia sintética', codigo: 'PRUEBA', municipio: null, localidad: null, direccion: null, tipo: 'parroquia' });
  await click(buttons('Editar')[0]); expect(input('codigo')).toBeNull();
  await change('activa', 'false'); await submit(container.querySelector('form'));
  expect(api.patch).toHaveBeenCalledWith('/parroquias/1', { nombre: parishes[0].nombre, activa: false, municipio: null, localidad: null, direccion: null, tipo: 'parroquia' });
});

test('edición de usuario no envía correo ni contraseña al PATCH', async () => {
  api.get.mockImplementation(async (path) => ({ data: path === '/usuarios/' ? [{ ...user, email: 'sintetico@example.test', activo: true }] : path === '/parroquias/' ? parishes : [] }));
  await render(<UsuariosPage />); await click(buttons('Editar')[0]);
  expect(input('email')).toBeNull(); expect(input('password')).toBeNull();
  await submit(container.querySelector('form'));
  expect(api.patch).toHaveBeenCalledWith('/usuarios/1', { nombre: user.nombre, rol: 'administrador', parroquia_id: 1, activo: true });
});

test('corregir una partida exige y transmite el motivo con el asiento', async () => {
  await render(<ConnectedRecords tipo="Bautismo" />); await click(buttons('Corregir / nota')[0]);
  expect(input('motivo').required).toBe(true);
  await change('motivo', 'Corrección de referencia sintética'); await submit(container.querySelector('form'));
  expect(api.patch).toHaveBeenCalledWith('/registros/10', expect.objectContaining({ motivo: 'Corrección de referencia sintética', persona_id: 3, sacramento_id: 1, libro: '1' }));
});

test('secretaría custodiante añade una nota con texto y motivo sin reemplazar el asiento', async () => {
  useAuth.mockReturnValue({ usuario: { ...user, rol: 'secretario_parroquial' }, ...permissionsFor({ rol: 'secretario_parroquial' }) });
  await render(<ConnectedRecords tipo="Bautismo" />); await click(buttons('Agregar nota marginal')[0]);
  expect(input('texto').required).toBe(true); expect(input('motivo').required).toBe(true);
  await change('texto', 'Nota marginal sintética'); await change('motivo', 'Anotación institucional de prueba');
  await submit(container.querySelector('#record-action-form'));
  expect(api.post).toHaveBeenCalledWith('/registros/10/notas', { texto: 'Nota marginal sintética', motivo: 'Anotación institucional de prueba' });
  expect(api.patch).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Nota marginal incorporada.');
  expect(container.querySelector('#record-action-form')).toBeNull();
});

test('un error al guardar nota conserva el formulario y comunica el rechazo', async () => {
  api.post.mockRejectedValue(new Error('La nota excede el límite del asiento'));
  await render(<ConnectedRecords tipo="Bautismo" />); await click(buttons('Agregar nota marginal')[0]);
  await change('texto', 'Texto sintético'); await change('motivo', 'Motivo sintético');
  await submit(container.querySelector('#record-action-form'));
  expect(container.querySelector('[role="alert"]').textContent).toContain('excede el límite');
  expect(input('texto').value).toBe('Texto sintético');
  expect(container.textContent).not.toContain('Nota marginal incorporada.');
});

test('administrador asigna custodia solo a un asiento histórico sin parroquia', async () => {
  respondWithRecords([record, { ...record, id: 11, parroquia_id: null }]);
  await render(<ConnectedRecords tipo="Bautismo" />);
  expect(buttons('Asignar custodia histórica')).toHaveLength(1);
  expect(buttons('Corregir / nota')).toHaveLength(1);
  await click(buttons('Asignar custodia histórica')[0]);
  expect(input('parroquia_id').required).toBe(true); expect(input('motivo').required).toBe(true);
  await change('parroquia_id', '2'); await change('motivo', 'Referencia archivística confirmada');
  await submit(container.querySelector('#record-action-form'));
  expect(api.post).toHaveBeenCalledWith('/registros/11/custodia', { parroquia_id: 2, motivo: 'Referencia archivística confirmada' });
  expect(container.textContent).toContain('Custodia histórica asignada');
});

test('secretaría no recibe acción para asignar custodia histórica', async () => {
  useAuth.mockReturnValue({ usuario: { ...user, rol: 'secretario_parroquial' }, ...permissionsFor({ rol: 'secretario_parroquial' }) });
  respondWithRecords([{ ...record, parroquia_id: null }]);
  await render(<ConnectedRecords tipo="Bautismo" />);
  expect(buttons('Asignar custodia histórica')).toHaveLength(0);
  expect(buttons('Agregar nota marginal')).toHaveLength(0);
});

test.each([
  ['consulta', false, 1],
  ['secretario_parroquial', true, 2],
])('rol %s no puede añadir nota fuera de sus permisos de escritura y custodia', async (rol, canWrite, parroquia_id) => {
  useAuth.mockReturnValue({ usuario: { ...user, rol, parroquia_id }, canWrite, canManage: false });
  await render(<ConnectedRecords tipo="Bautismo" />);
  expect(buttons('Agregar nota marginal')).toHaveLength(0);
  expect(buttons('Corregir / nota')).toHaveLength(0);
  expect(api.post).not.toHaveBeenCalled();
});

test('solicitudes buscan referencia exacta y el origen no puede emitir', async () => {
  api.get.mockImplementation(async (path) => ({ data: path === '/parroquias/' ? parishes : path === '/solicitudes/' ? [{ id: 7, registro_id: 10, origen_id: 1, destino_id: 2, estado: 'aprobada' }] : [] }));
  useAuth.mockReturnValue({ usuario: { ...user, rol: 'secretario_parroquial' }, ...permissionsFor({ rol: 'secretario_parroquial' }) });
  await render(<SolicitudesPage />);
  await change('parroquia_id', '2'); await change('libro', 'L1'); await change('folio', 'F2'); await change('numero', 'N3');
  await submit(container.querySelector('form'));
  expect(api.get).toHaveBeenCalledWith('/registros/buscar', { params: { parroquia_id: '2', libro: 'L1', folio: 'F2', numero: 'N3' } });
  expect(buttons('Preparar certificado')).toHaveLength(0);
  expect(container.textContent).toContain('Consultar entrega');
});

test('verificación pública muestra respuesta mínima y ningún formulario de sesión', async () => {
  api.get.mockResolvedValue({ data: { valido: true, numero: 'SGD-TEST', fecha_emision: '2026-01-01', parroquia: 'Parroquia sintética' } });
  await render(<Verificacion />);
  expect(container.textContent).toContain('Certificado registrado y válido.');
  expect(container.textContent).toContain('SGD-TEST');
  expect(container.querySelector('input')).toBeNull();
});

const certificate = { id: 21, numero: 'SGD-SINTETICO', registro_id: 10, parroquia_id: 1, estado: 'preparado', requiere_aprobacion_curia: false, codigo_verificacion: 'codigo-sintetico' };
function asRole(rol, parroquia_id = 1) {
  useAuth.mockReturnValue({ usuario: { ...user, rol, parroquia_id }, ...permissionsFor({ rol }), logout: vi.fn() });
}
function withCertificates(rows) {
  const previous = api.get.getMockImplementation();
  api.get.mockImplementation((path, ...args) => path === '/certificados/' ? Promise.resolve({ data: rows }) : previous(path, ...args));
}

test.each([
  ['administrador', 'preparado', false, []],
  ['secretario_parroquial', 'preparado', false, []],
  ['secretario_general', 'autorizado', true, []],
  ['consulta', 'firmado', false, ['Descargar PDF']],
  ['auditor', 'preparado', false, []],
  ['parroco', 'preparado', false, ['Autorizar', 'Anular']],
  ['parroco', 'autorizado', false, ['Firmar', 'Anular']],
  ['parroco', 'autorizado', true, ['Anular']],
  ['canciller', 'autorizado', true, ['Aprobar en Curia', 'Anular']],
  ['canciller', 'aprobado_curia', true, ['Firmar', 'Anular']],
  ['canciller', 'autorizado', false, ['Anular']],
  ['parroco', 'anulado', false, []],
])('certificados: %s en %s (Curia %s) dispone solo de las acciones permitidas', async (rol, estado, requiere_aprobacion_curia, allowed) => {
  asRole(rol); withCertificates([{ ...certificate, estado, requiere_aprobacion_curia }]);
  await render(<CertificadosPage />);
  for (const label of ['Autorizar', 'Aprobar en Curia', 'Firmar', 'Anular', 'Descargar PDF']) {
    expect(buttons(label).length, label).toBe(allowed.includes(label) ? 1 : 0);
  }
  expect(api.post).not.toHaveBeenCalled();
});

test('el párroco solicitante no autoriza ni anula certificados de otra custodia', async () => {
  asRole('parroco', 2); withCertificates([certificate]); await render(<CertificadosPage />);
  expect(buttons('Autorizar')).toHaveLength(0); expect(buttons('Anular')).toHaveLength(0);
});

test.each([
  ['parroco', 'preparado', false, 'Autorizar', 'autorizar'],
  ['canciller', 'autorizado', true, 'Aprobar en Curia', 'aprobar-curia'],
  ['parroco', 'autorizado', false, 'Firmar', 'firmar'],
  ['canciller', 'firmado', true, 'Anular', 'anular'],
])('actuación %s/%s conecta %s/%s a %s con motivo', async (rol, estado, requiere_aprobacion_curia, label, endpoint) => {
  asRole(rol); withCertificates([{ ...certificate, estado, requiere_aprobacion_curia }]);
  await render(<CertificadosPage />); await click(buttons(label)[0]);
  await change('motivo_actuacion', 'Referencia institucional revisada'); await submit(container.querySelector('#certificate-action-form'));
  expect(api.post).toHaveBeenCalledWith(`/certificados/21/${endpoint}`, { motivo: 'Referencia institucional revisada' });
  expect(container.querySelector('#certificate-action-form')).toBeNull();
});

test('preparar con competencia de Curia envía motivo y no intenta descargar', async () => {
  asRole('secretario_general', null); withCertificates([]);
  api.post.mockResolvedValue({ data: certificate }); await render(<CertificadosPage />);
  await change('registro_id', '10'); await click(input('requiere_aprobacion_curia'));
  expect(input('motivo_curia').required).toBe(true); await change('motivo_curia', 'Trámite diocesano');
  await submit(container.querySelector('form'));
  expect(api.post).toHaveBeenCalledWith('/certificados/', { registro_id: 10, requiere_aprobacion_curia: true, motivo_curia: 'Trámite diocesano' });
  expect(downloadFile).not.toHaveBeenCalled(); expect(container.textContent).toContain('preparado');
});

test('un conflicto de certificado conserva el motivo y muestra el error', async () => {
  asRole('parroco'); withCertificates([certificate]); api.post.mockRejectedValue(new Error('El certificado cambió de estado'));
  await render(<CertificadosPage />); await click(buttons('Autorizar')[0]); await change('motivo_actuacion', 'Motivo de prueba');
  await submit(container.querySelector('#certificate-action-form'));
  expect(container.querySelector('[role="alert"]').textContent).toContain('cambió de estado'); expect(input('motivo_actuacion').value).toBe('Motivo de prueba');
});

test('solo un certificado firmado permite descargar el PDF autenticado', async () => {
  asRole('consulta'); withCertificates([{ ...certificate, estado: 'firmado' }, { ...certificate, id: 22, estado: 'anulado' }]);
  await render(<CertificadosPage />); expect(buttons('Descargar PDF')).toHaveLength(1); await click(buttons('Descargar PDF')[0]);
  expect(downloadFile).toHaveBeenCalledWith('/certificados/21/pdf', 'SGD-SINTETICO.pdf');
});

test('administrador puede asignar los siete roles; párroco solo dos', async () => {
  await render(<UsuariosPage />); await click(buttons('Agregar')[0]);
  expect([...input('rol').options].map((o) => o.value).filter(Boolean)).toHaveLength(7);
  asRole('parroco'); await render(<UsuariosPage key="parroco" />); await click(buttons('Agregar')[0]);
  expect([...input('rol').options].map((o) => o.value).filter(Boolean)).toEqual(['secretario_parroquial', 'consulta']);
});

test('solicitud aprobada prepara certificado sin descargar antes de firma', async () => {
  asRole('secretario_parroquial'); api.get.mockImplementation(async (path) => ({ data: path === '/solicitudes/' ? [{ id: 7, registro_id: 10, origen_id: 2, destino_id: 1, estado: 'aprobada' }] : [] }));
  api.post.mockResolvedValue({ data: certificate }); await render(<SolicitudesPage />); await click(buttons('Preparar certificado')[0]);
  expect(api.post).toHaveBeenCalledWith('/certificados/', { registro_id: 10, solicitud_id: 7 }); expect(downloadFile).not.toHaveBeenCalled();
  expect(container.querySelector('a[href="/certificados?certificado=21"]')).not.toBeNull();
  expect(buttons('Preparar certificado')).toHaveLength(0);
});

test('error al preparar desde solicitudes no muestra éxito ni un enlace falso', async () => {
  asRole('secretario_parroquial');
  api.get.mockImplementation(async path=>({data:path==='/solicitudes/'?[{id:7,registro_id:10,origen_id:2,destino_id:1,estado:'aprobada'}]:[]}));
  api.post.mockRejectedValue(new Error('Complete fecha, libro, folio y número antes de emitir'));
  await render(<SolicitudesPage />);await click(buttons('Preparar certificado')[0]);
  expect(container.querySelector('[role=alert]').textContent).toContain('Complete fecha');
  expect(container.querySelector('a[href="/certificados?certificado=21"]')).toBeNull();
  expect(container.querySelector('.notice.success')).toBeNull();
});

test('coordinación diocesana envía origen explícito en la solicitud', async () => {
  asRole('secretario_general', null);
  api.get.mockImplementation(async (path) => ({ data: path === '/parroquias/' ? parishes : path === '/registros/buscar' ? [{ ...record, parroquia_id: 2 }] : [] }));
  await render(<SolicitudesPage />); await change('origen_id', '1'); await change('parroquia_id', '2');
  await change('libro', '1'); await change('folio', '2'); await change('numero', '3'); await submit(container.querySelector('form'));
  await change('registro_id', '10'); await change('motivo', 'Coordinación diocesana de prueba'); await submit(container.querySelectorAll('form')[1]);
  expect(api.post).toHaveBeenCalledWith('/solicitudes/', { registro_id: 10, origen_id: 1, motivo: 'Coordinación diocesana de prueba' });
});

test.each([
  ['/', 'Bienvenido'], ['/usuarios', 'Administración de usuarios'], ['/roles', 'Roles y permisos'], ['/parroquias', 'Parroquias'], ['/libros', 'Libros sacramentales'], ['/bautismos', 'Partidas de bautismo'], ['/confirmaciones', 'Partidas de confirmación'], ['/matrimonios', 'Partidas de matrimonio'], ['/defunciones', 'Partidas de defunción'], ['/registros', 'Consulta de partidas'], ['/solicitudes', 'Solicitudes entre parroquias'], ['/certificados', 'Certificados'], ['/auditoria', 'Auditoría'], ['/configuracion', 'Configuración'], ['/documentos', 'Gestión documental'], ['/reportes', 'Reportes administrativos'],
])('la ruta %s renderiza la pantalla conectada %s sin errores', async (path, title) => {
  const previous = api.get.getMockImplementation();
  api.get.mockImplementation((endpoint, ...args) => endpoint === '/roles/' ? Promise.resolve({ data: { roles: [], permisos: [] } }) : endpoint === '/reportes' ? Promise.resolve({ data: { registros: 0, por_sacramento: {} } }) : endpoint === '/sacramentos/' ? Promise.resolve({ data: ['Bautismo','Confirmación','Matrimonio','Defunción'].map((nombre, i) => ({ id: i + 1, nombre })) }) : previous(endpoint, ...args));
  await render(<Dashboard />, path); expect(container.textContent).toContain(title); expect(container.querySelector('[role="alert"]')).toBeNull();
});

test.each(['parroco', 'canciller'])('aprobaciones está disponible al %s', async (rol) => {
  asRole(rol); await render(<Dashboard />, '/aprobaciones'); expect(container.textContent).toContain('Aprobaciones y firma');
});

test('auditor entra a auditoría y ve el menú, sin acciones de escritura', async () => {
  asRole('auditor', null); await render(<Dashboard />, '/auditoria');
  expect(container.querySelector('a[href="/auditoria"]')).not.toBeNull(); expect(api.get).toHaveBeenCalledWith('/auditoria/', expect.anything());
  expect(container.textContent).not.toContain('No tiene permiso');
});

test('fallo de conexión retira resultados y presenta el error de carga', async () => {
  api.get.mockRejectedValue(new Error('Conexión de prueba no disponible')); await render(<ConnectedRecords />);
  expect(container.textContent).toContain('Conexión de prueba no disponible'); expect(container.querySelector('tbody')).toBeNull();
});

test('inicio de sesión exige campos y muestra el rechazo del servidor', async () => {
  const login = vi.fn().mockResolvedValue({ success: false, error: 'Acceso rechazado por el servidor' });
  useAuth.mockReturnValue({ usuario: null, loading: false, login }); await render(<Login />);
  expect(container.querySelector('input[type="email"]').required).toBe(true); expect(container.querySelector('input[type="password"]').required).toBe(true);
  expect(input('parroquia_id').required).toBe(true); await change('parroquia_id', 'diocesis');
  await submit(container.querySelector('form')); expect(container.querySelector('[role="alert"]').textContent).toContain('Acceso rechazado');
});

test('alta y restablecimiento de usuarios admiten contraseñas de ocho caracteres', async () => {
  api.get.mockImplementation(async (path) => ({ data: path === '/usuarios/' ? [{ ...user, email: 'cuenta@example.org', activo: true }] : path === '/parroquias/' ? parishes : [] }));
  await render(<UsuariosPage />); await click(buttons('Agregar')[0]);
  expect(input('password').minLength).toBe(8);
  await change('nombre', 'Cuenta de prueba'); await change('email', 'nueva@example.org'); await change('password', 'abcdefgh');
  await submit(container.querySelector('form'));
  expect(api.post).toHaveBeenCalledWith('/usuarios/', expect.objectContaining({ password: 'abcdefgh' }));
  await click(buttons('Restablecer acceso')[0]);
  const reset = container.querySelector('input[type="password"]');
  expect(reset.minLength).toBe(8);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(reset, '12345678');
    reset.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await submit(reset.closest('form'));
  expect(api.post).toHaveBeenCalledWith('/usuarios/1/restablecer', { password: '12345678' });
});

test('configuración permite cambiar a una contraseña de ocho caracteres y exige confirmación', async () => {
  await render(<ConfiguracionPage />);
  expect(input('nueva').minLength).toBe(8); expect(input('confirmation').minLength).toBe(8);
  await change('actual', 'abcdefgh'); await change('nueva', '12345678'); await change('confirmation', '87654321');
  await submit(input('nueva').closest('form'));
  expect(api.post).not.toHaveBeenCalled(); expect(container.textContent).toContain('no coinciden');
  await change('confirmation', '12345678'); await submit(input('nueva').closest('form'));
  expect(api.post).toHaveBeenCalledWith('/auth/change-password', { actual: 'abcdefgh', nueva: '12345678' });
  expect(useAuth().logout).toHaveBeenCalledWith({ revoked: true });
});

test('login carga parroquias y envía la selección junto con las credenciales', async () => {
  const login = vi.fn().mockResolvedValue({ success: true });
  api.get.mockResolvedValue({ data: parishes });
  useAuth.mockReturnValue({ usuario: null, loading: false, login }); await render(<Login />);
  expect(api.get).toHaveBeenCalledWith('/auth/parroquias');
  expect(input('parroquia_id').textContent).toContain('Parroquia prueba B (TEST_B)');
  await change('parroquia_id', '2');
  await change('email', 'cuenta@example.org'); await change('password', 'clave de prueba');
  await submit(container.querySelector('form'));
  expect(login).toHaveBeenCalledWith('cuenta@example.org', 'clave de prueba', 2);
});

test('login no envía credenciales sin elegir parroquia o acceso diocesano', async () => {
  const login = vi.fn();
  useAuth.mockReturnValue({ usuario: null, loading: false, login }); await render(<Login />);
  await submit(container.querySelector('form'));
  expect(login).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain('Seleccione su parroquia');
});

test('login sin parroquias mantiene el acceso diocesano y explica el alta pendiente', async () => {
  const login = vi.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ usuario: null, loading: false, login }); await render(<Login />);
  expect(container.textContent).toContain('Aún no hay parroquias activas');
  await change('parroquia_id', 'diocesis'); await submit(container.querySelector('form'));
  expect(login).toHaveBeenCalledWith('', '', null);
});

test('login permite recuperar un fallo de carga sin confundirlo con un catálogo vacío', async () => {
  api.get.mockRejectedValueOnce(new Error('Sin conexión de prueba'));
  useAuth.mockReturnValue({ usuario: null, loading: false, login: vi.fn() }); await render(<Login />);
  expect(container.textContent).toContain('No se pudieron cargar las parroquias');
  expect(container.textContent).not.toContain('Aún no hay parroquias activas');
  api.get.mockResolvedValue({ data: parishes }); await click(buttons('Reintentar')[0]);
  expect(input('parroquia_id').textContent).toContain('Parroquia prueba A');
  expect(container.textContent).not.toContain('Sin conexión de prueba');
});

test('login bloquea el envío mientras carga las parroquias', async () => {
  let resolveCatalog;
  api.get.mockImplementationOnce(() => new Promise((resolve) => { resolveCatalog = resolve; }));
  const login = vi.fn();
  useAuth.mockReturnValue({ usuario: null, loading: false, login }); await render(<Login />);
  expect(input('parroquia_id').disabled).toBe(true);
  expect(buttons('Iniciar sesión')[0].disabled).toBe(true);
  await submit(container.querySelector('form')); expect(login).not.toHaveBeenCalled();
  await act(async () => resolveCatalog({ data: parishes }));
  expect(input('parroquia_id').disabled).toBe(false);
});
