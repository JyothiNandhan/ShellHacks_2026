import { EXPLANATIONS,redactText,type Finding } from '@promptshield/engine';
import * as sharedApi from '../api';
export type FileGateApi=Pick<typeof sharedApi,'getAdapter'|'getMapper'|'saveMapper'|'detectWithTimeout'|'splitForPrompt'|'openGate'|'approve'|'logEvents'|'extractFile'>;
export interface FileGateOptions {
 isChatTarget?:(target:Element)=>boolean;
 // Person 2 supplies these through the site's adapter once its interface is ready.
 insertText?:(text:string)=>void|Promise<void>;
 attachmentAccepted?:(files:File[])=>Promise<boolean>;
 notify?:(message:string)=>void;
}
export interface PreparedFile {file:File;redactedText?:string;commit:()=>Promise<void>;}
export async function prepareFile(file:File,api:FileGateApi):Promise<PreparedFile|null>{
 let extracted;
 try{extracted=await api.extractFile(file);}catch{extracted={status:'error' as const,reason:'Local file reading failed.'};}
 const cannotCheck=async(reason:string):Promise<PreparedFile|null>=>{
  const choice=await api.openGate({mode:'cant_check',title:"Can't check this file",fileName:file.name,reason,items:[],topics:[]});
  return choice==='secondary'?{file,commit:async()=>{}}:null;
 };
 if(extracted.status!=='ok')return cannotCheck(extracted.reason);
 let result;
 try{result=await api.detectWithTimeout(extracted.text);}catch{return cannotCheck('Local scanning failed. This file has not been checked.');}
 const {toAsk,allowlisted}=await api.splitForPrompt(result);
 const allowed=async()=>{if(allowlisted.length)await api.logEvents(allowlisted,'file','allowlisted');};
 if(!toAsk.length)return {file,commit:allowed};
 const mapper=await api.getMapper();
 const choice=await api.openGate({mode:'file',title:`${file.name} contains ${toAsk.length} items`,fileName:file.name,items:toAsk.map(f=>({label:EXPLANATIONS[f.type].label,value:f.value,why:EXPLANATIONS[f.type].why,placeholder:mapper.placeholderFor(f)})),topics:result.topics.map(t=>({label:EXPLANATIONS[t.topic].label,snippet:t.sentence,why:EXPLANATIONS[t.topic].why}))});
 if(choice==='cancel')return null;
 if(choice==='primary'){
  const redactedText=redactText(extracted.text,toAsk,mapper);
  const base=file.name.replace(/\.[^.]+$/,'')||'file';
  return {file:new File([redactedText],`${base}-redacted.txt`,{type:'text/plain'}),redactedText,commit:async()=>{await api.saveMapper(mapper);await allowed();await api.logEvents(toAsk,'file','renamed');}};
 }
 return {file,commit:async()=>{await api.approve(toAsk);await allowed();await api.logEvents(toAsk,'file','as_is');}};
}
const initialized=new WeakMap<Window,()=>void>();
export function createFileGate(api:FileGateApi,options:FileGateOptions={},win:Window=window):()=>void{
 const replay=new WeakSet<Event>();const busyInputs=new WeakSet<HTMLInputElement>();let queue=Promise.resolve();let disposed=false;
 // Retries apply only to the explicitly approved files, never all uploads on a timer.
 const retry=new Map<string,number>();const key=(f:File)=>`${f.name}|${f.size}|${f.lastModified}|${f.type}`;
 const notify=options.notify??((message:string)=>win.alert(message));
 const chatTarget=options.isChatTarget??((el:Element)=>!!el.closest('[data-promptshield-chat-area]')||!!el.closest('form')?.querySelector('textarea,[contenteditable="true"],#prompt-textarea'));
 function intercept(e:Event){
  if(disposed||replay.has(e)||!api.getAdapter())return;
  const input=e.target instanceof HTMLInputElement&&e.target.type==='file'?e.target:null;
  if(input&&busyInputs.has(input)){e.preventDefault();e.stopImmediatePropagation();return;}
  const target=e.target instanceof Element?e.target:null;
  const drop=e.type==='drop'?(e as DragEvent):null;
  if(drop&&(!target||!chatTarget(target)))return;
  const files=Array.from(input?.files??drop?.dataTransfer?.files??[]);if(!files.length)return;
  for(const [k,expiry]of retry)if(expiry<Date.now())retry.delete(k);
  if(files.every(f=>(retry.get(key(f))??0)>Date.now())){for(const f of files)retry.delete(key(f));return;}
  e.preventDefault();e.stopImmediatePropagation();
  // Input fires before change on many sites. Clear the original FileList now.
  if(input){busyInputs.add(input);input.value='';}
  queue=queue.then(async()=>{
   try{
    if(disposed||!api.getAdapter())return;
    const prepared:PreparedFile[]=[];
    for(const file of files){const item=await prepareFile(file,api);if(item)prepared.push(item);}
    if(!prepared.length||disposed||!api.getAdapter())return;
    const transfer=new DataTransfer();for(const p of prepared)transfer.items.add(p.file);
    if(input){
     input.files=transfer.files;
     for(const name of ['input','change']){const event=new Event(name,{bubbles:true,composed:true});replay.add(event);input.dispatchEvent(event);}
    }else if(target){const event=new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true,composed:true});replay.add(event);target.dispatchEvent(event);}
    // Synthetic replay acceptance is site-specific; Person 2 can supply verification.
    if(options.attachmentAccepted&&!await options.attachmentAccepted(prepared.map(p=>p.file))){
     const redacted=prepared.filter(p=>p.redactedText!==undefined);
     if(redacted.length&&options.insertText){await options.insertText(redacted.map(p=>p.redactedText).join('\n\n'));notify('Attached as text because this site blocked the file swap');for(const p of redacted)await p.commit();}
     else if(redacted.length)notify('This site blocked the file swap. Nothing was uploaded; the text-insertion adapter is not connected.');
     for(const p of prepared.filter(p=>p.redactedText===undefined))retry.set(key(p.file),Date.now()+10_000);
     if(prepared.some(p=>p.redactedText===undefined))notify('Please attach the approved original file again within 10 seconds.');
     return;
    }
    for(const p of prepared)await p.commit();
   }catch{notify('PromptShield could not finish checking this upload. Please try attaching the file again.');}
   // Release after the current task: the pick's native change event may not have fired yet.
   finally{if(input)win.setTimeout(()=>busyInputs.delete(input),0);}
  });
 }
 win.addEventListener('input',intercept,true);win.addEventListener('change',intercept,true);win.addEventListener('drop',intercept,true);
 return()=>{disposed=true;win.removeEventListener('input',intercept,true);win.removeEventListener('change',intercept,true);win.removeEventListener('drop',intercept,true);retry.clear();};
}
export function initFileGate(options:FileGateOptions={}):void{
 if(initialized.has(window))return;initialized.set(window,createFileGate(sharedApi,options));
}
