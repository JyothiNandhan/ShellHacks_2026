// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/c/test"}
import { it,expect,vi,beforeAll,beforeEach } from 'vitest';
import { detectFast,PlaceholderMapper } from '@promptshield/engine';
import { createFileGate,type FileGateApi } from '../apps/extension/src/guards/fileGate';
class FakeTransfer{items={list:[] as File[],add(f:File){this.list.push(f);}};get files(){return this.items.list;}}
beforeAll(()=>{Object.assign(globalThis,{DataTransfer:FakeTransfer});});
beforeEach(()=>{document.body.innerHTML='<form><textarea id="prompt-textarea"></textarea><input type="file"></form>';});
function api(choice:'primary'|'secondary'|'cancel'):FileGateApi{return {getAdapter:()=>({id:'chatgpt',editor:'#prompt-textarea'}) as never,getMapper:vi.fn().mockResolvedValue(new PlaceholderMapper()),saveMapper:vi.fn(),detectWithTimeout:vi.fn(async text=>detectFast(text)),splitForPrompt:vi.fn(async r=>({toAsk:r.findings,allowlisted:[]})),openGate:vi.fn().mockResolvedValue(choice),approve:vi.fn(),logEvents:vi.fn(),extractFile:vi.fn(async()=>({status:'ok' as const,text:'demo@example.com'}))};}
function fileEvent(type:'paste'|'drop',files:File[],text=''){const e=new Event(type,{bubbles:true,cancelable:true});const data={files,getData:()=>text};Object.defineProperty(e,type==='paste'?'clipboardData':'dataTransfer',{value:data});return e;}
const settle=()=>new Promise(r=>setTimeout(r,50));
it('stops a pasted file before the site sees it and asks first',async()=>{const a=api('cancel');const dispose=createFileGate(a,{notify:()=>{}});const seen=vi.fn();document.body.addEventListener('paste',seen);const e=fileEvent('paste',[new File(['demo@example.com'],'resume.txt')]);document.body.dispatchEvent(e);await settle();expect(e.defaultPrevented).toBe(true);expect(seen).not.toHaveBeenCalled();expect(a.openGate).toHaveBeenCalledWith(expect.objectContaining({mode:'file'}));dispose();});
it('leaves text-only pastes to the paste gate',async()=>{const a=api('cancel');const dispose=createFileGate(a,{notify:()=>{}});const e=fileEvent('paste',[],'some text');document.body.dispatchEvent(e);await settle();expect(e.defaultPrevented).toBe(false);expect(a.extractFile).not.toHaveBeenCalled();dispose();});
it('mixed clipboard text and a file still gates the file before page handlers',async()=>{const a=api('cancel');const dispose=createFileGate(a,{notify:()=>{}});const e=fileEvent('paste',[new File(['x'],'x.png')],'some text');document.body.dispatchEvent(e);await settle();expect(e.defaultPrevented).toBe(true);expect(a.extractFile).toHaveBeenCalled();dispose();});
it('checks files dropped anywhere on the page, not only on the composer',async()=>{const a=api('cancel');const dispose=createFileGate(a,{notify:()=>{}});const e=fileEvent('drop',[new File(['demo@example.com'],'resume.txt')]);document.body.dispatchEvent(e);await settle();expect(e.defaultPrevented).toBe(true);expect(a.openGate).toHaveBeenCalled();dispose();});
