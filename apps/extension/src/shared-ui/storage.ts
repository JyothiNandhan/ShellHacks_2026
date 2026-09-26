import type { Activity } from '../activity';
import { useEffect, useState } from 'react';
import { normalizeSettings,normalizeEvents } from './data';
export const preview=typeof chrome==='undefined'||!chrome.storage?.local;
const KEY='promptshield-development-preview';
export async function readLocal():Promise<Record<string,unknown>>{
 if(!preview){const data=await chrome.storage.local.get(['activity','sentEvents','sentPrompts','settings']);return {...data,events:data.sentEvents??[]};}
 if(!import.meta.env.DEV)throw new Error('Open this page inside the installed extension.');
 try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}
}
export async function writeLocal(value:Record<string,unknown>){
 if(!preview){const next={...value};if('events' in next){next.sentEvents=next.events;delete next.events;if(Array.isArray(next.sentEvents)&&!next.sentEvents.length){next.sentPrompts=0;next.sentIds=[];}}await chrome.storage.local.set(next);return;}
 if(!import.meta.env.DEV)throw new Error('Extension storage unavailable.');
 const data=await readLocal();localStorage.setItem(KEY,JSON.stringify({...data,...value}));window.dispatchEvent(new Event('ps-preview-change'));
}
export function useLocalData(){
 const [data,setData]=useState<Record<string,unknown>>({});const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let alive=true;let revision=0;
  const refresh=async()=>{const current=++revision;try{const value=await readLocal();if(alive&&current===revision){setData(value);setError('');}}catch{if(alive)setError('Could not read local data. Reopen the extension and try again.');}finally{if(alive)setLoading(false);}};
  const change=(_:unknown,area:string)=>{if(area==='local')void refresh();};const previewChange=()=>{void refresh();};void refresh();
  if(!preview)chrome.storage.onChanged.addListener(change);else window.addEventListener('ps-preview-change',previewChange);
  return()=>{alive=false;if(!preview)chrome.storage.onChanged.removeListener(change);else window.removeEventListener('ps-preview-change',previewChange);};
 },[]);
 return {activity:data.activity as Activity|undefined,sentPrompts:typeof data.sentPrompts==='number'?data.sentPrompts:0,events:normalizeEvents(data.events),settings:normalizeSettings(data.settings),loading,error};
}
export async function openSettings(){if(preview)location.href='/options.html';else await chrome.runtime.openOptionsPage();}
export async function openDashboard(){if(preview)location.href='/dashboard.html';else await chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')});}
export async function openExternal(url:string){if(preview)window.open(url,'_blank','noopener,noreferrer');else await chrome.tabs.create({url});}
