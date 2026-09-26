import { DEFAULT_SETTINGS, EXPLANATIONS, type EntityType, type PiiEvent, type Settings, type Site } from '@promptshield/engine';
export const types=Object.keys(EXPLANATIONS).filter(t=>!['HEALTH','FINANCE','LEGAL'].includes(t)) as EntityType[];
export const sites:Site[]=['chatgpt','claude','gemini'];
export const siteNames={chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini'};
export const colors={high:'#E24B4A',medium:'#EF9F27',low:'#7B8582'};
export const severity=(type:EntityType)=>['SSN','CREDIT_CARD','BANK','API_KEY','PASSWORD','ADDRESS','USER_TERM'].includes(type)?'high':['PERSON','EMAIL','PHONE','DATE_OF_BIRTH'].includes(type)?'medium':'low';
export function formatRelativeTime(ts:number,now=Date.now()){const minutes=Math.max(0,Math.floor((now-ts)/60000));return minutes<1?'Just now':minutes<60?`${minutes} min ago`:minutes<1440?`${Math.floor(minutes/60)} hr ago`:`${Math.floor(minutes/1440)} day${minutes<2880?'':'s'} ago`;}
const strings=(v:unknown):string[]=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string').map(x=>x.trim()).filter(Boolean))]:[];
export const splitTerms=(v:string)=>strings(v.split(','));
export function normalizeSettings(value:unknown):Settings {
 const base=structuredClone(DEFAULT_SETTINGS);if(!value||typeof value!=='object')return base;
 const v=value as Partial<Settings>;const terms=v.userTerms;
 return {userTerms:{names:strings(terms?.names),emails:strings(terms?.emails),phones:strings(terms?.phones),addresses:strings(terms?.addresses),custom:strings(terms?.custom)},allowlist:strings(v.allowlist),enabledTypes:Array.isArray(v.enabledTypes)?types.filter(t=>v.enabledTypes!.includes(t)):base.enabledTypes,sites:Array.isArray(v.sites)?sites.filter(s=>v.sites!.includes(s)):base.sites};
}
export function normalizeEvents(value:unknown):PiiEvent[]{
 if(!Array.isArray(value))return [];
 return value.filter(e=>e&&types.includes(e.type)&&sites.includes(e.site)&&['paste','file','typed'].includes(e.source)&&['renamed','as_is','allowlisted'].includes(e.action)&&Number.isFinite(e.ts)&&e.ts>=0).slice(-5000).map(e=>({type:e.type,site:e.site,source:e.source,action:e.action,ts:e.ts}));
}
export function siteFromUrl(url:string|undefined):Site|null{try{const u=new URL(url!);if(u.protocol!=='https:')return null;return u.hostname==='chatgpt.com'?'chatgpt':u.hostname==='claude.ai'?'claude':u.hostname==='gemini.google.com'?'gemini':null;}catch{return null;}}
export function sampleEvents(now=Date.now()):PiiEvent[]{return Array.from({length:60},(_,i)=>({type:types[i%types.length]!,site:sites[i%3]!,source:(['paste','file','typed'] as const)[Math.floor(i/3)%3]!,action:(['renamed','renamed','as_is','allowlisted'] as const)[i%4]!,ts:now-(59-i)*8*3600000}));}
const websiteUrl=(path:string)=>{try{const u=new URL(import.meta.env.VITE_WEB_ORIGIN||import.meta.env.VITE_WEBSITE_URL||'https://www.mindyourprompt.us');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.hostname==='localhost'))return null;return new URL(path,u).href;}catch{return null;}};
export const scanUrl=websiteUrl('/scan');
export const dashboardUrl=websiteUrl('/dashboard');
export const guardsReady=import.meta.env.VITE_GUARDS_READY==='true';
