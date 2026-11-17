import { test, expect } from '@playwright/test';

const roles = ['administrador', 'parroco', 'secretario_parroquial', 'secretario_general', 'canciller', 'auditor', 'consulta'];
const parishRoles = ['parroco', 'secretario_parroquial', 'consulta', 'parroco2', 'secretario2'];
const email = role => `${role}@evaluacion.example.org`;
const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
async function selectRecord(page, record) {
  await page.getByLabel('Buscar número de partida', { exact: true }).fill(record.numero);
  await expect(page.locator('select[name=registro_id] option[value="' + record.id + '"]')).toHaveCount(1);
  await page.getByLabel('Partida sacramental', { exact: true }).selectOption(String(record.id));
}

async function login(page, role, password = process.env.QA_PASSWORD, account = email(role)) {
  if (!process.env.QA_PASSWORD) throw new Error('Configure QA_PASSWORD o ejecute scripts/qa.py setup');
  await page.goto('/login');
  await page.getByLabel('Parroquia o acceso diocesano').selectOption(parishRoles.includes(role) ? { label: `Parroquia Ficticia ${role.endsWith('2') ? 2 : 1} (EVAL${role.endsWith('2') ? 2 : 1})` } : 'diocesis');
  await page.getByLabel('Correo electrónico').fill(account);
  await page.locator('input[name=password]').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acceso institucional' })).toHaveCount(0);
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function logout(page) {
  await expect(page.locator('.app-shell')).toBeVisible();
  const button = page.getByRole('button', { name: 'Cerrar sesión', exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await button.click();
  await expect(page.getByRole('heading', { name: 'Acceso institucional' })).toBeVisible();
}

async function auth(page) {
  // The token never goes into reports, logs or the source tree.
  return { Authorization: `Bearer ${await page.evaluate(() => sessionStorage.getItem('sgd-token'))}` };
}

async function createRecord(page, type = 'Bautismo', parish = 1) {
  const headers = await auth(page);
  const people = await (await page.request.get('/api/personas/?limit=200', { headers })).json();
  const sacraments = await (await page.request.get('/api/sacramentos/', { headers })).json();
  const parishes = await (await page.request.get('/api/parroquias/', { headers })).json();
  const parishId = parishes.find(p => p.codigo === `EVAL${parish}`).id;
  const local = people.filter(p => p.parroquia_id === parishId);
  const body = { persona_id: local[0].id, sacramento_id: sacraments.find(s => s.nombre === type).id,
    parroquia_id: parishId, fecha_celebracion: '2020-04-10', libro: 'EVAL-1', folio: 'E2E', numero: stamp(),
    datos: type === 'Matrimonio' ? { conyuge_persona_id: local[1].id } : {} };
  const response = await page.request.post('/api/registros/', { headers, data: body });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), body };
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${r.method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`); });
  page.__errors = errors;
});
test.afterEach(async ({ page }) => expect(page.__errors).toEqual([]));

for (const role of roles) {
  test(`rol ${role}: módulos, permisos y cierre de sesión`, async ({ page }, testInfo) => {
    await login(page, role);
    const routes = ['/', '/registros', '/personas', '/bautismos', '/confirmaciones', '/matrimonios', '/defunciones',
      '/libros', '/solicitudes', '/certificados', '/documentos', '/parroquias', '/reportes', '/roles', '/sacramentos', '/configuracion'];
    if (['administrador', 'parroco'].includes(role)) routes.push('/usuarios');
    if (['administrador', 'parroco', 'secretario_general', 'canciller', 'auditor'].includes(role)) routes.push('/auditoria');
    if (['parroco', 'canciller'].includes(role)) routes.push('/aprobaciones');
    if (role === 'administrador') routes.push('/respaldos');
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByText('Cargando información…', { exact: true })).toHaveCount(0);
      if (testInfo.project.name === 'mobile') {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
    }
    const headers = await auth(page);
    if (!['administrador', 'parroco', 'secretario_parroquial'].includes(role)) {
      expect((await page.request.post('/api/personas/', { headers, data: { nombres: 'Prueba', apellidos: 'Ficticia' } })).status()).toBe(403);
    }
    if (!['administrador', 'parroco'].includes(role)) {
      await page.goto('/usuarios');
      await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
      expect((await page.request.get('/api/usuarios/', { headers })).status()).toBe(403);
    }
    await page.goto('/');
    await logout(page);
    await expect(page.getByRole('heading', { name: 'Acceso institucional' })).toBeVisible();
    expect((await page.request.get('/api/auth/me', { headers })).status()).toBe(401);
  });
}

for (const [type, route] of [['Bautismo', '/bautismos'], ['Confirmación', '/confirmaciones'], ['Matrimonio', '/matrimonios'], ['Defunción', '/defunciones']]) {
  test(`formulario real: registrar y corregir ${type}`, async ({ page }) => {
    await login(page, 'secretario_parroquial');
    await page.goto(route);
    await page.getByRole('button', { name: 'Registrar partida', exact: true }).click();
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Guardar partida', exact: true }) });
    await expect(form.locator('[name=persona_id] option')).not.toHaveCount(1);
    await form.locator('[name=persona_id]').selectOption({ index: 1 });
    await form.locator('[name=fecha_celebracion]').fill('2020-04-10');
    await form.locator('[name=libro]').selectOption('EVAL-1');
    await form.locator('[name=folio]').fill('UI');
    const number = stamp();
    await form.locator('[name=numero]').fill(number);
    if (type === 'Matrimonio') await form.locator('[name=conyuge_persona_id]').selectOption({ index: 1 });
    await form.getByRole('button', { name: 'Guardar partida', exact: true }).click();
    await expect(page.getByText('Partida registrada correctamente.', { exact: true })).toBeVisible();
    const search = page.locator('form.toolbar');
    await search.locator('[name=numero]').fill(number);
    await search.getByRole('button', { name: 'Buscar', exact: true }).click();
    const row = page.locator('tbody tr').filter({ hasText: number });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Ver', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Datos de la persona');
    await expect(page.getByRole('dialog').locator('pre')).toHaveCount(0);
    await expect(page.getByRole('dialog')).not.toContainText('persona_id');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await row.getByRole('button', { name: 'Corregir / nota', exact: true }).click();
    await form.locator('[name=lugar]').fill('Lugar Ficticio Corregido');
    await form.locator('[name=motivo]').fill('Corrección ficticia para verificar trazabilidad');
    await form.getByRole('button', { name: 'Guardar partida', exact: true }).click();
    await expect(page.getByText('Corrección guardada. El historial conserva el asiento anterior.', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Historial', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Lugar Ficticio Corregido');
  });
}

test('editar persona conserva datos y custodia', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  await page.goto('/personas');
  await page.locator('tbody tr').first().getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Lugar de nacimiento').fill('Lugar ficticio de evaluación');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Información guardada correctamente.', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('paginación y validación de rango en búsqueda avanzada', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  await page.goto('/personas');
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
  await page.goto('/registros');
  await page.getByLabel('Desde', { exact: true }).fill('2021-01-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2020-01-01');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El rango de fechas es inválido');
});

test('certificado ordinario: preparación, autorización, firma, PDF y verificación pública', async ({ page, browser }) => {
  await login(page, 'secretario_parroquial');
  const record = await createRecord(page);
  await page.goto('/certificados');
  await selectRecord(page, record);
  await page.getByRole('button', { name: 'Preparar certificado', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText(/preparado/i);
  const row = certificateRow(page, record);
  await expect(row).toContainText(/preparado/i);
  await expect(row.getByRole('button', { name: 'Descargar PDF', exact: true })).toHaveCount(0);
  await logout(page);
  await login(page, 'parroco');
  await page.goto('/certificados');
  for (const action of ['Autorizar', 'Firmar']) {
    await row.getByRole('button', { name: action, exact: true }).click();
    await page.getByLabel('Motivo de la actuación').fill('Actuación ficticia autorizada de evaluación');
    await page.getByRole('button', { name: 'Confirmar actuación', exact: true }).click();
    await expect(page.locator('.notice.success[role=status]')).toContainText('registrada');
  }
  const downloadPromise = page.waitForEvent('download');
  await row.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const url = await row.getByRole('link', { name: 'Verificar autenticidad' }).getAttribute('href');
  await row.getByRole('button', { name: 'Ver trazabilidad', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Firma administrativa registrada');
  await expect(page.getByRole('dialog')).toContainText('Actuación ficticia autorizada de evaluación');
  await expect(page.getByRole('dialog').locator('pre')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(new URL(url, page.url()).href);
  await expect(publicPage.locator('body')).toContainText(/válido|auténtico|firmado/i);
  await anonymous.close();
});

test('IDOR, SQLi, archivos activos, JWT inválido y ausencia de autenticación', async ({ page }) => {
  await login(page, 'administrador');
  const foreign = await createRecord(page, 'Bautismo', 2);
  await logout(page);
  await login(page, 'secretario_parroquial');
  const headers = await auth(page);
  expect((await page.request.patch(`/api/registros/${foreign.id}`, { headers, data: { ...foreign.body, motivo: 'Intento no autorizado de evaluación' } })).status()).toBe(403);
  expect((await page.request.get(`/api/registros/${foreign.id}/historial`, { headers })).status()).toBe(403);
  const list = await page.request.get('/api/registros/', { headers, params: { q: "' OR 1=1 --" } });
  expect(list.status()).toBe(200);
  expect(await list.json()).toEqual([]);
  const own = await createRecord(page);
  const upload = await page.request.post(`/api/documentos/?registro_id=${own.id}&tipo_documento=acta`, {
    headers, multipart: { archivo: { name: 'ficticio.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<script>alert(1)</script>') } },
  });
  expect(upload.status()).toBe(422);
  for (const route of ['/api/personas/', '/api/registros/', '/api/usuarios/', '/api/auditoria/', '/api/certificados/', '/api/respaldos/']) {
    expect((await page.request.get(route)).status()).toBe(401);
    expect((await page.request.get(route, { headers: { Authorization: 'Bearer invalid.jwt.value' } })).status()).toBe(401);
  }
});

async function certificateAction(page, row, action) {
  await row.getByRole('button', { name: action, exact: true }).click();
  await page.getByLabel('Motivo de la actuación').fill('Actuación ficticia autorizada para evaluación');
  await page.getByRole('button', { name: 'Confirmar actuación', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText('registrada');
}

const certificateRow = (page, record) => page.locator('tbody tr').filter({
  has: page.getByRole('cell', { name: `Libro ${record.libro} · Folio ${record.folio} · Partida ${record.numero}`, exact: true }),
});

test('solicitud externa: buscar referencia, aprobar, preparar, firmar y entregar PDF', async ({ page }) => {
  await login(page, 'administrador');
  const record = await createRecord(page, 'Bautismo', 2);
  await logout(page);
  await login(page, 'secretario_parroquial');
  await page.goto('/solicitudes');
  await page.getByLabel('Parroquia custodiante').selectOption({ label: 'Parroquia Ficticia 2' });
  const search = page.locator('form').filter({ has: page.getByRole('button', { name: 'Buscar referencia', exact: true }) });
  for (const field of ['libro', 'folio', 'numero']) await search.locator(`[name=${field}]`).fill(record[field]);
  await search.getByRole('button', { name: 'Buscar referencia', exact: true }).click();
  await page.getByLabel('Referencia de la partida').selectOption(String(record.id));
  await page.getByLabel('Motivo institucional').fill('Solicitud ficticia para evaluación entre parroquias');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText('Solicitud enviada');
  await logout(page);
  await login(page, 'secretario2');
  await page.goto('/solicitudes');
  const request = certificateRow(page, record);
  await request.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await page.getByLabel('Motivo de la decisión').fill('Referencia ficticia revisada y aprobada');
  await page.getByRole('button', { name: 'Confirmar decisión', exact: true }).click();
  await expect(request).toContainText(/aprobada/i);
  await request.getByRole('button', { name: 'Preparar certificado', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText(/preparado/i);
  await expect(request.getByRole('button', { name: 'Preparar certificado', exact: true })).toHaveCount(0);
  await request.getByRole('link', { name: 'Continuar certificado', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await logout(page);
  await login(page, 'parroco2');
  await page.goto('/certificados');
  const row = certificateRow(page, record);
  await certificateAction(page, row, 'Autorizar');
  await certificateAction(page, row, 'Firmar');
  await logout(page);
  await login(page, 'secretario_parroquial');
  await page.goto('/certificados');
  const download = page.waitForEvent('download');
  await certificateRow(page, record).getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});

test('certificado de Curia: autorización custodio, aprobación canciller, firma y anulación', async ({ page, browser }) => {
  await login(page, 'secretario_parroquial');
  const record = await createRecord(page);
  await page.goto('/certificados');
  await selectRecord(page, record);
  await page.getByLabel('Requiere aprobación de la Curia').check();
  await page.getByLabel('Motivo de competencia de la Curia').fill('Trámite ficticio de competencia diocesana');
  await page.getByRole('button', { name: 'Preparar certificado', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText(/preparado/i);
  await logout(page);
  await login(page, 'parroco');
  await page.goto('/certificados');
  await certificateAction(page, certificateRow(page, record), 'Autorizar');
  await expect(certificateRow(page, record).getByRole('button', { name: 'Firmar', exact: true })).toHaveCount(0);
  await logout(page);
  await login(page, 'canciller');
  await page.goto('/aprobaciones');
  const row = certificateRow(page, record);
  await certificateAction(page, row, 'Aprobar en Curia');
  await certificateAction(page, row, 'Firmar');
  await expect(row).toContainText(/firmado/i);
  const verification = await row.getByRole('link', { name: 'Verificar autenticidad' }).getAttribute('href');
  await certificateAction(page, row, 'Anular');
  await expect(row).toContainText(/anulado/i);
  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto(new URL(verification, page.url()).href);
  await expect(anonymous.locator('body')).toContainText(/anulado|no válido/i);
  await context.close();
});

test('recuperar acceso y cambiar contraseña revoca sesiones desde el navegador', async ({ page }) => {
  await login(page, 'administrador');
  const account = `recuperacion-${stamp()}@evaluacion.example.org`;
  const created = await page.request.post('/api/usuarios/', { headers: await auth(page), data: {
    nombre: 'Recuperación Ficticia', email: account, password: process.env.QA_PASSWORD, rol: 'consulta', parroquia_id: 1,
  } });
  expect(created.status()).toBe(201);
  await page.goto('/usuarios');
  const row = page.locator('tbody tr').filter({ hasText: account });
  for (let pageNumber = 0; pageNumber < 30; pageNumber++) {
    await page.getByText('Cargando información…', { exact: true }).waitFor({ state: 'hidden' });
    if (await row.count()) break;
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/usuarios/' && r.request().method() === 'GET');
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await response;
  }
  await row.getByRole('button', { name: 'Restablecer acceso', exact: true }).click();
  const temporary = process.env.QA_PASSWORD + '-temporal';
  await page.getByLabel('Nueva contraseña (mínimo 8 caracteres)').fill(temporary);
  await page.getByRole('button', { name: 'Restablecer contraseña', exact: true }).click();
  await expect(page.locator('.notice.success[role=status]')).toContainText('Contraseña restablecida');
  await logout(page);
  // Login now intentionally ends at the mandatory password replacement screen.
  await page.goto('/login');
  await page.getByLabel('Parroquia o acceso diocesano').selectOption({ label: 'Parroquia Ficticia 1 (EVAL1)' });
  await page.getByLabel('Correo electrónico').fill(account);
  await page.locator('input[name=password]').fill(temporary);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cambie su contraseña temporal' })).toBeVisible();
  const oldHeaders = await auth(page);
  await page.getByLabel('Contraseña temporal', { exact: false }).fill(temporary);
  await page.locator('[name=nueva]').fill(process.env.QA_PASSWORD);
  await page.locator('[name=confirmar]').fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Guardar contraseña e iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acceso institucional' })).toBeVisible();
  expect((await page.request.get('/api/auth/me', { headers: oldHeaders })).status()).toBe(401);
  await login(page, 'consulta', process.env.QA_PASSWORD, account);
});

test('XSS almacenado se muestra como texto y no ejecuta scripts', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  const record = await createRecord(page);
  const payload = '<img src=x onerror="window.__qaXss=true">';
  const response = await page.request.patch(`/api/registros/${record.id}`, { headers: await auth(page),
    data: { ...record.body, notas: payload, motivo: 'Prueba ficticia de escape de texto' } });
  expect(response.status()).toBe(200);
  await page.goto(`/registros?numero=${record.numero}`);
  await page.locator('tbody tr').getByRole('button', { name: 'Ver', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(payload);
  expect(await page.evaluate(() => window.__qaXss)).toBeUndefined();
  await page.request.patch(`/api/registros/${record.id}`, { headers: await auth(page),
    data: { ...record.body, notas: 'Prueba XSS completada; datos ficticios', motivo: 'Restaurar texto de evaluación' } });
});

test('libros: alta real y duplicado controlado', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  await page.goto('/libros');
  const number = 'LIBRO-' + stamp();
  async function fillBook() {
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.getByLabel('Parroquia', { exact: false }).selectOption({ label: 'Parroquia Ficticia 1' });
    await page.getByLabel('Tipo de partida', { exact: false }).selectOption({ label: 'Bautismo' });
    await page.getByLabel('Número / referencia del libro').fill(number);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  }
  await fillBook();
  await expect(page.getByText('Información guardada correctamente.', { exact: true })).toBeVisible();
  await fillBook();
  await expect(page.getByRole('alert')).toContainText('integridad o unicidad');
});

test('administración: crear y editar parroquia conserva código y ubicación', async ({ page }) => {
  await login(page, 'administrador');
  await page.goto('/parroquias');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  const code = 'QA' + Date.now();
  await page.locator('[name=nombre]').fill('Comunidad Ficticia ' + code);
  await page.locator('[name=codigo]').fill(code);
  await page.locator('[name=municipio]').fill('Municipio ficticio');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const card = page.locator('article.parish-card').filter({ hasText: code });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('[name=direccion]').fill('Dirección ficticia corregida');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(card).toContainText('Dirección ficticia corregida');
});

test('archivo PDF válido: carga, persistencia y descarga desde formulario', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  const record = await createRecord(page);
  await page.goto('/documentos');
  await selectRecord(page, record);
  await page.locator('[name=archivo]').setInputFiles('e2e/fixtures/ficticio.pdf');
  await page.getByRole('button', { name: 'Subir documento', exact: true }).click();
  await expect(page.locator('.notice.success')).toContainText('Documento almacenado');
  await page.reload();
  const row = certificateRow(page, record);
  const downloaded = page.waitForEvent('download');
  await row.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('ficticio.pdf');
});

test('selector documental: paginar conserva la selección y buscar recupera una partida concreta', async ({ page }) => {
  await login(page, 'secretario_parroquial');
  let last;
  for (let i = 0; i < 21; i++) last = await createRecord(page);
  await page.goto('/documentos');
  const select = page.getByRole('combobox', { name: 'Partida sacramental', exact: true });
  await expect(select).toBeEnabled();
  const first = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(first);
  await page.getByRole('button', { name: 'Más partidas', exact: true }).click();
  await expect(page.getByText('Página de partidas 2', { exact: true })).toBeVisible();
  await expect(select).toBeEnabled(); await expect(select).toHaveValue(first);
  await page.getByRole('button', { name: 'Partidas anteriores', exact: true }).click();
  await expect(page.getByText('Página de partidas 1', { exact: true })).toBeVisible();
  await selectRecord(page, last);
  await expect(select).toHaveValue(String(last.id));
  await expect(select.locator('option:checked')).toContainText(last.numero);
  await expect(page.getByRole('button', { name: 'Más partidas', exact: true })).toBeDisabled();
  await expect(page.locator('main')).not.toContainText('registro_id');
});

test('contraseña incorrecta informa error y no crea sesión', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Parroquia o acceso diocesano').selectOption('diocesis');
  await page.getByLabel('Correo electrónico').fill(email('administrador'));
  await page.locator('input[name=password]').fill('Clave-ficticia-incorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrectos');
  expect(await page.evaluate(() => sessionStorage.getItem('sgd-token'))).toBeNull();
});
