import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { env } from '@huggingface/transformers';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
await mkdir('.cache', { recursive: true });
env.cacheDir = fileURLToPath(new URL('../.cache/models/', import.meta.url));
await build({ entryPoints: ['src/ner.ts','src/index.ts'], outdir: '.cache/smoke', bundle: true, platform: 'node', format: 'esm', packages: 'external' });
const { createNerRunner } = await import('../.cache/smoke/ner.js');
const { detectFull } = await import('../.cache/smoke/index.js');
const model = process.argv[2] ?? 'Xenova/bert-base-NER';
console.log(`Loading ${model} for local inference`);
const runner = await createNerRunner({ model });
const reports = [];
for (const text of ['my name is Krishna Teja and I live in Hyderabad','Priya and Rahul met Sarah in Miami']) {
  const entities = await runner(text);
  reports.push({ text, entities: entities.map(e => ({ ...e, value: text.slice(e.start,e.end) })) });
}
const fixtures = JSON.parse(await readFile('../../fixtures/engine-samples.json','utf8'));
const accuracy = [];
for (const sample of fixtures.cases) {
  const full = await detectFull(sample.text,sample.options,runner);
  accuracy.push({ id:sample.id, expected:sample.fullExpected ?? sample.expected, actual:full.findings.map(({type,value})=>({type,value})) });
}
await mkdir('test-results',{recursive:true});
await writeFile(`test-results/ner-${model.replaceAll('/','-')}.json`, JSON.stringify({model,reports,accuracy},null,2));
console.log(JSON.stringify(reports,null,2));
console.log(`${accuracy.length} corpus cases scanned with real NER; report in test-results`);
for(const sample of accuracy) assert.deepEqual(sample.actual,sample.expected,`Real NER mismatch: ${sample.id}`);
assert.deepEqual(reports.map(r=>r.entities.map(e=>e.value)),[['Krishna Teja','Hyderabad'],['Priya','Rahul','Sarah','Miami']]);
