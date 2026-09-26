import { run } from './browser-task';
// Chrome types stay out of the public package; this is test harness code only.
declare const chrome: { runtime: { onMessage: { addListener(callback: (message: {type:string;base:string}, sender: unknown, respond: (value:unknown)=>void)=>boolean): void } } };
chrome.runtime.onMessage.addListener((message,_sender,respond) => {
  if(message.type !== 'run') return false;
  run(message.base).then(result=>respond({ok:true,result}),error=>respond({ok:false,error:String(error)}));
  return true;
});
