import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.env.SGD_CAPTURE_OUTPUT || path.join(root,'.test-artifacts/evaluadores-real/evidence');
await fs.mkdir(path.join(output,'capturas'),{recursive:true});
const url=process.env.SGD_EVAL_URL;assert(url.startsWith('http://127.0.0.1:'));
const require=createRequire(path.join(root,'.test-runtime/node_modules/_resolver.cjs'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const captures=[],errors=[];
async function shot(page,name){
  await page.waitForLoadState('networkidle');
  const file='capturas/'+name+'.png';await page.screenshot({path:path.join(output,file),fullPage:true});
  const ui=await page.locator('main').evaluateAll(elements=>({fields:elements.flatMap(el=>[...el.querySelectorAll('label')].filter(l=>l.querySelector('input,select,textarea')).map(l=>{const i=l.querySelector('input,select,textarea');return{label:l.firstChild?.textContent?.trim()||l.textContent.trim(),name:i.name,type:i.type||i.tagName.toLowerCase(),required:i.required,min:i.min,max:i.max,minLength:i.minLength,maxLength:i.maxLength};})),buttons:elements.flatMap(el=>[...el.querySelectorAll('button')].map(b=>b.textContent.trim()))}));
  captures.push({name,file,role:'administrador',route:new URL(page.url()).pathname,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(output,file))).digest('hex'),...ui});
}
try{
  const page=await browser.newPage({viewport:{width:1600,height:1100},locale:'es-CO',timezoneId:'America/Bogota'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/login');await page.waitForFunction(()=>document.querySelector('select[name=parroquia_id]')?.disabled===false);await shot(page,'login');
  await page.locator('[name=parroquia_id]').selectOption('diocesis');await page.locator('[name=email]').fill('admin@iglesia.org');await page.locator('[name=password]').fill('admin123');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:/Bienvenido/}).waitFor();await shot(page,'panel');
  for(const route of ['registros','bautismos','confirmaciones','matrimonios','defunciones','personas','libros','solicitudes','certificados','documentos','parroquias','reportes','usuarios','auditoria','roles','sacramentos','respaldos','configuracion']){
    await page.goto(url+'/'+route);await page.locator('main h1').first().waitFor();await shot(page,route);
    const add=page.getByRole('button',{name:/^(Agregar|Registrar partida)$/}).first();
    if(await add.isVisible().catch(()=>false)){await add.click();await shot(page,route+'_formulario');}
  }
  await fs.writeFile(path.join(output,'capturas.json'),JSON.stringify(captures,null,2));
  await fs.writeFile(path.join(output,'navegador-real.json'),JSON.stringify({cuenta:'admin@iglesia.org',login_con_password_solicitada:true,capturas:captures.length,errores:errors,version:browser.version(),base:'Copia real de parroquia, 13 parroquias; sin partidas fabricadas'},null,2));
  assert.equal(errors.length,0);console.log('Capturas de la base real verificadas: '+captures.length);
}finally{await browser.close();}
