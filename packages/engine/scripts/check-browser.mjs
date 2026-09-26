import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { resolve, extname, join, sep } from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve('.cache/browser-smoke'); await mkdir(dir,{recursive:true});
await build({entryPoints:{worker:'scripts/browser-worker.ts',offscreen:'scripts/browser-offscreen.ts'},outdir:dir,bundle:true,platform:'browser',format:'esm',splitting:true});
await cp('node_modules/@huggingface/transformers/dist',join(dir,'wasm'),{recursive:true});
await writeFile(join(dir,'index.html'),'<!doctype html><title>Engine smoke test</title>');
await writeFile(join(dir,'offscreen.html'),'<!doctype html><script type="module" src="offscreen.js"></script>');
await writeFile(join(dir,'background.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
const requests=[];
const server=createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const root=path.startsWith('/models/')?resolve('.cache/models'):path.startsWith('/fixtures/')?resolve('tests/fixtures'):dir;
    const relative=path.replace(/^\/(?:models\/|fixtures\/)?/,'') || 'index.html';
    const file=resolve(root,relative); if(!file.startsWith(root+sep)) throw Error('invalid path');
    res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
    res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.html':'text/html'})[extname(file)]??'application/octet-stream');
    requests.push({method:req.method,path}); res.end(await readFile(file));
  } catch {res.statusCode=404;res.end('not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`;
await writeFile(join(dir,'manifest.json'),JSON.stringify({manifest_version:3,name:'PromptShield Engine Smoke Test',version:'0.1.0',permissions:['offscreen'],host_permissions:[`${base}*`],background:{service_worker:'background.js'},content_security_policy:{extension_pages:`script-src 'self' 'wasm-unsafe-eval' ${base}; object-src 'self'; connect-src 'self' ${base}`}}));
let context;
try {
  context=await chromium.launchPersistentContext(join(dir,'profile'),{channel:'msedge',headless:true,args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  const page=await context.newPage(); await page.goto(base);
  const workerResult=await page.evaluate(base=>new Promise((resolve,reject)=>{
    const worker=new Worker('/worker.js',{type:'module'});
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('Worker smoke test timed out'));},120000);
    worker.onmessage=e=>{if(typeof e.data?.ok !== 'boolean') return;clearTimeout(timer);worker.terminate();resolve(e.data);};
    worker.onerror=e=>{clearTimeout(timer);reject(e.message);};worker.postMessage(base);
  }),base);
  function verify(r) {
    assert.equal(r.ok,true,r.error);
    assert.deepEqual(r.result.detection.findings.map(f=>f.value),['Priya','Rahul','Sarah','Miami']);
    assert.deepEqual(r.result.files.map(f=>f.result.status),['ok','empty','ok']);
  }
  verify(workerResult); console.log('Browser Web Worker: real NER + PDF/DOCX passed');
  const sw=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:15000});
  const offscreenResult=await sw.evaluate(async(base)=>{
    await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['WORKERS'],justification:'Verify local engine inference and file parsers'});
    await new Promise(r=>setTimeout(r,2000));
    return await chrome.runtime.sendMessage({type:'run',base});
  },base);
  verify(offscreenResult); console.log('MV3 offscreen document: real NER + PDF/DOCX passed');
  assert(requests.every(r=>r.method==='GET' && !r.path.includes('?')));
  await mkdir('test-results',{recursive:true});
  await writeFile('test-results/browser-smoke.json',JSON.stringify({workerResult,offscreenResult,requests},null,2));
} finally {await context?.close(); await new Promise(r=>server.close(r));}
