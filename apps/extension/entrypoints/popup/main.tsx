import { useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Site } from '@promptshield/engine';
import { dashboardUrl,guardsReady,normalizeSettings,scanUrl,siteFromUrl,siteNames } from '../../src/shared-ui/data';
import { useLocalData,preview,readLocal,writeLocal,openDashboard,openSettings,openExternal } from '../../src/shared-ui/storage';
import '../../src/shared-ui/style.css';
function Popup(){
 const {events,settings,error}=useLocalData();const [site,setSite]=useState<Site|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!preview)chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>setSite(siteFromUrl(tabs[0]?.url))).catch(()=>setMessage('Could not read the active tab.'));},[]);
 const start=new Date();start.setHours(0,0,0,0);const now=Date.now();const today=events.filter(e=>e.ts>=start.getTime()&&e.ts<=now).length;
 async function toggle(){if(!site)return;setBusy(true);try{const current=normalizeSettings((await readLocal()).settings);await writeLocal({settings:{...current,sites:current.sites.includes(site)?current.sites.filter(s=>s!==site):[...current.sites,site]}});}catch{setMessage('Could not update this site. Try again.');}finally{setBusy(false);}}
 const open=(fn:()=>Promise<unknown>)=>void fn().catch(()=>setMessage('Could not open that page.'));
 return <main className="popup"><div className="brand"><span className="brand-mark">P</span>PromptShield</div>{!guardsReady&&<div className="notice">Setup in progress · site guards are not connected.</div>}{preview&&<div className="notice">Development preview</div>}<section className="card popup-card"><div className="toggle-row"><h2>{site?`${settings.sites.includes(site)?guardsReady?'Protecting':'Enabled for':'Paused for'} ${siteNames[site]}`:'Open a supported AI site'}</h2>{site&&<input type="checkbox" role="switch" aria-label={`Enable ${siteNames[site]}`} checked={settings.sites.includes(site)} disabled={busy} onChange={()=>void toggle()}/>}</div><p style={{fontSize:12}}>Details in sent prompts today</p><div className="count">{today}</div></section>{(error||message)&&<div role="alert" className="error">{error||message}</div>}{dashboardUrl&&<button className="btn btn-primary full" onClick={()=>open(()=>openExternal(dashboardUrl!))}>Open Mind Your Prompt dashboard ↗</button>}<button className="btn full" onClick={()=>open(openDashboard)}>Detailed activity</button><button className="btn full" onClick={()=>open(openSettings)}>Settings</button>{scanUrl&&<button className="btn full" onClick={()=>open(()=>openExternal(scanUrl!))}>Scan my AI history ↗</button>}<div className="popup-footer">Your activity stays on this device.</div></main>;
}
createRoot(document.getElementById('root')!).render(<Popup/>);
