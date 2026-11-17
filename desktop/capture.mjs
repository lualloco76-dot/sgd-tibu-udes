import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'.test-artifacts/distribution/evidence');
const {url}=JSON.parse(await fs.readFile(path.join(out,'capture-url.json'),'utf8'));
assert(url.startsWith('http://127.0.0.1:'));
const accounts=JSON.parse(await fs.readFile(path.join(root,'desktop/demo_accounts.json'),'utf8'));
const require=createRequire(path.join(root,'.test-runtime/node_modules/_resolver.cjs'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const manifest=[], errors=[];
await fs.mkdir(path.join(out,'capturas'),{recursive:true});
async function screenshot(page,name,extra={}){
  await page.waitForLoadState('networkidle');
  const file='capturas/'+name+'.png';
  await page.screenshot({path:path.join(out,file),fullPage:true});
  const ui=await page.locator('main').evaluateAll(elements=>({
    fields:elements.flatMap(el=>[...el.querySelectorAll('label')].filter(label=>label.querySelector('input,select,textarea')).map(label=>{
      const input=label.querySelector('input,select,textarea');
      return {label:label.firstChild?.textContent?.trim()||label.textContent.trim(),name:input.name,type:input.type||input.tagName.toLowerCase(),required:input.required,min:input.min,max:input.max,minLength:input.minLength,maxLength:input.maxLength,options:input.tagName==='SELECT'?[...input.options].map(o=>o.textContent):undefined};
    })),
    buttons:elements.flatMap(el=>[...el.querySelectorAll('button')].map(b=>b.textContent.trim())),
    headings:elements.flatMap(el=>[...el.querySelectorAll('h1,h2,h3')].map(h=>h.textContent.trim()))
  }));
  manifest.push({name,file,route:new URL(page.url()).pathname,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(out,file))).digest('hex'),...extra,...ui});
}
try{
  const pages={};
  for(const account of accounts){
    const context=await browser.newContext({viewport:{width:1600,height:1100},locale:'es-CO',timezoneId:'America/Bogota'});
    const page=await context.newPage();pages[account.role]=page;
    page.on('pageerror',e=>errors.push({role:account.role,message:e.message}));
    await page.goto(url+'/login');
    await page.waitForFunction(()=>document.querySelector('select[name=parroquia_id]')?.disabled===false);
    if(account.role==='administrador')await screenshot(page,'00_login',{role:account.role});
    const parish=['parroco','secretario_parroquial','consulta'].includes(account.role);
    const values=await page.locator('[name=parroquia_id] option').evaluateAll(options=>options.map(o=>({v:o.value,t:o.textContent})));
    const selected=parish?values.find(o=>o.t.includes('Ficticia A')).v:'diocesis';
    await page.locator('[name=parroquia_id]').selectOption(selected);
    await page.locator('[name=email]').fill(account.email);await page.locator('[name=password]').fill(account.password);
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
    await page.waitForURL(url+'/');await page.getByRole('heading',{name:/Bienvenido/}).waitFor();
    await screenshot(page,'rol_'+account.role,{role:account.role});
  }
  const routes=['registros','bautismos','confirmaciones','matrimonios','defunciones','personas','libros','solicitudes','certificados','documentos','parroquias','reportes','usuarios','auditoria','roles','sacramentos','respaldos','configuracion'];
  const admin=pages.administrador;
  for(const route of routes){
    await admin.goto(url+'/'+route);await admin.locator('main h1').first().waitFor();
    await screenshot(admin,route,{role:'administrador'});
    const add=admin.getByRole('button',{name:/^(Agregar|Registrar partida|Agregar parroquia|Nueva parroquia)$/}).first();
    if(await add.isVisible().catch(()=>false)){
      await add.click();await screenshot(admin,route+'_formulario',{role:'administrador'});
    }
  }
  await pages.parroco.goto(url+'/aprobaciones');await screenshot(pages.parroco,'aprobaciones',{role:'parroco'});
  // Preserve current field/button information for each certificate action state.
  await pages.parroco.goto(url+'/certificados');
  await screenshot(pages.parroco,'certificados_parroco',{role:'parroco'});
  const secretary=pages.secretario_parroquial;
  for(const curia of [false,true]){
    const cert=await secretary.evaluate(async(curia)=>{
      const headers={'Authorization':'Bearer '+sessionStorage.getItem('sgd-token'),'Content-Type':'application/json'};
      const records=await (await fetch('/api/registros/',{headers})).json();
      const r=await fetch('/api/certificados/',{method:'POST',headers,body:JSON.stringify({registro_id:records[0].id,requiere_aprobacion_curia:curia,motivo_curia:curia?'Ejemplo ficticio para el manual':null})});
      if(!r.ok)throw new Error('No se preparó el ejemplo de certificado');return r.json();
    },curia);
    const parish=pages.parroco;
    await parish.goto(url+'/certificados');await parish.getByRole('button',{name:'Autorizar',exact:true}).first().click();
    await screenshot(parish,curia?'curia_autorizar':'ordinario_autorizar',{role:'parroco'});
    await parish.locator('[name=motivo_actuacion]').fill('Actuación ficticia documentada en el manual');
    await parish.getByRole('button',{name:'Confirmar actuación',exact:true}).click();await parish.waitForLoadState('networkidle');
    let signer=parish;
    if(curia){
      signer=pages.canciller;await signer.goto(url+'/certificados');await signer.getByRole('button',{name:'Aprobar en Curia',exact:true}).first().click();
      await screenshot(signer,'curia_aprobar',{role:'canciller'});
      await signer.locator('[name=motivo_actuacion]').fill('Competencia ficticia de Curia');await signer.getByRole('button',{name:'Confirmar actuación',exact:true}).click();await signer.waitForLoadState('networkidle');
    }
    await signer.getByRole('button',{name:'Firmar',exact:true}).first().click();
    await screenshot(signer,curia?'curia_firmar':'ordinario_firmar',{role:curia?'canciller':'parroco'});
    await signer.locator('[name=motivo_actuacion]').fill('Firma autenticada ficticia del manual');await signer.getByRole('button',{name:'Confirmar actuación',exact:true}).click();await signer.waitForLoadState('networkidle');
    await screenshot(signer,curia?'curia_firmado':'ordinario_firmado',{role:curia?'canciller':'parroco'});
    await admin.goto(url+'/verificar/'+cert.codigo_verificacion);await screenshot(admin,curia?'verificacion_curia':'verificacion',{role:'publico'});
    await signer.getByRole('row').filter({hasText:cert.numero}).getByRole('button',{name:'Anular',exact:true}).click();
    await screenshot(signer,curia?'curia_anular':'ordinario_anular',{role:curia?'canciller':'parroco'});
    await signer.locator('[name=motivo_actuacion]').fill('Anulación ficticia del ejemplo');await signer.getByRole('button',{name:'Confirmar actuación',exact:true}).click();await signer.waitForLoadState('networkidle');
  }
  await fs.writeFile(path.join(out,'capturas.json'),JSON.stringify(manifest,null,2));
  await fs.writeFile(path.join(out,'navegador.json'),JSON.stringify({browser:browser.version(),screenshots:manifest.length,roles:accounts.length,modules:routes.length+1,errors,source:'Aplicación instalada: Python embebido + frontend compilado + PostgreSQL 18.3 sintético'},null,2));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(JSON.stringify({capturas:manifest.length,roles:accounts.length,errores:errors.length}));
}finally{await browser.close();}
