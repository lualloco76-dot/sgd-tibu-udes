import { expect, test, vi } from 'vitest';
import api, { downloadFile, errorMessage } from './axiosConfig';
test('validación presenta campos y mensajes en español sin rutas internas ni valores sensibles', () => {
  const result = errorMessage({ response: { data: { detail: [
    { loc: ['body', 'parroquia_id'], type: 'int_parsing', msg: 'Input should be a valid integer', input: 'valor-privado' },
    { loc: ['body', 'password'], type: 'string_too_short', ctx: { min_length: 8 }, msg: 'String should have at least 8 characters' },
    { loc: ['body', 'datos', 'fecha_defuncion'], type: 'date_parsing', msg: 'Invalid date' },
    { loc: ['body', 'campo_desconocido'], type: 'value_error', msg: 'Technical error' },
  ] } } });
  expect(result).toContain('Parroquia: Seleccione');
  expect(result).toContain('Contraseña: Escriba al menos 8 caracteres.');
  expect(result).toContain('Fecha de defunción: Introduzca una fecha válida.');
  for (const value of ['parroquia_id', 'body', 'Input', 'String', 'Technical', 'campo_desconocido', 'valor-privado']) expect(result).not.toContain(value);
});
test('una descarga denegada conserva la explicación JSON de FastAPI',async()=>{
  const error={response:{status:403,data:{type:'application/json',text:async()=>JSON.stringify({detail:'Descarga no autorizada para su parroquia'})}}};
  const get=vi.spyOn(api,'get').mockRejectedValue(error);
  try {
    await expect(downloadFile('/certificados/1/pdf','prueba.pdf')).rejects.toBe(error);
    expect(errorMessage(error)).toBe('Descarga no autorizada para su parroquia');
  } finally {get.mockRestore();}
});
