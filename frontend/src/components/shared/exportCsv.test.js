import { expect, test } from 'vitest';
import { buildCsv, csvCell } from './exportCsv';

test('CSV conserva tildes, separadores, comillas y saltos de línea', () => {
  const csv = buildCsv([{ nombre: 'María; "Tibú"\nCentro', id: 4 }], [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }]);
  expect(csv).toBe('\uFEFF"ID";"Nombre"\r\n"4";"María; ""Tibú""\nCentro"');
});
test.each(['=SUM(A1)', '+CMD', '-CMD', '@SUM', '  =SUM(A1)', '\tformula', '\rformula'])('CSV neutraliza texto interpretable como fórmula: %s', (value) => {
  expect(csvCell(value).startsWith('"\'')).toBe(true);
});
test('CSV exporta solo las filas recibidas y omite columnas de acciones', () => {
  const csv = buildCsv([{ id: 1, persona: { nombre: 'Autorizada' }, acciones: 'No exportar' }], [{ key: 'id', label: 'ID' }, { key: 'persona', label: 'Persona', exportValue: (row) => row.persona.nombre }, { key: 'acciones', label: 'Acciones' }]);
  expect(csv).toContain('Autorizada'); expect(csv).not.toContain('Acciones'); expect(csv).not.toContain('No exportar');
  expect(csv.split('\r\n')).toHaveLength(2);
});
test('CSV no convierte objetos sin presentación en JSON técnico', () => {
  const csv = buildCsv([{ persona: { password_hash: 'privado' } }], [{ key: 'persona', label: 'Persona' }]);
  expect(csv).toContain('Información no disponible');
  expect(csv).not.toContain('password_hash'); expect(csv).not.toContain('privado');
});
