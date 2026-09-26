import { env } from '@huggingface/transformers';
import { createNerRunner } from '../src/ner';
import { detectFull } from '../src/index';
import { extractText } from '../src/files';
export async function run(base: string) {
  env.remoteHost = base;
  env.remotePathTemplate = 'models/{model}/';
  env.useBrowserCache = false;
  env.backends.onnx.wasm!.wasmPaths = `${base}wasm/`;
  env.backends.onnx.wasm!.numThreads = 1;
  const runner = await createNerRunner();
  const text = 'Priya and Rahul met Sarah in Miami';
  const detection = await detectFull(text,undefined,runner);
  const files=[];
  for(const name of ['text.pdf','scanned.pdf','text.docx']) {
    const bytes=await (await fetch(`${base}fixtures/${name}`)).arrayBuffer();
    files.push({name,result:await extractText(new File([bytes],name))});
  }
  return {detection,files};
}
