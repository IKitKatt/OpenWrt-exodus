// Optional: PLAYWRIGHT_MODULE=<playwright-core entry>, CHROMIUM_PATH=<browser executable>.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const out=process.env.WEBUI_SCREENSHOTS||'docs/webui-review';
await mkdir(out,{recursive:true});
const errors=[];
const base=process.env.WEBUI_PREVIEW_URL||'http://127.0.0.1:8765';
async function checkNativeSurface() {
    const failures=[];
    const check=(condition,message)=>{if(!condition)failures.push(message);};
    for(const [firmware,saved,locale,expected] of [['RU','en','en-US','ru'],['EN','ru','ru-RU','en'],['','ru','ru-RU','en'],['DE','ru','ru-RU','en']]) {
        const context=await browser.newContext({locale,viewport:{width:1100,height:1000}});
        await context.addInitScript(value=>localStorage.setItem('exodus.lang',value),saved);
        const page=await context.newPage();
        await page.goto(`${base}/?lang=${firmware}`);
        await page.locator('#content h1').waitFor();
        check(await page.locator('#exodus-root').getAttribute('lang')===expected,`firmware ${firmware||'(empty)'}, saved ${saved}, browser ${locale}: expected ${expected}`);
        check(await page.locator('#lang').count()===0,'language toggle must be absent');
        await context.close();
    }
    const page=await browser.newPage({viewport:{width:1100,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    const fillsCanvas=()=>page.locator('#exodus-root').evaluate(el=>{
        const rect=el.getBoundingClientRect();
        const sidebar=document.getElementById('mainMenu').getBoundingClientRect();
        const footer=document.getElementById('footer').getBoundingClientRect();
        return rect.bottom+1>=Math.max(sidebar.bottom-15,innerHeight-footer.height-20);
    });
    await page.goto(`${base}/?native&delay=1200`);
    await page.locator('#content .loader').waitFor();
    await page.waitForTimeout(50);
    check(await fillsCanvas(),'loading canvas must fill firmware sidebar/viewport');
    if(process.env.WEBUI_CAPTURE!=='0') await page.screenshot({path:`${out}/native-loading.png`,fullPage:true});
    await page.locator('#content h1').waitFor();
    for(const route of ['status','profiles','settings','editor','logs','updates']) {
        await page.locator(`#menu a[href="#/${route}"]`).click();
        await page.locator('#content h1').waitFor();
        check(await fillsCanvas(),`${route} canvas must fill firmware sidebar/viewport`);
    }
    await page.evaluate(()=>document.getElementById('mainMenu').style.height='1450px');
    await page.waitForTimeout(50);
    check(await fillsCanvas(),'canvas must follow a taller firmware menu');
    await page.evaluate(()=>document.getElementById('mainMenu').style.height='200px');
    await page.setViewportSize({width:1100,height:1600});
    await page.waitForTimeout(50);
    check(await fillsCanvas(),'canvas must follow viewport resize with short firmware menu');
    const before=await page.locator('#exodus-root').evaluate(el=>el.getBoundingClientRect().height);
    await page.evaluate(()=>scrollTo(0,500));
    await page.waitForTimeout(50);
    check(await page.locator('#exodus-root').evaluate(el=>el.getBoundingClientRect().height)===before,'scroll must not grow the canvas');
    await page.goto(`${base}/?native&failLoad`);
    await page.locator('#content .alert-destructive').waitFor();
    await page.waitForTimeout(50);
    check(await fillsCanvas(),'initial error canvas must fill firmware sidebar/viewport');
    if(process.env.WEBUI_CAPTURE!=='0') await page.screenshot({path:`${out}/native-error.png`,fullPage:true});
    await page.close();
    assert.deepEqual(failures,[],'native surface regressions');
    console.log('PASS: firmware-only RU/EN, legacy/browser language ignored, no toggle; native loading/error/six-route canvas, menu and viewport resize, stable scroll.');
}
async function checkDelayedUpdate() {
    const page=await browser.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install();
    await page.goto(`${base}/?pendingUpdate#/updates`);
    await page.getByLabel('Low flash space mode',{exact:true}).waitFor();
    assert.equal(await page.locator('#content .table .badge').first().innerText(),'Unknown');
    assert.equal(await page.getByRole('button',{name:'Update',exact:true}).isDisabled(),true);
    await page.getByLabel('Low flash space mode',{exact:true}).check();
    await page.evaluate(()=>Object.assign(previewData.check_update,{app_latest:'1.27.5',app_update:true,core_latest:'v1.19.16'}));
    await page.clock.fastForward(5100);
    await page.waitForFunction(()=>document.querySelector('#content .table').textContent.includes('v1.19.16'),{},{timeout:1500});
    assert.equal(await page.getByLabel('Low flash space mode',{exact:true}).isChecked(),true,'background result preserves the selected update option');
    assert.equal(await page.getByRole('button',{name:'Update',exact:true}).isEnabled(),true);
    assert.equal(await page.locator('#about').getAttribute('title'),'Update available');
    assert.equal(await page.evaluate(()=>previewCalls.some(c=>c.action==='check_update'&&c.params.force||c.action==='update')),false,'passive refresh does not force checks or start updates');
    await page.getByRole('button',{name:'Check again',exact:true}).click();
    assert.equal(await page.evaluate(()=>previewCalls.filter(c=>c.action==='check_update'&&c.params.force===true).length),1,'explicit recheck still requests a forced check');
    await page.getByRole('button',{name:'Update',exact:true}).click();
    await page.locator('#dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await page.evaluate(()=>previewCalls.some(c=>c.action==='update')),false,'cancel keeps update unapplied');
    await page.locator('#menu a[href="#/status"]').click();
    await page.getByLabel('Autostart',{exact:true}).check();
    const calls=await page.evaluate(()=>previewCalls.filter(c=>c.action==='check_update').length);
    await page.clock.fastForward(5100);
    assert.equal(await page.evaluate(()=>previewCalls.filter(c=>c.action==='check_update').length),calls,'leaving Updates clears passive polling');
    assert.equal(await page.getByLabel('Autostart',{exact:true}).isChecked(),true,'draft survives subsequent status refresh');
    assert.equal(await page.locator('#savebar').isVisible(),true);
    await page.close();
    console.log('PASS: delayed RAM update result appears without navigation, badge/options retained, explicit recheck/cancel, route timer cleanup and drafts.');
}
try {
    await checkDelayedUpdate();
    await checkNativeSurface();
    if(process.env.WEBUI_SURFACE_ONLY==='1') {
        assert.deepEqual(errors,[]);
        process.exitCode=0;
    } else {
    for(const lang of ['EN','RU']) for(const width of [760,600,390]) {
        const page=await browser.newPage({viewport:{width:width===390?390:1000,height:1000}});
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(`${base}/?lang=${lang}&width=${width}`);
        await page.locator('#content h1').waitFor();
        await page.locator('.shell').evaluate((el,width)=>el.style.width=width+'px',width);
        assert.ok(await page.locator('.picker-column .field input').evaluate(el=>el.getBoundingClientRect().width>=72),`${lang}/${width} manual address remains usable`);
        assert.equal(await page.locator('#menu a').count(),6);
        for(const route of ['status','profiles','settings','editor','logs','updates']) {
            await page.locator(`#menu a[href="#/${route}"]`).click();
            await page.waitForTimeout(100);
            assert.ok(await page.locator('#content').innerText(),route);
            const overflow=await page.locator('#exodus-root').evaluate(el=>el.scrollWidth>el.clientWidth+1);
            assert.equal(overflow,false,`${lang}/${width}/${route} overflow`);
            assert.equal(await page.locator('#content .table th').evaluateAll(els=>els.filter(el=>el.getClientRects().length&&el.textContent.trim()).every(el=>{
                const range=document.createRange();range.selectNodeContents(el);
                return new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.top))).size<=1;
            })),true,`${lang}/${width}/${route} readable table headers`);
            if(process.env.WEBUI_CAPTURE!=='0'&&(route==='status'||route==='settings')) await page.screenshot({path:`${out}/${lang}-${width}-${route}.png`,fullPage:true});
            if(route==='settings') {
                for(const button of await page.locator('#content .tabs-trigger').all()) {
                    await button.click();
                    assert.equal(await page.locator('#exodus-root').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
                }
            }
        }
        await page.locator('#about').click();
        await page.locator('#dialog [role=dialog]').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#dialog').isVisible(),false);
        assert.equal(await page.evaluate(()=>document.activeElement.id),'about');
        await page.close();
    }
    const page=await browser.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/?lang=EN`);
    const radios=page.locator('[role=radio]');
    await radios.first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await radios.last().getAttribute('aria-checked'),'true');
    assert.equal(await radios.last().evaluate(el=>el===document.activeElement),true);
    await page.getByLabel('Autostart',{exact:true}).check();
    assert.equal(await page.evaluate(()=>document.getElementById('savebar').getBoundingClientRect().top>=document.getElementById('content').getBoundingClientRect().bottom),true,'draft actions occupy their own space');
    await page.locator('#menu a[href="#/profiles"]').click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.ok(page.url().endsWith('#/status'));
    assert.equal(await page.getByLabel('Autostart',{exact:true}).isChecked(),true);
    await page.locator('#savebar').getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#savebar').isVisible(),false);
    await page.evaluate(()=>window.open=(url)=>{window.previewDashboard=url;});
    await page.getByRole('button',{name:'Dashboard',exact:true}).click();
    assert.ok((await page.evaluate(()=>previewDashboard)).includes('secret=mock-secret'));
    await page.locator('#menu a[href="#/profiles"]').click();
    await page.waitForTimeout(100);
    await page.locator('input[type=file]').setInputFiles({name:'uploaded.yaml',mimeType:'text/plain',buffer:Buffer.from('name: "Привет 😀"\n')});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>previewCalls.some(c=>c.action==='profile_upload'&&c.params.content.includes('Привет'))));
    const before=await page.evaluate(()=>previewCalls.filter(c=>c.action==='profile_upload').length);
    await page.locator('input[type=file]').setInputFiles({name:'huge.yaml',mimeType:'text/plain',buffer:Buffer.alloc(8388609)});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>previewCalls.filter(c=>c.action==='profile_upload').length),before);
    await page.locator('#menu a[href="#/editor"]').click();
    await page.waitForTimeout(100);
    await page.getByLabel('File',{exact:true}).selectOption('/opt/etc/exodus/profiles/demo.yaml');
    await page.locator('#content textarea').fill('mode: rule\n# Привет 😀');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>previewCalls.some(c=>c.action==='file_write'&&c.params.content.includes('Привет'))));
    await page.locator('#menu a[href="#/logs"]').click();
    await page.waitForTimeout(100);
    await page.getByRole('button',{name:'Clear',exact:true}).first().click();
    assert.ok(await page.evaluate(()=>previewCalls.some(c=>c.action==='log_clear')));
    await page.locator('#menu a[href="#/status"]').click();
    await page.evaluate(()=>window.previewFailStatus=true);
    await page.waitForTimeout(5200);
    assert.equal(await page.locator('#content .card-header .badge').first().innerText(),'Unknown');
    await page.getByLabel('Autostart',{exact:true}).uncheck();
    await page.evaluate(()=>window.dispatchEvent(new Event('exodus-session-expired')));
    assert.equal(await page.locator('#session-warning').isVisible(),true);
    assert.equal(await page.getByLabel('Autostart',{exact:true}).isChecked(),false);
    await page.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: 6 sections, settings tabs, modal Escape/focus, RU/EN, widths 760/600/390, address input, table headers, draft bar; synthetic data only.');
    }
} finally {await browser.close();}
