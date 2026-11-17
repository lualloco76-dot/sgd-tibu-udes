export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function buildCsv(rows, columns) {
  const fields = columns.filter((column) => column.key !== 'acciones' && column.exportable !== false);
  return '\uFEFF' + [fields.map((column) => csvCell(column.label)).join(';'), ...rows.map((row) => fields.map((column) => { const raw = column.exportValue ? column.exportValue(row) : row[column.key]; return csvCell(raw && typeof raw === 'object' ? 'Información no disponible' : raw); }).join(';'))].join('\r\n');
}
export function exportCsv(rows, columns, filename = 'archivo-diocesano.csv') {
  const blob = new Blob([buildCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
