import { test, expect } from '@playwright/test';
import { auditButtons } from './button-audit.flow';
test('inventario activo: pulsar acciones, persistencia, exportaciones, permisos y respaldos', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const result = await auditButtons(page, { password: process.env.QA_PASSWORD, baseURL: testInfo.project.use.baseURL || process.env.QA_BASE_URL || 'http://127.0.0.1:8765' });
  expect(result.errors).toEqual([]);
  await testInfo.attach('inventario-botones.json', { body: JSON.stringify(result, null, 2), contentType:'application/json' });
});
