import { loadEnvFile } from 'node:process';
import { writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { toolIds, ToolSafetySchema, UNKNOWN } from './contracts';
import { generateToolSafety } from './toolSafety';
// Run via `npm run prewarm -w apps/web`, so the working directory is apps/web.
// This workspace compiles .ts as CommonJS: no top-level await or import.meta.
const WEB = process.cwd();
try{loadEnvFile(resolve(WEB,'.env.local'));}catch{}
async function main(){
 let failures=0;
 for(const tool of toolIds){
  try {
   const answer=ToolSafetySchema.parse(await generateToolSafety(tool));
   if(answer.answers.some(a=>a.answer.startsWith('SAMPLE')||(a.answer!==UNKNOWN&&!a.citations.length))||!answer.answers.some(a=>a.citations.length))throw new Error('No grounded answers');
   const target=resolve(WEB,`../../fixtures/tool-safety/${tool}.json`);
   await writeFile(target+'.tmp',JSON.stringify({...answer,source:'fallback'},null,2)+'\n');
   await rename(target+'.tmp',target);
   console.log(`${tool}: saved cited fallback`);
  }catch{failures++;console.error(`${tool}: prewarm failed; existing fixture preserved`);}
 }
 if(failures)process.exitCode=1;
}
void main();
