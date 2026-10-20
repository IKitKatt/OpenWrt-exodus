// Optional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node .github/tests/editor.browser.mjs
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
const source = readFileSync(new URL('app.js', www), 'utf8');
const css = readFileSync(new URL('style.css', www), 'utf8');
const keyboard = source.slice(source.indexOf("document.addEventListener('keydown', (ev) => {"), source.indexOf("\nwindow.addEventListener('exodus-session-expired'"));
const browser = await chromium.launch({headless:true});
const errors = [];
try {
    async function setup({fail=false, delay=0}={}) {
        const page = await browser.newPage({viewport:{width:1100,height:900}});
        page.on('pageerror', error => errors.push(error.message));
        let requests = 0;
        await page.route('http://exodus.test/**', async route => {
            if (route.request().url().includes('/editor.js')) {
                requests++;
                if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
                const path = new URL('editor.js', www);
                if (fail || !existsSync(path)) return route.fulfill({status:404,body:''});
                return route.fulfill({contentType:'application/javascript',body:readFileSync(path,'utf8')});
            }
            return route.fulfill({contentType:'text/html',body:'<button id="about"></button><div id="exodus-root"><div id="content"></div></div><div id="dialog" hidden></div><div id="toaster"></div>'});
        });
        await page.goto('http://exodus.test/#/editor');
        await page.addStyleTag({content:css});
        await page.addScriptTag({content:source.slice(0,source.indexOf('// ---------- init ----------')) + keyboard + String.raw`
            window.writes=[]; window.notices=[];
            toast=message=>notices.push(message); confirmDialog=async()=>true;
            api=async(action,p)=>{
                if(action==='file_read')return {content:p.path==='/mixin.yaml'?'dns:\n  enable: true\n# комментарий\n':'port: 7890\r\n'};
                if(action==='file_write'){writes.push({...p});return {success:true};}
                throw Error(action);
            };
            state.config={subscriptions:[]};
            state.files={mixin:'/mixin.yaml',run_profile:'/profile.yaml'};
            window.showEditor=()=>{
                state.destroyEditor?.();state.destroyEditor=null;renderToken++;
                append(clear(document.querySelector('#content')),pageEditor());
            };
            window.leaveEditor=()=>{
                state.destroyEditor?.();state.destroyEditor=null;renderToken++;
                clear(document.querySelector('#content'));
            };
            window.drafts=()=>state.editorBuffers;
        })();`});
        assert.equal(requests,0,'no editor bundle outside Editor');
        await page.evaluate(()=>showEditor());
        return {page, requests:()=>requests};
    }
    const {page,requests} = await setup();
    await page.waitForSelector('.cm-editor',{timeout:2500});
    assert.equal(requests(),1);
    await page.locator('select').selectOption('/mixin.yaml');
    const content = page.locator('.cm-content');
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('enable: true'));
    assert.equal(await content.getAttribute('role'),'textbox');
    assert.ok(await page.locator('.cm-gutters').isVisible());
    assert.ok(await page.locator('.cm-line span').count()>0,'syntax spans');
    assert.equal(await page.locator('.cm-editor').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(31, 45, 53)','Merlin input background');
    await content.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Tab');
    await page.keyboard.type('test: 1');
    assert.match(await page.evaluate(()=>drafts()['/mixin.yaml'].content), /\n  test: 1$/);
    await page.keyboard.press('Control+z');
    assert.doesNotMatch(await page.evaluate(()=>drafts()['/mixin.yaml'].content),/test: 1$/,'undo removes typed text');
    await page.keyboard.press('Control+Shift+z');
    assert.match(await page.evaluate(()=>drafts()['/mixin.yaml'].content),/test: 1$/);
    await page.keyboard.press('Control+f');
    assert.ok(await page.locator('.cm-search input[name="search"]').isVisible());
    await page.keyboard.press('Escape');
    await page.getByLabel('Wrap lines',{exact:true}).check();
    assert.match(await content.getAttribute('class'),/cm-lineWrapping/);
    await page.locator('select').selectOption('/profile.yaml');
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('port: 7890'));
    await content.click();
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>drafts()['/profile.yaml'].content),'port: 7890\r\n','undo cannot restore another file');
    await page.keyboard.press('Control+End');
    await page.keyboard.type('mode: rule');
    assert.equal(await page.evaluate(()=>drafts()['/profile.yaml'].content),'port: 7890\r\nmode: rule','editing preserves CRLF');
    await page.locator('select').selectOption('/mixin.yaml');
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('test: 1'));
    await content.click();
    await page.keyboard.press('Control+s');
    await page.waitForFunction(()=>writes.length>0);
    assert.match(await page.evaluate(()=>writes.at(-1).content),/test: 1$/);
    await page.evaluate(()=>leaveEditor());
    assert.equal(await page.locator('.cm-editor').count(),0);
    await page.evaluate(()=>showEditor());
    await page.waitForSelector('.cm-editor');
    assert.match(await content.textContent(),/test: 1/,'draft survives page navigation');
    assert.equal(requests(),1,'bundle reused');

    const beforeIndent=await page.evaluate(()=>drafts()['/mixin.yaml'].content);
    await content.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Tab');
    assert.match(await page.evaluate(()=>drafts()['/mixin.yaml'].content),/^  dns:\n    enable: true/,'indent selected lines');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>drafts()['/mixin.yaml'].content),beforeIndent,'unindent selected lines');
    await page.evaluate(()=>{ drafts()['/mixin.yaml'].content='dns:\n  enable: true'; showEditor(); });
    await page.waitForSelector('.cm-editor');
    await content.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    assert.match(await page.evaluate(()=>drafts()['/mixin.yaml'].content),/\n  $/,'Enter keeps YAML indentation');

    // Keep the previously requested slow, symmetric selection scrolling in CodeMirror too.
    await page.evaluate(()=>{
        drafts()['/mixin.yaml'].content=Array.from({length:2000},(_,i)=>`key${i}: ${'value '.repeat(25)}`).join('\n');
        showEditor();
    });
    await page.waitForSelector('.cm-editor');
    const scroller = page.locator('.cm-scroller');
    await scroller.scrollIntoViewIfNeeded();
    async function drag(direction, wrap) {
        await page.getByLabel('Wrap lines',{exact:true}).setChecked(wrap);
        await scroller.evaluate(e=>e.scrollTop=7000);
        await page.waitForTimeout(120);
        const box=await scroller.boundingBox(), before=await scroller.evaluate(e=>e.scrollTop);
        await page.mouse.move(box.x+100,box.y+box.height/2);
        await page.mouse.down();
        await page.mouse.move(box.x+100,direction<0?box.y-20:box.y+box.height+20);
        await page.waitForTimeout(1000);
        const after=await scroller.evaluate(e=>e.scrollTop);
        await page.mouse.up();
        await page.waitForTimeout(100);
        assert.equal(await scroller.evaluate(e=>e.scrollTop),after,'selection scroll stops');
        assert.ok(Math.abs(after-before)>=60 && Math.abs(after-before)<=125,`slow CodeMirror scroll: ${after-before}`);
        return Math.abs(after-before);
    }
    for(const wrap of [false,true]) {
        const down=await drag(1,wrap), up=await drag(-1,wrap);
        assert.ok(Math.abs(down-up)<=15,'symmetric CodeMirror scrolling');
        console.log(`CodeMirror selection wrap=${wrap}: down ${down}px, up ${up}px per second`);
    }

    const fallback = await setup({fail:true});
    await fallback.page.locator('select').selectOption('/mixin.yaml');
    await fallback.page.waitForFunction(()=>!document.querySelector('textarea').disabled);
    assert.ok(await fallback.page.locator('textarea').isVisible());
    await fallback.page.locator('textarea').fill('fallback: true\n');
    await fallback.page.getByRole('button',{name:'Save',exact:true}).click();
    assert.equal(await fallback.page.evaluate(()=>writes.at(-1).content),'fallback: true\n');

    const late = await setup({delay:300});
    await late.page.locator('select').selectOption('/mixin.yaml');
    await late.page.waitForFunction(()=>!document.querySelector('textarea').disabled);
    await late.page.locator('textarea').fill('typed: before-bundle\n');
    await late.page.waitForSelector('.cm-editor');
    assert.match(await late.page.locator('.cm-content').textContent(),/typed: before-bundle/,'late upgrade preserves typing');
    const departed = await setup({delay:300});
    await departed.page.evaluate(()=>leaveEditor());
    await departed.page.waitForTimeout(500);
    assert.equal(await departed.page.locator('.cm-editor').count(),0,'late bundle cannot mount a departed page');
    assert.deepEqual(errors,[]);
    console.log('PASS YAML editor: palette, highlight, indent, undo, search, wrap, drafts, save, lazy load and fallback');
} finally { await browser.close(); }
