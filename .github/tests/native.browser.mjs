// Run all browser suites: npm test --prefix .github/tests
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const www=new URL('../../asuswrt/opt/share/exodus/www/',import.meta.url);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
    const page=await browser.newPage(), errors=[], responses=new Map(), pending=new Map(), available={};
    let premature=0, submitted=0, waited=0;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(/error|warning/.test(m.type())) errors.push(m.text());});
    await page.route('http://exodus.test/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        if(path==='/user1.asp') return route.fulfill({contentType:'text/html',headers:{'Permissions-Policy':'unload=()'},
            body:readFileSync(new URL('Exodus.asp',www),'utf8').replace(/<%[\s\S]*?%>/g,'')});
        if(path==='/state.js') return route.fulfill({contentType:'application/javascript',body:`
            window.Session={saved:0};
            window.addEventListener('unload',()=>Session.saved++);
            window.show_menu=()=>{};
        `});
        if(path==='/ext/exodus/merlin.js') return route.fulfill({contentType:'application/javascript',body:readFileSync(new URL('merlin.js',www),'utf8')});
        if(path==='/start_apply.htm') {
            const form=new URLSearchParams(route.request().postData());
            const settings=form.get('amng_custom'), script=form.get('action_script');
            const packet=settings?JSON.parse(JSON.parse(settings).exodus_packet):null;
            const id=packet?.id || script.split('_settings_')[1];
            const body=packet?{content:'dns:\n  enable: true\n'}:{foreign:'keep me'};
            submitted++;
            // Publish only after an index poll has observed the missing response.
            // A wall-clock delay can expire before the first poll on a busy host.
            pending.set(id,{v:1,id,seq:0,phase:'complete',status:200,body:Buffer.from(JSON.stringify(body)).toString('base64')});
            return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Applied</title>'});
        }
        if(path==='/ext/exodus/responses/index.json') {
            if(Object.keys(available).length<submitted) waited++;
            await route.fulfill({contentType:'application/json',body:JSON.stringify(available)});
            for(const [id,response] of pending) {
                responses.set(id,response);
                available[id]=true;
            }
            pending.clear();
            return;
        }
        if(path.startsWith('/ext/exodus/responses/')) {
            const response=responses.get(path.split('/').at(-1).replace('.json',''));
            if(!response) premature++;
            return route.fulfill({status:response?200:404,contentType:'application/json',body:JSON.stringify(response||{})});
        }
        if(path==='/images/favicon.png') return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')});
        return route.fulfill({body:'',contentType:path.endsWith('.css')?'text/css':'application/javascript'});
    });
    await page.goto('http://exodus.test/user1.asp');
    const file=await page.evaluate(()=>ExodusMerlin.request('file_read',{path:'/mixin.yaml'}));
    assert.equal(file.content,'dns:\n  enable: true\n');
    assert.equal(submitted,2,'snapshot and file read use the actual native forms');
    assert.ok(waited>=2,'both native operations must wait for publication');
    assert.equal(premature,0,'no requests for unpublished files');
    assert.match(await page.locator('link[rel="icon"]').getAttribute('href'),/\/images\/favicon.png$/);
    assert.ok(await page.evaluate(()=>window.addEventListener.toString().includes('[native code]')),'event method restored');
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
    assert.equal(await page.evaluate(()=>Session.saved),1,'firmware state still saves on navigation');
    assert.deepEqual(errors,[],'no permissions policy or missing-response console messages');
    console.log('PASS native page: ASUS favicon, unload policy, pagehide save, real form transport without early response 404s');
} finally { await browser.close(); }
