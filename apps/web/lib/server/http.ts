import 'server-only';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { ToolIdSchema } from './contracts';
import { getToolSafety } from './service';
export function createHandlers(service=getToolSafety,now=Date.now,env:NodeJS.ProcessEnv=process.env) {
 const buckets=new Map<string,{count:number;expires:number}>();
 function cors(request:Request) {
  const headers=new Headers({'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'});
  const origin=request.headers.get('origin');
  const allowed=!origin||origin===(env.WEB_ORIGIN||'http://localhost:3000')||/^chrome-extension:\/\/[a-p]{32}$/.test(origin);
  if(origin&&allowed)headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Access-Control-Allow-Methods','GET, OPTIONS');
  return {headers,allowed};
 }
 return {
  async GET(request:Request) {
   const {headers,allowed}=cors(request);
   if(!allowed)return Response.json({error:'Origin not allowed'},{status:403,headers});
   const params=new URL(request.url).searchParams;
   const tool=ToolIdSchema.safeParse(params.get('tool'));
   if(!tool.success||params.getAll('tool').length!==1||[...params.keys()].some(k=>k!=='tool'))return Response.json({error:'Provide one supported tool identifier only'},{status:400,headers});
   // Only trust a forwarding header when deployment explicitly guarantees it is overwritten.
   const raw=env.TRUST_PROXY==='true'?(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??''):'';
   const key=isIP(raw)?createHash('sha256').update(raw).digest('hex'):'shared';
   for(const [k,v]of buckets)if(v.expires<=now())buckets.delete(k);
   if(!buckets.has(key)&&buckets.size>=10000)return Response.json({error:'Rate limit capacity reached'},{status:429,headers});
   const bucket=buckets.get(key)??{count:0,expires:now()+60_000};bucket.count++;buckets.set(key,bucket);
   if(bucket.count>60){headers.set('Retry-After',String(Math.max(1,Math.ceil((bucket.expires-now())/1000))));return Response.json({error:'Too many requests'},{status:429,headers});}
   try{return Response.json(await service(tool.data),{headers});}
   catch{return Response.json({error:'Tool-safety answers are unavailable'},{status:503,headers});}
  },
  async OPTIONS(request:Request) {const {headers,allowed}=cors(request);return new Response(null,{status:allowed?204:403,headers});}
 };
}
