// Production MV3 integration test against synthetic ChatGPT/Claude/Gemini pages.
// No test prompts are sent to an AI service. Uses a fresh, disposable browser profile.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve('test-results/app'); await mkdir(output, { recursive: true });
const executablePath = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const extension = resolve('apps/extension/.output/chrome-mv3');
const expectEventually = async (read, expected) => { for (let i = 0; i < 80; i++) { const actual = await read(); if (JSON.stringify(actual) === JSON.stringify(expected)) return; await new Promise(r => setTimeout(r, 100)); } assert.deepEqual(await read(), expected); };
const regular = await chromium.launch({ executablePath, headless: true });
try { const page = await regular.newPage(); await page.goto('http://localhost:3000/dashboard'); await page.getByRole('heading', { name: 'Install the extension to get started.' }).waitFor(); assert.equal(await page.getByRole('button', { name: 'Reset everything' }).count(), 0); await page.screenshot({ path: `${output}/website-install.png`, fullPage: true }); } finally { await regular.close(); }
const context = await chromium.launchPersistentContext(`${output}/profile-${Date.now()}`, { executablePath, headless: true, viewport: { width: 1440, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
const errors = [];
await context.tracing.start({screenshots:true,snapshots:true});
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
const fixture = (site) => `<!doctype html><html><head><title>Synthetic ${site} chat</title><style>body{font:18px system-ui;padding:70px;background:#f5f5f5}form{width:700px}textarea,[contenteditable]{display:block;width:600px;min-height:100px;border:1px solid #ccc;background:white;padding:12px}button{padding:12px}#messages>div,user-query{display:block;padding:20px}</style></head><body><h1>Synthetic ${site} chat</h1><div id="messages"></div><form onsubmit="return false">${site === 'chatgpt' ? '<textarea id="prompt-textarea"></textarea>' : '<div contenteditable="true" class="ProseMirror ql-editor" data-placeholder="Message"></div>'}<input type="file" multiple><div id="attachments"></div><button type="button" data-testid="send-button" class="send-button" aria-label="Send message">Send</button></form><script>
const editor=document.querySelector('textarea,[contenteditable]'), attachments=document.querySelector('#attachments');window.sent=[];window.uploads=[];
document.querySelector('input').addEventListener('change',async e=>{window.uploads=await Promise.all([...e.target.files].map(async f=>({name:f.name,text:await f.text()})));attachments.textContent=window.uploads.map(f=>f.name).join(' ')});
function send(){const text=editor.value??editor.innerText;const bubble=document.createElement('${site === 'gemini' ? 'user-query' : 'div'}');bubble.setAttribute('${site === 'claude' ? 'data-testid' : 'data-message-author-role'}','${site === 'claude' ? 'user-message' : 'user'}');bubble.textContent=text+' '+attachments.textContent;document.querySelector('#messages').append(bubble);window.sent.push({text,files:window.uploads});if(editor.tagName==='TEXTAREA')editor.value='';else editor.innerText='';editor.dispatchEvent(new InputEvent('input',{bubbles:true}));attachments.textContent='';window.uploads=[];}
document.querySelector('button').addEventListener('click',send);editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.defaultPrevented){e.preventDefault();send()}});
</script></body></html>`;
try {
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 20000 });
  const id = new URL(sw.url()).host;
  const dashboard = await context.newPage(); await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
  const metrics = () => dashboard.locator('.tile-value').allTextContents();
  await expectEventually(metrics, ['0', '0', '0', '100']);
  const website = await context.newPage(); await website.goto('http://localhost:3000/dashboard'); await website.getByRole('button', { name: /Open my dashboard/ }).waitFor();
  await dashboard.screenshot({ path: `${output}/dashboard-empty.png`, fullPage: true });
  const history = JSON.stringify([{ id: 'import-chat', mapping: { a: { message: { id: 'a', author: { role: 'user' }, content: { parts: ['demo@example.com'] }, create_time: 1 } }, b: { message: { id: 'b', author: { role: 'assistant' }, content: { parts: ['never-count@example.com'] } } } } }]);
  const file = { name: 'conversations.json', mimeType: 'application/json', buffer: Buffer.from(history) };
  await dashboard.getByLabel('Import conversation JSON').setInputFiles(file);
  await expectEventually(metrics, ['1', '1', '1', '97']);
  await dashboard.getByLabel('Import conversation JSON').setInputFiles(file); await dashboard.getByText('This history is already counted.', { exact: false }).waitFor(); await expectEventually(metrics, ['1', '1', '1', '97']);
  dashboard.on('dialog', dialog => dialog.accept()); await dashboard.getByRole('button', { name: 'Reset everything' }).click(); await expectEventually(metrics, ['0', '0', '0', '100']);
  async function review(page, choice) {
    let frame;
    for (let i=0;i<100;i++) { frame=page.frames().find(f=>f.url().includes('/gate.html?')); if(frame) break; await page.waitForTimeout(100); }
    assert.ok(frame,'Review frame must appear');
    // Chromium can lose the click acknowledgement when the extension removes its
    // own cross-origin iframe during the click. Detachment is the expected result;
    // the caller separately checks composer contents, sends and persisted counts.
    try { await frame.getByRole('button',{name:choice,exact:true}).click({noWaitAfter:true,timeout:3000}); }
    catch(error) { if (!frame.isDetached()) throw error; }
    await expectEventually(()=>Promise.resolve(frame.isDetached()),true);
  }
  let conversations=0;
  for (const [site, url] of [['chatgpt','https://chatgpt.com/c/browser-test'],['claude','https://claude.ai/chat/browser-test'],['gemini','https://gemini.google.com/app/browser-test']]) {
    const page = await context.newPage(); await page.route('**/*', route => route.request().isNavigationRequest() && new URL(route.request().url()).origin === new URL(url).origin ? route.fulfill({ contentType: 'text/html', body: fixture(site) }) : route.continue()); await page.goto(url);
    const editor = page.locator('textarea,[contenteditable]'); await editor.fill('type@example.com');
    await page.waitForTimeout(700); await expectEventually(metrics, [String(conversations),'0','0','100']);
    await page.screenshot({path:`${output}/${site}-typing.png`,fullPage:true});
    await page.getByRole('button',{name:'Send message',exact:true}).click(); await review(page,'Replace and send');
    await expectEventually(()=>page.evaluate(()=>window.sent.length),1); assert.ok(!(await page.evaluate(()=>window.sent[0].text)).includes('type@example.com'));
    conversations++; await expectEventually(metrics,[String(conversations),'0','0','100']);
    // Paste is held outside the composer until the review choice; cancellation leaves no data.
    await editor.focus(); await editor.evaluate(el=>{const dt=new DataTransfer();dt.setData('text/plain','paste@example.com');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));});
    await page.waitForTimeout(200); assert.equal(await editor.evaluate(el=>el.value??el.innerText),'');
    await review(page,'Cancel'); assert.equal(await editor.evaluate(el=>el.value??el.innerText),'');
    await editor.focus(); await editor.evaluate(el=>{const dt=new DataTransfer();dt.setData('text/plain','paste@example.com');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));});
    await review(page,'Replace and send'); await expectEventually(()=>page.evaluate(()=>window.sent.length),2);
    assert.equal(await page.evaluate(()=>window.sent[1].text),'person_2@example.com');
    // File content is intercepted before the host's change listener receives it.
    await page.locator('input[type=file]').setInputFiles({name:'example.txt',mimeType:'text/plain',buffer:Buffer.from('file@example.com')});
    assert.deepEqual(await page.evaluate(()=>window.uploads),[]); await review(page,'Replace and send');
    await expectEventually(()=>page.evaluate(()=>window.sent.length),3);
    const sentFile=await page.evaluate(()=>window.sent[2].files[0]); assert.equal(sentFile.name,'example-redacted.txt'); assert.ok(!sentFile.text.includes('file@example.com'));
    await expectEventually(metrics,[String(conversations),'0','0','100']);
    // Drag-and-drop and clipboard files use the same before-insertion gate.
    for (const kind of ['drop','paste']) {
      await editor.focus();
      await editor.evaluate((el, kind)=>{const dt=new DataTransfer();dt.items.add(new File(['drop@example.com'],'dropped.txt',{type:'text/plain'}));el.dispatchEvent(kind==='drop'?new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}):new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));},kind);
      await page.waitForTimeout(100); assert.deepEqual(await page.evaluate(()=>window.uploads),[]);
      await review(page,'Replace and send');
      await expectEventually(()=>page.evaluate(()=>window.sent.length),kind==='drop'?4:5);
      const attachment=await page.evaluate(()=>window.sent.at(-1).files[0]); assert.ok(!attachment.text.includes('drop@example.com'));
    }
    await editor.fill('hello world'); await page.getByRole('button',{name:'Send message',exact:true}).click(); await review(page,'Send as is'); await expectEventually(()=>page.evaluate(()=>window.sent.length),6);
    await expectEventually(metrics,[String(conversations),'0','0','100']);
    await page.screenshot({path:`${output}/${site}-guard.png`,fullPage:true}); await page.close();
  }
  // Only an actual original disclosure decreases the score.
  const page = await context.newPage(); const url='https://chatgpt.com/c/disclosure-test'; await page.route(url,r=>r.fulfill({contentType:'text/html',body:fixture('chatgpt')})); await page.goto(url);
  await page.locator('textarea').fill('original@example.com'); await page.getByRole('button',{name:'Send message',exact:true}).click(); await review(page,'Send as is'); await expectEventually(metrics,['4','1','1','97']);
  await page.locator('input[type=file]').setInputFiles({name:'original.txt',mimeType:'text/plain',buffer:Buffer.from('unchanged@example.com')});
  assert.deepEqual(await page.evaluate(()=>window.uploads),[]); await review(page,'Send as is'); await expectEventually(metrics,['4','2','1','94']);
  assert.equal(await page.evaluate(()=>window.sent.at(-1).files[0].text),'unchanged@example.com');
  await page.locator('textarea').focus(); await page.locator('textarea').evaluate(el=>{const dt=new DataTransfer();dt.setData('text/plain','paste-original@example.com');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));});
  assert.equal(await page.locator('textarea').inputValue(),''); await review(page,'Send as is'); await expectEventually(metrics,['4','3','1','91']);
  assert.equal(await page.evaluate(()=>window.sent.at(-1).text),'paste-original@example.com');
  // API integration uses the real local server: an invalid token must be visibly unavailable.
  await dashboard.getByLabel('Your question').fill('How can I delete my conversations?'); await dashboard.getByRole('button',{name:'Ask a privacy question'}).click(); await dashboard.locator('.answer').waitFor({timeout:65000});
  assert.match(await dashboard.locator('.answer').innerText(), /Snowflake|unavailable/);
  await dashboard.screenshot({path:`${output}/dashboard-active.png`,fullPage:true});
  await dashboard.setViewportSize({width:480,height:950}); assert.ok(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); await dashboard.screenshot({path:`${output}/dashboard-mobile.png`,fullPage:true});
  const model = await sw.evaluate(async () => {
    const settings = {...(await chrome.storage.local.get('settings')).settings,enabledTypes:['PERSON','LOCATION','ORGANIZATION']};
    const reply = await chrome.runtime.sendMessage({target:'offscreen',type:'DETECT_FULL',text:'Barack Obama works at Microsoft in Seattle.',opts:settings});
    return {ok:reply?.ok, types:reply?.value?.findings?.map(f=>f.type), neural:reply?.value?.findings?.filter(f=>f.source==='ner').map(f=>f.type)};
  });
  console.log('On-device model result:',JSON.stringify(model));
  assert.equal(model.ok,true,'The real offscreen model must run successfully');
  assert.ok(model.types.includes('PERSON') && model.neural.includes('LOCATION'),'NER must identify a location beyond the quick rules');
  assert.deepEqual(errors,[]);
  console.log('PASS: install gating, initial/reset counters, import/dedup, typing/send, paste/cancel, file interception/replacement, actual-send disclosure counts across three site fixtures, and real API response.');
} catch (error) {
  for (const [index,page] of context.pages().entries()) {
    console.log('Diagnostic page:',page.url());
    await page.screenshot({path:`${output}/failure-${index}.png`,fullPage:true}).catch(()=>{});
    for (const frame of page.frames().filter(f=>f.url().includes('gate.html'))) console.log('Review state:',await frame.locator('body').innerText().catch(()=> 'Frame closed'));
  }
  throw error;
} finally { await context.tracing.stop({path:`${output}/trace.zip`}).catch(()=>{}); await context.close(); }
