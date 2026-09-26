import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { extractText } from '../src/files';
const fixture = async (name:string) => new File([await readFile(new URL(`./fixtures/${name}`,import.meta.url))],name);
it('reads every supported plain text extension', async () => {
  for(const ext of 'txt csv tsv json md log xml yaml yml html js ts py java c cpp cs go rb php sql sh'.split(' ')) expect(await extractText(new File(['a@example.com'],`sample.${ext}`))).toEqual({status:'ok',text:'a@example.com'});
});
it('reports empty, unsupported, oversized and unreadable files', async () => {
  expect((await extractText(new File(['  '],'empty.txt'))).status).toBe('empty');
  for(const ext of ['png','xlsx','pptx','zip']) expect((await extractText(new File(['x'],`file.${ext}`))).status).toBe('unsupported');
  expect(await extractText({size:15*1024*1024+1} as File)).toEqual({status:'error',reason:'File too large to check'});
  expect((await extractText({size:1,name:'file.txt',text:async()=>{throw Error('secret');}} as unknown as File)).status).toBe('error');
});
it('extracts a real PDF and identifies a scanned multi-page PDF', async () => {
  const result=await extractText(await fixture('text.pdf')); expect(result.status).toBe('ok');
  if(result.status==='ok') expect(result.text).toContain('fake@example.com\n\nSecond page');
  expect(await extractText(await fixture('scanned.pdf'))).toEqual({status:'empty',reason:'Looks like a scanned PDF'});
});
it('extracts a real DOCX and never treats malformed documents as clean', async () => {
  const result=await extractText(await fixture('text.docx')); expect(result.status).toBe('ok');
  if(result.status==='ok') expect(result.text).toContain('fake@example.com');
  expect((await extractText(new File(['not a zip'],'bad.docx'))).status).toBe('error');
  expect((await extractText(new File(['not a pdf'],'bad.pdf'))).status).toBe('error');
});
