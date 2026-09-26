import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({modules:['@wxt-dev/module-react'],manifest:{name:'PromptShield',description:'Local privacy activity and settings. Site guards require Person 2 integration.',permissions:['storage','activeTab'],options_ui:{page:'options.html',open_in_tab:true}},vite:()=>({plugins:[tailwindcss()]})});
