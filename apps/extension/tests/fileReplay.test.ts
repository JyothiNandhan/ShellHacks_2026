import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detectFast, PlaceholderMapper } from '@promptshield/engine';
import { createFileGate, type FileGateApi } from '../src/guards/fileGate';
import { submitChecked } from '../src/submission';
vi.mock('../src/api', () => ({ getAdapter:()=>({id:'chatgpt',editor:'#prompt-textarea',fileInput:'input[type=file]'}) }));
vi.mock('../src/submission', () => ({ submitChecked:vi.fn().mockResolvedValue(true), rememberAttachments:vi.fn(), disclosureEvents:()=>[] }));
class Transfer { files:File[]=[]; items={add:(file:File)=>this.files.push(file)}; }
class Drag extends Event { dataTransfer:unknown; constructor(type:string,opts:DragEventInit){super(type,opts);this.dataTransfer=opts.dataTransfer;} }
let dispose=()=>{};
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('DataTransfer',Transfer);vi.stubGlobal('DragEvent',Drag);document.body.innerHTML='<form><textarea id="prompt-textarea"></textarea><input type="file"><div id="drop-overlay"></div></form>';});
afterEach(()=>{dispose();vi.unstubAllGlobals();});
function client():FileGateApi{return {getAdapter:()=>({id:'chatgpt',editor:'#prompt-textarea',fileInput:'input[type=file]'}) as never,getMapper:async()=>new PlaceholderMapper(),saveMapper:vi.fn(),detectWithTimeout:async text=>detectFast(text),splitForPrompt:async result=>({toAsk:result.findings,allowlisted:[]}),openGate:vi.fn().mockResolvedValue('secondary'),approve:vi.fn(),logEvents:vi.fn(),extractFile:async()=>({status:'ok',text:'test@example.com'})};}
it('Send as is replays a dropped file through the composer and clears drag state',async()=>{
 const file=new File(['original bytes'],'resume.pdf',{type:'application/pdf'}), dt=new Transfer();dt.items.add(file);
 const editor=document.querySelector('textarea')!, overlay=document.querySelector('#drop-overlay')!;
 const drops:Event[]=[];editor.addEventListener('drop',e=>drops.push(e));
 const leave=vi.fn();overlay.addEventListener('dragleave',leave);
 dispose=createFileGate(client(),{attachmentAccepted:async()=>true,notify:vi.fn()});
 overlay.dispatchEvent(new Drag('drop',{bubbles:true,cancelable:true,dataTransfer:dt as unknown as DataTransfer}));
 await vi.waitFor(()=>expect(submitChecked).toHaveBeenCalledOnce());
 expect(leave).toHaveBeenCalledOnce();expect(drops).toHaveLength(1);
 expect((drops[0] as DragEvent).dataTransfer!.files[0]).toBe(file);
});
it('file picker replays change once without a duplicate input event',async()=>{
 const file=new File(['original bytes'],'resume.pdf');const input=document.querySelector('input')!;
 let files:File[]=[file];Object.defineProperty(input,'files',{configurable:true,get:()=>files,set:v=>files=v});
 const seen:Event[]=[];input.addEventListener('input',e=>seen.push(e));input.addEventListener('change',e=>seen.push(e));
 dispose=createFileGate(client(),{attachmentAccepted:async()=>true,notify:vi.fn()});
 input.dispatchEvent(new Event('change',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(submitChecked).toHaveBeenCalledOnce());
 expect(seen.map(e=>e.type)).toEqual(['change']);expect(files[0]).toBe(file);
});
