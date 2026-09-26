import 'server-only';
import type { ToolId } from '@promptshield/engine';
import type { ToolSafety } from './contracts';
import { generateToolSafety } from './toolSafety';
import { fallbackFor } from './fallbacks';
export function createToolSafetyService(generate=generateToolSafety, fallback=fallbackFor, now=Date.now) {
 const cache=new Map<ToolId,{value:ToolSafety;expires:number}>();
 const inflight=new Map<ToolId,Promise<ToolSafety>>();
 const failures=new Map<ToolId,number>();
 return async (tool:ToolId):Promise<ToolSafety>=>{
  const hit=cache.get(tool);
  if(hit&&hit.expires>now())return {...hit.value,source:'cache'};
  if((failures.get(tool)??0)>now())return fallback(tool);
  const existing=inflight.get(tool);if(existing)return existing;
  const promise=(async()=>{
   try {
    const value=await generate(tool);
    cache.set(tool,{value,expires:now()+86_400_000});failures.delete(tool);
    return {...value,source:'snowflake' as const};
   }catch{
    failures.set(tool,now()+60_000);
    // Fallbacks never enter the successful-generation cache.
    return fallback(tool);
   }
  })();
  inflight.set(tool,promise);
  try{return await promise;}finally{inflight.delete(tool);}
 };
}
export const getToolSafety=createToolSafetyService();
