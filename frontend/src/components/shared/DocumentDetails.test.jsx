import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import api from '../../api/axiosConfig';
import { RecordDetail, RecordHistory, CertificateTrace, auditAction, auditArea, auditDetail } from './DocumentDetails';
vi.mock('../../api/axiosConfig', () => ({ default: { get: vi.fn() }, errorMessage: e => e.message }));
let host, root;
beforeEach(() => { global.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);vi.clearAllMocks(); });
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const render=async node=>act(async()=>root.render(node));
test('detalle de partida usa etiquetas y referencias concretas; omite propiedades arbitrarias',async()=>{
  const close=vi.fn();
  await render(<RecordDetail row={{id:44,numero:'A-17',libro:'L-9',folio:'F-2',parroquia_id:1,persona:{nombres:'Persona',apellidos:'Ficticia'},sacramento:{nombre:'Bautismo'},datos:{padre:'Padre ficticio',password_hash:'sensible',otra_columna:'dato técnico'}}} catalogs={{personas:[],parroquias:[{id:1,nombre:'Parroquia de prueba'}]}} onClose={close} />);
  expect(host.textContent).toContain('Persona Ficticia');expect(host.textContent).toContain('Parroquia de prueba');expect(host.textContent).toContain('A-17');
  expect(host.textContent).not.toContain('sensible');expect(host.textContent).not.toContain('dato técnico');expect(host.querySelector('pre')).toBeNull();
  await act(async()=>host.querySelector('[role=dialog]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  expect(close).toHaveBeenCalledOnce();
});
test('historial presenta motivo y cambios; respeta valores ocultos del servidor',async()=>{
  api.get.mockResolvedValue({data:[{id:1,fecha:'2026-11-16T15:30:00Z',responsable:{nombre:'Cuenta ficticia',rol:'consulta'},motivo:'Corrección real',valores_autorizados:false,cambios:[{campo:'Lugar de celebración',anterior:null,nuevo:null}]}]});
  await render(<RecordHistory row={{id:17,numero:'A17'}} onClose={()=>{}} />);
  expect(host.textContent).toContain('Corrección real');expect(host.textContent).toContain('Lugar de celebración');expect(host.textContent).toContain('requieren permiso');
  expect(host.querySelector('thead').textContent).not.toContain('Antes');expect(host.querySelector('pre')).toBeNull();
});
test('trazabilidad anulada sin evento no inventa fecha ni responsable de anulación',async()=>{
  api.get.mockResolvedValue({data:{numero:'SGD-FICTICIO',estado:'anulado',referencia:{},eventos:[],contenido_disponible:true}});
  await render(<CertificateTrace id={17} onClose={()=>{}} />);
  expect(host.textContent).toContain('Anulación: información histórica no disponible.');expect(host.textContent).toContain('no es una firma digital criptográfica');
  expect(host.querySelector('.document-timeline').children).toHaveLength(0);
});
test('auditoría traduce contraseñas, sesiones y metadatos de copias sin mostrar propiedades internas', () => {
  expect(auditAction('RESTABLECER_PASSWORD')).toBe('Contraseña restablecida');
  expect(auditAction('LOGIN_FALLIDO')).toBe('Inicio de sesión rechazado');
  expect(auditArea('registros_sacramentales')).toBe('Partidas sacramentales');
  expect(auditDetail({ entidad: 'respaldos', detalle: 'id=interno;origen=manual' })).toBe('Actuación de respaldo registrada');
  expect(auditDetail({ detalle: '{"password_hash":"privado"}' })).not.toContain('privado');
});
