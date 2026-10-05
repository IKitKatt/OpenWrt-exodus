// Synthetic frontend preview; it does not emulate or verify firmware authentication.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const www=path.join(root,'asuswrt/opt/share/exodus/www');
const fixture=JSON.parse(await readFile(path.join(root,'tests/fixtures/webui-data.json'),'utf8'));
const worstCase=fixture.worst_case;
delete fixture.worst_case;
const config=JSON.parse(await readFile(path.join(root,'asuswrt/opt/etc/exodus/config.json'),'utf8'));
const asp=await readFile(path.join(www,'Exodus.asp'),'utf8');
const surface=asp.match(/<main id="exodus-root"[\s\S]*?<\/main>/)[0];
const previewStyle=`#preview-data-switch{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:10001;display:flex;gap:2px;max-width:calc(100vw - 12px);padding:4px;border-radius:6px;background:#d4d4d8;box-shadow:0 2px 8px #0004;font:12px system-ui}#preview-data-switch a{padding:7px 9px;border-radius:3px;color:#27272a;white-space:nowrap;text-decoration:none}#preview-data-switch a[aria-current]{background:white}#preview-data-switch a:focus-visible{outline:2px solid #27272a;outline-offset:1px}@media(max-width:430px){#preview-data-switch a{padding:7px 4px;font-size:10px}}`;
const mock=`const previewParams=new URLSearchParams(location.search); window.ExodusBootstrap={lang:previewParams.get('lang')??'EN'};
window.previewData=${JSON.stringify(fixture)}; window.previewConfig=${JSON.stringify(config)};
const worstCase=${JSON.stringify(worstCase)};
const previewMode=previewParams.get('data')||'demo';
window.previewProfiles=[{name:'demo.yaml',size:37}]; window.previewSubscriptionStates={};
if(previewMode!=='demo') {
  for(const [key,value] of Object.entries(worstCase.data))previewData[key]=Object.assign({},previewData[key],structuredClone(value));
  for(const [key,value] of Object.entries(worstCase.config))previewConfig[key]=Array.isArray(value)?structuredClone(value):Object.assign({},previewConfig[key],structuredClone(value));
  previewProfiles=structuredClone(worstCase.profiles); previewSubscriptionStates=structuredClone(worstCase.subscription_states);
  if(previewMode==='empty'){previewData.hosts.hosts=[];previewData.hosts.aps=[];previewData.hosts.segments=[];previewProfiles=[];previewConfig.subscriptions=[];previewConfig.config.profile=null;previewConfig.proxy.access_items=[];previewData.proxies={groups:[],proxies:[]};previewData.check_update={app:null,app_latest:null,app_update:null,core:null,core_latest:null,core_type:null,arch:null,free_space:null,core_size:null,gh_proxy:null};}
  if(previewMode==='one'){previewData.hosts.hosts=previewData.hosts.hosts.slice(0,1);previewData.hosts.aps=previewData.hosts.aps.slice(0,1);previewData.hosts.aps[0].clients=1;previewData.hosts.segments=previewData.hosts.segments.slice(0,1);previewProfiles=previewProfiles.slice(0,1);previewConfig.subscriptions=previewConfig.subscriptions.slice(0,1);previewConfig.proxy.access_items=['mac:AA:BB:CC:DD:EE:01'];}
  if(previewMode==='large'){previewData.hosts.hosts=Array.from({length:1000},(_,index)=>{const sample=structuredClone(worstCase.data.hosts.hosts[index%worstCase.data.hosts.hosts.length]);sample.mac='02:00:00:'+[(index>>16)&255,(index>>8)&255,index&255].map(n=>n.toString(16).padStart(2,'0').toUpperCase()).join(':');sample.ip='10.0.'+Math.floor(index/250)+'.'+(index%250+1);sample.name=(sample.name||'Unnamed device')+' / '+(index+1);return sample;});previewConfig.proxy.access_items=[];}
}
if(previewParams.has('pendingUpdate'))Object.assign(previewData.check_update,{app_latest:null,app_update:null,core_latest:null});
window.previewCalls=[]; let files={'/opt/etc/exodus/profiles/demo.yaml':'# Synthetic preview\\nmode: rule\\n'};
window.ExodusMerlin={request:async(action,params={})=>{previewCalls.push({action,params});
if(action==='status'&&window.previewFailStatus)throw Error('Router cache is stale');
if(action==='load'){if(previewParams.has('delay'))await new Promise(resolve=>setTimeout(resolve,Number(previewParams.get('delay'))));if(previewParams.has('failLoad'))throw Error('Synthetic initial load failure');return {config:structuredClone(previewConfig),subscription_states:structuredClone(previewSubscriptionStates),profiles:structuredClone(previewProfiles)};}
if(action==='config_set'){previewConfig=structuredClone(params.config);return {success:true};}
if(action==='files')return {profiles:structuredClone(previewProfiles),subscriptions:previewConfig.subscriptions.map(s=>({name:s.id+'.yaml',size:1284})),rule_providers:[],proxy_providers:[],dirs:{profiles:'/opt/etc/exodus/profiles',subscriptions:'/opt/etc/exodus/subscriptions',rule_providers:'/opt/etc/exodus/run/providers/rule',proxy_providers:'/opt/etc/exodus/run/providers/proxy'},mixin:'/opt/etc/exodus/mixin.yaml',run_profile:'/opt/etc/exodus/run/config.yaml'};
if(action==='profile_upload'){previewProfiles.push({name:params.name,size:new TextEncoder().encode(params.content).length});files['/opt/etc/exodus/profiles/'+params.name]=params.content;return {success:true};}
if(action==='profile_delete'){previewProfiles=previewProfiles.filter(p=>p.name!==params.name);return {success:true};}
if(action==='file_read')return {content:files[params.path]||'# Synthetic file\\n'};
if(action==='file_write'){files[params.path]=params.content;return {success:true};}
if(action==='log_read'||action==='debug')return {content:'[Synthetic preview] Service operation accepted.\\n'};
if(action==='service'){previewData.status.running=params.op!=='stop';return {success:true};}
return structuredClone(previewData[action]||{success:true});},resume(){},dispose(){}};
const control=document.createElement('nav');control.id='preview-data-switch';control.setAttribute('aria-label','Preview data');
for(const [value,label]of [['demo','Demo data'],['worst','Worst case'],['empty','Empty'],['one','One'],['large','1,000 devices']]){const link=document.createElement('a');const target=new URL(location.href);target.searchParams.set('data',value);link.href=target.href;link.textContent=label;if(value===previewMode)link.setAttribute('aria-current','true');control.append(link);}document.body.append(control);`;
const server=http.createServer(async(req,res)=>{
    try {
        const url=new URL(req.url,'http://localhost');
        if(url.pathname==='/') {
            const width=Math.max(320,Math.min(1200,Number(url.searchParams.get('width'))||760));
            const native=url.searchParams.has('native');
            const shell=native?`<table class="shell native-shell" cellspacing="0"><tr><td class="sidebar"><div id="mainMenu" style="height:1200px">Synthetic firmware sidebar</div><div id="subMenu"></div></td><td class="native-content"><div id="tabMenu" class="vpn">VPN Status &nbsp; VPN Client &nbsp; <strong>Exodus</strong></div>${surface}</td></tr></table><div id="footer">Synthetic firmware footer</div>`:`<div class="shell"><div class="firmware">ASUS &nbsp; MOCK RT-BE88U &nbsp; Asuswrt-Merlin</div><div class="vpn">VPN Status &nbsp; VPN Client &nbsp; <strong>Exodus</strong></div>${surface}</div>`;
            res.setHeader('Content-Type','text/html; charset=utf-8');
            res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ext/exodus/style.css"><style>body{margin:0;background:#172d38;color:white;font:12px Arial}.mock{padding:8px;background:#725200}.shell{width:${width}px;max-width:100%;margin:16px auto}.native-shell{width:${width+202}px;table-layout:fixed}.sidebar{width:202px;vertical-align:top;background:#14242b}.native-content{vertical-align:top}.firmware{padding:12px 10px;background:#14242b}.vpn{padding:8px;background:#303f45}#footer{height:30px}.FormTitle{position:relative;border:1px solid #4D595D}${previewStyle}</style></head><body><div class="mock">MOCK PREVIEW — synthetic data; firmware behavior is not tested here</div>${shell}<script>${mock}</script><script src="/ext/exodus/i18n.js"></script><script src="/ext/exodus/app.js"></script></body></html>`);
        } else if(/^\/ext\/exodus\/(app\.js|i18n\.js|style\.css|favicon\.svg)$/.test(url.pathname)) {
            const name=path.basename(url.pathname);
            res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/javascript');
            res.end(await readFile(path.join(www,name)));
        } else {res.statusCode=404;res.end('Not found');}
    } catch(error){res.statusCode=500;res.end(error.message);}
});
server.listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log('Synthetic WebUI preview: http://127.0.0.1:'+server.address().port));
