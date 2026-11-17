import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import api from '../api/axiosConfig';
import { useAuth, permissionsFor } from '../context/AuthContext';
import WorkspaceBar from './WorkspaceBar';
import Sidebar from './Sidebar';
import Overview from './Overview';
import ParishDirectory from './ParishDirectory';
import ConnectedRecords from './ConnectedRecords';
import { PersonasPage } from './ConnectedPages';

vi.mock('../api/axiosConfig', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, errorMessage: (error) => error.message, downloadFile: vi.fn() }));
vi.mock('../context/AuthContext', async (original) => ({ ...await original(), useAuth: vi.fn() }));
const user = { id: 901, nombre: 'Cuenta de prueba', rol: 'administrador', parroquia_id: null };
const parish = { id: 1, codigo: 'DIR1', nombre: 'Catedral de prueba', tipo: 'catedral', municipio: 'Tibú', localidad: 'Centro', direccion: 'Calle de prueba', activa: true };
const record = { id: 1, persona_id: 1, persona: { nombres: 'Persona', apellidos: 'Autorizada' }, sacramento: { nombre: 'Bautismo' }, sacramento_id: 1, parroquia_id: 1, fecha_celebracion: '2026-10-01', libro: 'L1', folio: '2', numero: '3', datos: {} };
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); localStorage.clear();
  useAuth.mockReturnValue({ usuario: user, ...permissionsFor(user), logout: vi.fn() });
  api.get.mockImplementation(async (path) => ({ data: path === '/registros/' ? [record] : path === '/parroquias/' ? [parish] : path === '/sacramentos/' ? [{ id: 1, nombre: 'Bautismo' }] : [] }));
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); document.documentElement.removeAttribute('data-theme'); });
const button = (label) => container.querySelector(`button[aria-label="${label}"]`);
async function render(element, route = '/') { await act(async () => root.render(<MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>)); }
async function click(node) { await act(async () => node.click()); }
async function value(node, text) { await act(async () => { const type = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(type, 'value').set.call(node, text); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }

test('modo oscuro y favoritos persisten preferencias sin datos documentales', async () => {
  await render(<><Sidebar /><WorkspaceBar /></>, '/registros');
  await click(button('Activar modo oscuro'));
  expect(document.documentElement.dataset.theme).toBe('dark'); expect(localStorage.getItem('sgd-theme')).toBe('dark');
  await click(button('Añadir a mis accesos'));
  expect(container.textContent).toContain('Mis accesos'); expect(JSON.parse(localStorage.getItem('sgd-favorites-901'))).toEqual(['/registros']);
  await click(button('Quitar de mis accesos')); expect(container.textContent).not.toContain('Mis accesos');
});

test('Ctrl K busca partidas autorizadas con espera breve y Escape cierra', async () => {
  vi.useFakeTimers(); await render(<WorkspaceBar />);
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  const input = container.querySelector('input[aria-label="Buscar secciones o partidas"]');
  await value(input, 'Persona');
  expect(api.get).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTimeAsync(300));
  expect(api.get).toHaveBeenCalledWith('/registros/', expect.objectContaining({ params: { q: 'Persona', limit: 5 } }));
  expect(container.textContent).toContain('Persona Autorizada');
  expect(container.querySelector('a[href*="q=Persona"]')).not.toBeNull();
  expect([...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i))).join('')).not.toContain('Persona');
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector('.search-trigger'));
});

test('búsqueda de secciones conserva las restricciones del rol', async () => {
  const reader = { ...user, rol: 'consulta', parroquia_id: 1 };
  useAuth.mockReturnValue({ usuario: reader, ...permissionsFor(reader), logout: vi.fn() });
  await render(<WorkspaceBar />);
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })));
  expect(container.textContent).not.toContain('Usuarios'); expect(container.textContent).not.toContain('Respaldos');
});

test('panel representa conteos y series reales y no muestra creación a consulta', async () => {
  const reader = { ...user, rol: 'consulta', parroquia_id: 1 };
  useAuth.mockReturnValue({ usuario: reader, ...permissionsFor(reader) });
  api.get.mockResolvedValue({ data: { registros: 7, personas: 4, certificados: 2, solicitudes_pendientes: 1, por_sacramento: { Bautismo: 7 }, actividad_mensual: [{ mes: '2026-09', total: 0 }, { mes: '2026-10', total: 7 }], ultimas_partidas: [], certificados_por_estado: { preparado: 2 }, parroquias_activas: 13 } });
  await render(<Overview home />);
  expect(container.querySelector('.bar-chart').getAttribute('aria-label')).toContain('2026-10: 7');
  expect(container.querySelector('a[href="/registros?nuevo=1"]')).toBeNull();
  expect(container.querySelector('a[href="/usuarios?nuevo=1"]')).toBeNull();
  expect(container.textContent).toContain('13 parroquias'); expect(container.textContent).toContain('Preparados');
});

test('directorio muestra ubicación y conserva filtros en la consulta al servidor', async () => {
  await render(<ParishDirectory />);
  expect(container.textContent).toContain('Tibú'); expect(container.textContent).toContain('Calle de prueba');
  expect(container.querySelector('a[href^="https://www.google.com/maps/search/"]')).not.toBeNull();
  await value(container.querySelector('input[name="buscar_parroquia"]'), 'Tibú');
  await value(container.querySelector('select[aria-label="Estado de la parroquia"]'), 'true');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(api.get).toHaveBeenLastCalledWith('/parroquias/', expect.objectContaining({ params: expect.objectContaining({ q: 'Tibú', activa: 'true' }) }));
  await click(button('Vista de tabla')); expect(container.querySelector('table')).not.toBeNull();
});

test('búsqueda desde la barra abre consulta con filtros URL y permite limpiarlos', async () => {
  await render(<ConnectedRecords />, '/registros?q=Persona');
  expect(container.querySelector('input[name="q"]').value).toBe('Persona');
  expect(api.get).toHaveBeenCalledWith('/registros/', expect.objectContaining({ params: expect.objectContaining({ q: 'Persona' }) }));
  await click([...container.querySelectorAll('button')].find((node) => node.textContent === 'Limpiar filtros'));
  expect(container.querySelector('input[name="q"]').value).toBe('');
});

test('acceso rápido de personas abre el formulario para una cuenta autorizada', async () => {
  await render(<PersonasPage />, '/personas?nuevo=1');
  expect(container.querySelector('input[name="nombres"]')).not.toBeNull();
  expect(container.textContent).toContain('Nuevo registro');
});
