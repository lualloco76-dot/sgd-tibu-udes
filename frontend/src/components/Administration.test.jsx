import React, { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RolePermissions from './RolePermissions';
import BackupCenter from './BackupCenter';
import { PermissionRoute } from './Dashboard';
import { permissionsFor, useAuth } from '../context/AuthContext';
import api, { downloadFile } from '../api/axiosConfig';

vi.mock('../context/AuthContext', async (original) => ({ ...await original(), useAuth: vi.fn() }));
vi.mock('../api/axiosConfig', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, downloadFile: vi.fn(), errorMessage: (error) => error.message }));
const defaults = permissionsFor({ rol: 'consulta' });
const catalog = {
  roles: [
    { id: 'administrador', permisos: permissionsFor({ rol: 'administrador' }), editables: [], revision: 0, usuarios: 1 },
    { id: 'consulta', permisos: defaults, predeterminados: defaults, editables: ['canWrite', 'canAudit'], revision: 2, usuarios: 3 },
  ],
  permisos: [{ id: 'canWrite', nombre: 'Registrar y corregir', descripcion: 'Partidas y documentos.' }, { id: 'canSignCert', nombre: 'Firmar', descripcion: 'Facultad del cargo.' }],
};
const backup = { id: 'abc123', creado: '2026-11-02T12:00:00Z', terminado: '2026-11-02T12:01:00Z', estado: 'completado', origen: 'manual', tamano: 4096, sha256: 'a'.repeat(64), verificado: '2026-11-02T12:01:00Z' };
let root, container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  useAuth.mockReturnValue({ usuario: { id: 1, rol: 'administrador' }, ...permissionsFor({ rol: 'administrador' }) });
  api.get.mockImplementation(async (path) => ({ data: path === '/roles/' ? structuredClone(catalog) : path === '/respaldos/' ? [backup] : { frecuencia: 'manual', hora: 2, proximo: null, en_curso: false, herramienta_disponible: true, programador_activo: true } }));
  api.post.mockResolvedValue({ data: { id: 'new', estado: 'en_curso' } });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function render(element) { await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>)); }
async function click(element) { await act(async () => element.click()); }
const button = (label) => [...container.querySelectorAll('button')].find((element) => element.textContent.includes(label));
async function select(name, value) {
  const element = container.querySelector(`[name="${name}"]`);
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('change', { bubbles: true })); });
}

test('edita permisos, impide perder el borrador y aplica la revisión del servidor', async () => {
  api.patch.mockResolvedValue({ data: { ...catalog.roles[1], permisos: { ...defaults, canWrite: true }, revision: 3 } });
  const changed = vi.fn(); window.addEventListener('sgd-permissions-changed', changed);
  await render(<RolePermissions />);
  await click(button('Consulta'));
  expect(container.querySelector('#perm-canSignCert').disabled).toBe(true);
  await click(container.querySelector('#perm-canWrite'));
  expect(button('Administrador').disabled).toBe(true);
  expect(container.textContent).toContain('1 cambio sin guardar');
  await click(button('Guardar permisos'));
  expect(api.patch).toHaveBeenCalledWith('/roles/consulta', { revision: 2, permisos: { canWrite: true } });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(container.querySelector('#perm-canWrite').checked).toBe(true);
  expect(container.textContent).toContain('Se aplican automáticamente');
  window.removeEventListener('sgd-permissions-changed', changed);
});

test('un conflicto conserva los cambios hasta descartar o recargar', async () => {
  api.patch.mockRejectedValue(new Error('Los permisos cambiaron. Actualice la página antes de guardar'));
  await render(<RolePermissions />); await click(button('Consulta')); await click(container.querySelector('#perm-canWrite')); await click(button('Guardar permisos'));
  expect(container.querySelector('[role=alert]').textContent).toContain('Los permisos cambiaron');
  expect(container.querySelector('#perm-canWrite').checked).toBe(true);
  await click(button('Descartar'));
  expect(container.querySelector('#perm-canWrite').checked).toBe(false);
});

test('consulta no puede modificar y los permisos del servidor gobiernan las rutas', async () => {
  useAuth.mockReturnValue({ usuario: { rol: 'consulta' }, canAudit: true });
  await render(<RolePermissions />);
  expect([...container.querySelectorAll('[role=switch]')].every((element) => element.disabled)).toBe(true);
  expect(button('Guardar permisos')).toBeUndefined();
  await render(<PermissionRoute permission="canAudit"><p>Auditoría habilitada</p></PermissionRoute>);
  expect(container.textContent).toContain('Auditoría habilitada');
  expect(permissionsFor({ rol: 'consulta', permisos: { canWrite: true } }).canWrite).toBe(true);
});

test('crea, verifica y descarga respaldos completos desde el historial', async () => {
  await render(<BackupCenter />);
  await click(button('Crear respaldo'));
  expect(api.post).toHaveBeenCalledWith('/respaldos/');
  await click(button('Verificar'));
  expect(api.post).toHaveBeenCalledWith('/respaldos/abc123/verificar', null, { timeout: 0 });
  await click(button('Descargar'));
  expect(downloadFile).toHaveBeenCalledWith('/respaldos/abc123/descargar', 'respaldo-sgd-abc123.zip', { timeout: 0 });
});

test('guarda una programación diaria con hora de Colombia', async () => {
  api.patch.mockResolvedValue({ data: { frecuencia: 'diario', hora: 3, proximo: '2026-11-03T08:00:00Z' } });
  await render(<BackupCenter />); await select('frecuencia', 'diario'); await select('hora', '3');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(api.patch).toHaveBeenCalledWith('/respaldos/configuracion', { frecuencia: 'diario', hora: 3 });
  expect(container.textContent).toContain('Programación guardada');
});

test('un respaldo en curso impide duplicarlo y los errores se muestran', async () => {
  const previous = api.get.getMockImplementation();
  api.get.mockImplementation((path) => path === '/respaldos/' ? Promise.resolve({ data: [{ ...backup, estado: 'en_curso' }] }) : previous(path));
  await render(<BackupCenter />);
  expect(button('Respaldo en curso').disabled).toBe(true);
});
