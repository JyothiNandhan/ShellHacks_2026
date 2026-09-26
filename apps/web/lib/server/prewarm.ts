import { loadEnvFile } from 'node:process';
import { writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { toolIds, ToolSafetySchema, UNKNOWN } from './contracts';
import { generateToolSafety } from './toolSafety';
try{loadEnvFile(fileURLToPath(new URL('../../.env.local',import.meta.url)));}catch{}
let failures=0;
for(const tool of toolIds){
 try {
  const answer=ToolSafetySchema.parse(await generateToolSafety(tool));
  if(answer.answers.some(a=>a.answer.startsWith('SAMPLE')||(a.answer!==UNKNOWN&&!a.citations.length))||!answer.answers.some(a=>a.citations.length))throw new Error('No grounded answers');
  const target=new URL(`../../../../fixtures/tool-safety/${tool}.json`,import.meta.url);
  const temp=fileURLToPath(target)+'.tmp';
  await writeFile(temp,JSON.stringify({...answer,source:'fallback'},null,2)+'\n');
  await rename(temp,target);
  console.log(`${tool}: saved cited fallback`);
 }catch{failures++;console.error(`${tool}: prewarm failed; existing fixture preserved`);}
}
if(failures)process.exitCode=1;
