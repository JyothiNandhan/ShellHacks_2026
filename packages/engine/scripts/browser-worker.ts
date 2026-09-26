import { run } from './browser-task';
self.onmessage = async (event: MessageEvent<string>) => {
  try { self.postMessage({ok:true,result:await run(event.data)}); }
  catch(error) { self.postMessage({ok:false,error:String(error)}); }
};
