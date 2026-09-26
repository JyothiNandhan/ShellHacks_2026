import { activityStats } from '../../src/activity';
import { useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Site } from '@promptshield/engine';
import { guardsReady,normalizeSettings,siteFromUrl,siteNames } from '../../src/shared-ui/data';
import { useLocalData,preview,readLocal,writeLocal,openDashboard,openSettings } from '../../src/shared-ui/storage';
import '../../src/shared-ui/style.css';
function Popup(){
 const {activity,settings,error}=useLocalData();const [site,setSite]=useState<Site|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!preview)chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>setSite(siteFromUrl(tabs[0]?.url))).catch(()=>setMessage('Could not read the active tab.'));},[]);
 const stats=activity?activityStats(activity):null;
 async function toggle(){if(!site)return;setBusy(true);try{const current=normalizeSettings((await readLocal()).settings);await writeLocal({settings:{...current,sites:current.sites.includes(site)?current.sites.filter(s=>s!==site):[...current.sites,site]}});}catch{setMessage('Could not update this site. Try again.');}finally{setBusy(false);}}
 const open=(fn:()=>Promise<unknown>)=>void fn().catch(()=>setMessage('Could not open that page.'));
 return <main className="popup"><div className="brand"><span className="brand-mark">P</span>Mind your Prompt!</div>{!guardsReady&&<div className="notice">Setup in progress · site guards are not connected.</div>}{preview&&<div className="notice">Development preview</div>}<section className="card popup-card"><div className="toggle-row"><h2>{site?`${settings.sites.includes(site)?guardsReady?'Protecting':'Enabled for':'Paused for'} ${siteNames[site]}`:'Open a supported AI site'}</h2>{site&&<input type="checkbox" role="switch" aria-label={`Enable ${siteNames[site]}`} checked={settings.sites.includes(site)} disabled={busy} onChange={()=>void toggle()}/>}</div><p style={{fontSize:12}}>Personal details shared</p><div className="count">{stats?.shared??0}</div></section>{(error||message)&&<div role="alert" className="error">{error||message}</div>}<button className="btn btn-primary full" onClick={()=>open(openDashboard)}>Open dashboard</button><button className="btn full" onClick={()=>open(openSettings)}>Settings</button><div className="popup-footer">Your activity stays on this device.</div></main>;
}
createRoot(document.getElementById('root')!).render(<Popup/>);
