import 'server-only';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { ToolId } from '@promptshield/engine';
export const ExcerptSchema = z.object({ CHUNK_TEXT:z.string().min(1).max(16000), SOURCE_URL:z.url().refine(v=>new URL(v).protocol==='https:'), SOURCE_TITLE:z.string() });
export type Excerpt = z.infer<typeof ExcerptSchema>;
export class SnowflakeError extends Error {
 constructor(readonly category: 'configuration'|'authentication'|'network_policy'|'timeout'|'upstream'|'response') { super(`Snowflake ${category}`); }
}
export function createSnowflakeClient(fetcher: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env) {
 let account: URL;
 try { account = new URL(env.SNOWFLAKE_ACCOUNT_URL ?? ''); } catch { throw new SnowflakeError('configuration'); }
 if (account.protocol!=='https:' || !account.hostname.endsWith('.snowflakecomputing.com') || account.username || account.password || account.port || account.pathname!=='/' || account.search || account.hash || !env.SNOWFLAKE_PAT || env.SNOWFLAKE_PAT==='PASTE_YOUR_TOKEN_HERE') throw new SnowflakeError('configuration');
 const headers = { Authorization:`Bearer ${env.SNOWFLAKE_PAT}`, 'X-Snowflake-Authorization-Token-Type':'PROGRAMMATIC_ACCESS_TOKEN','Content-Type':'application/json',Accept:'application/json' };
 async function request(path: string, body: unknown, signal: AbortSignal) {
  for (let attempt=0;attempt<2;attempt++) {
   try {
    const res=await fetcher(new URL(path,account),{method:body===undefined?'GET':'POST',headers,redirect:'error',signal,...(body===undefined?{}:{body:JSON.stringify(body)})});
    if ((res.status===429 || res.status>=500) && attempt===0) { await delay(250,undefined,{signal}); continue; }
    if (!res.ok) {
     if (res.status===401 || res.status===403) {
      const detail=await res.json().catch(()=>({}));
      throw new SnowflakeError(/network|ip address/i.test(String(detail.message))?'network_policy':'authentication');
     }
     throw new SnowflakeError('upstream');
    }
    return {status:res.status,body:await res.json()};
   } catch (error) {
    if (signal.aborted) throw new SnowflakeError('timeout');
    if (error instanceof SnowflakeError) throw error;
    if (attempt===1) throw new SnowflakeError('upstream');
   }
  }
  throw new SnowflakeError('upstream');
 }
 return {
  async search(tool:ToolId,query:string):Promise<Excerpt[]> {
   const {body}=await request('/api/v2/databases/PROMPTSHIELD/schemas/KB/cortex-search-services/POLICY_SEARCH:query',{query,columns:['CHUNK_TEXT','SOURCE_URL','SOURCE_TITLE'],filter:{'@eq':{TOOL_ID:tool}},limit:4},AbortSignal.timeout(20_000));
   return z.object({results:z.array(ExcerptSchema).max(4)}).parse(body).results;
  },
  async complete(prompt:string):Promise<string> {
   const signal=AbortSignal.timeout(20_000);
   // A stable request ID prevents duplicate SQL execution on the one retry.
   const id=randomUUID();
   let result=await request(`/api/v2/statements?requestId=${id}&retry=true`,{statement:'SELECT AI_COMPLETE(?, ?)',timeout:20,warehouse:env.SNOWFLAKE_WAREHOUSE||'PS_WH',role:env.SNOWFLAKE_ROLE||'PROMPTSHIELD_APP',bindings:{'1':{type:'TEXT',value:env.SNOWFLAKE_MODEL||'claude-sonnet-4-5'},'2':{type:'TEXT',value:prompt}}},signal);
   while(result.status===202) {
    const handle=result.body?.statementHandle;
    if(typeof handle!=='string'||!/^[a-zA-Z0-9-]+$/.test(handle)) throw new SnowflakeError('response');
    await delay(250,undefined,{signal});
    result=await request(`/api/v2/statements/${handle}`,undefined,signal);
   }
   let answer=result.body?.data?.[0]?.[0];
   // AI_COMPLETE returns a VARIANT, which the SQL API serializes as a JSON string literal.
   if(typeof answer==='string'&&answer.trimStart().startsWith('"')){try{answer=JSON.parse(answer);}catch{throw new SnowflakeError('response');}}
   if(typeof answer!=='string'||!answer.trim())throw new SnowflakeError('response');
   return answer;
  }
 };
}
export type SnowflakeClient = ReturnType<typeof createSnowflakeClient>;
