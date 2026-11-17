import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../api/axiosConfig';

vi.mock('../api/axiosConfig', () => ({
  __esModule: true, default: { get: vi.fn(), post: vi.fn() }, errorMessage: (error) => error.message,
}));
let root, container, context;
function Consumer() { context = useAuth(); return <p>{context.usuario?.nombre || 'Sin sesión'}</p>; }
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; sessionStorage.clear(); vi.clearAllMocks();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function mount() { await act(async () => root.render(<AuthProvider><Consumer /></AuthProvider>)); }

test('restaura una sesión exclusivamente desde /auth/me', async () => {
  sessionStorage.setItem('sgd-token', 'token-sintetico');
  api.get.mockResolvedValue({ data: { nombre: 'Consulta sintética', rol: 'consulta' } });
  await mount();
  expect(api.get).toHaveBeenCalledWith('/auth/me');
  expect(container.textContent).toBe('Consulta sintética');
  expect(context.canWrite).toBe(false); expect(context.canManage).toBe(false);
});

test('login guarda token de sesión y consulta identidad real; logout informa al servidor', async () => {
  api.post.mockResolvedValue({ data: { access_token: 'token-sintetico' } });
  api.get.mockResolvedValue({ data: { nombre: 'Secretaría sintética', rol: 'secretario_parroquial' } });
  await mount();
  let result;
  await act(async () => { result = await context.login('sintetico@example.test', 'acceso-de-prueba', 2); });
  expect(result).toEqual({ success: true });
  expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'sintetico@example.test', password: 'acceso-de-prueba', parroquia_id: 2 });
  expect(sessionStorage.getItem('sgd-token')).toBe('token-sintetico');
  expect(context.canWrite).toBe(true); expect(context.canManage).toBe(false);
  await act(async () => context.logout());
  expect(api.post).toHaveBeenCalledWith('/auth/logout');
  expect(sessionStorage.getItem('sgd-token')).toBeNull(); expect(context.usuario).toBeNull();
});

test('un login fallido deja la sesión vacía y muestra el error del servidor', async () => {
  api.post.mockRejectedValue(new Error('Acceso denegado'));
  await mount();
  let result;
  await act(async () => { result = await context.login('sintetico@example.test', 'incorrecta'); });
  expect(result).toEqual({ success: false, error: 'Acceso denegado' });
  expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'sintetico@example.test', password: 'incorrecta', parroquia_id: null });
  expect(sessionStorage.getItem('sgd-token')).toBeNull(); expect(context.usuario).toBeNull();
});

test('una respuesta de sesión expirada retira identidad y token local', async () => {
  sessionStorage.setItem('sgd-token', 'token-sintetico');
  api.get.mockResolvedValue({ data: { nombre: 'Párroco sintético', rol: 'parroco' } });
  await mount(); expect(context.canManage).toBe(true);
  await act(async () => window.dispatchEvent(new Event('sgd-session-expired')));
  expect(context.usuario).toBeNull(); expect(sessionStorage.getItem('sgd-token')).toBeNull();
  expect(context.sessionMessage).toContain('expiró');
});

test('un cambio de contraseña confirmado retira la sesión revocada y explica el nuevo acceso', async () => {
  sessionStorage.setItem('sgd-token', 'token-sintetico');
  api.get.mockResolvedValue({ data: { nombre: 'Cuenta temporal', rol: 'administrador', debe_cambiar_password: true } });
  await mount();
  await act(async () => context.logout({ revoked: true }));
  expect(context.usuario).toBeNull();
  expect(sessionStorage.getItem('sgd-token')).toBeNull();
  expect(context.sessionMessage).toContain('Contraseña actualizada');
  expect(api.post).not.toHaveBeenCalled();
});
