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
try {
    for(const lang of ['EN','RU']) for(const width of [760,390]) {
        const page=await browser.newPage({viewport:{width:width===390?390:1000,height:1000}});
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(`http://127.0.0.1:8765/?lang=${lang}&width=${width}`);
        await page.locator('#content h1').waitFor();
        assert.equal(await page.locator('#menu a').count(),6);
        for(const route of ['status','profiles','settings','editor','logs','updates']) {
            await page.locator(`#menu a[href="#/${route}"]`).click();
            await page.waitForTimeout(100);
            assert.ok(await page.locator('#content').innerText(),route);
            const overflow=await page.locator('#exodus-root').evaluate(el=>el.scrollWidth>el.clientWidth+1);
            assert.equal(overflow,false,`${lang}/${width}/${route} overflow`);
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
    await page.goto('http://127.0.0.1:8765/?lang=EN');
    const radios=page.locator('[role=radio]');
    await radios.first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await radios.last().getAttribute('aria-checked'),'true');
    assert.equal(await radios.last().evaluate(el=>el===document.activeElement),true);
    await page.getByLabel('Autostart',{exact:true}).check();
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
    console.log('PASS: 6 sections, settings tabs, modal Escape/focus, RU/EN, widths 760/390; synthetic data only.');
} finally {await browser.close();}
