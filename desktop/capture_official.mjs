import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'.test-runtime/node_modules/_resolver.cjs'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto('https://www.postgresql.org/download/windows/',{waitUntil:'networkidle'});
  await page.screenshot({path:path.join(root,'.test-artifacts/distribution/evidence/capturas/postgresql_descarga.png'),fullPage:true});
  console.log('Capturado sitio oficial PostgreSQL para Windows');
}finally{await browser.close();}
