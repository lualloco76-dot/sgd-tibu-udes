import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'.test-runtime/node_modules/_resolver.cjs'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url=process.env.SGD_UI_URL;
assert(url.startsWith('http://127.0.0.1:'));
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  async function login(password){
    await page.goto(url+'/login');
    await page.waitForFunction(()=>document.querySelector('select[name=parroquia_id]')?.disabled===false);
    await page.locator('[name=parroquia_id]').selectOption('diocesis');
    await page.locator('[name=email]').fill(process.env.SGD_UI_EMAIL);
    await page.locator('[name=password]').fill(password);
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  }
  await login(process.env.SGD_UI_PASSWORD);
  await page.getByRole('heading',{name:'Cambie su contraseña temporal',exact:true}).waitFor();
  await page.screenshot({path:path.join(root,'.test-artifacts/distribution/evidence/capturas/cambio_temporal.png'),fullPage:true});
  assert.equal(await page.locator('aside.sidebar').count(),0);
  await page.locator('[name=actual]').fill(process.env.SGD_UI_PASSWORD);
  await page.locator('[name=nueva]').fill(process.env.SGD_UI_NEW_PASSWORD);
  await page.locator('[name=confirmar]').fill(process.env.SGD_UI_NEW_PASSWORD);
  await page.getByRole('button',{name:'Guardar contraseña e iniciar sesión',exact:true}).click();
  await page.waitForURL(url+'/login');
  await page.getByText('Contraseña actualizada. Inicie sesión con su nueva contraseña.',{exact:true}).waitFor();
  await login(process.env.SGD_UI_NEW_PASSWORD);
  await page.getByRole('heading',{name:/Bienvenido/}).waitFor();
  console.log('Cambio obligatorio y nuevo acceso comprobados en interfaz instalada');
}finally{await browser.close();}
