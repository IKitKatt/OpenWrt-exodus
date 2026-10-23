// Run all browser suites: npm test --prefix .github/tests
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
    async function setup({fail=false, defer=false}={}) {
        let releaseBundle;
        const bundleReady = new Promise(resolve=>{releaseBundle=resolve;});
        const page = await browser.newPage({viewport:{width:1100,height:900}});
        page.on('pageerror', error => errors.push(error.message));
        let requests = 0;
        await page.route('http://exodus.test/**', async route => {
            if (route.request().url().includes('/editor.js')) {
                requests++;
                if (defer) await bundleReady;
                const path = new URL('editor.js', www);
                if (fail || !existsSync(path)) return route.fulfill({status:404,body:''});
                return route.fulfill({contentType:'application/javascript',body:readFileSync(path,'utf8').replace(/<%[\s\S]*?(?:%>|$)/g,'') + `
                    const mountEditor=window.ExodusYamlEditor.mount;
                    window.serializations=0;
                    window.ExodusYamlEditor.mount=(text,options)=>mountEditor(text,{...options,onChange(content){window.serializations++;options.onChange(content);}});
                `});
            }
            return route.fulfill({contentType:'text/html',body:'<button id="about"></button><div id="exodus-root"><div id="content"></div></div><div id="dialog" hidden></div><div id="toaster"></div>'});
        });
        await page.goto('http://exodus.test/#/editor');
        await page.addStyleTag({content:css});
        await page.addScriptTag({content:source.slice(0,source.indexOf('// ---------- init ----------')) + keyboard + String.raw`
            window.writes=[]; window.notices=[];
            toast=message=>notices.push(message); confirmDialog=async()=>{window.confirmations=(window.confirmations||0)+1;return window.allowReload!==false;};
            window.editorDirty=()=>hasEditorChanges();
            window.saveNow=()=>state.saveEditor();
            window.downloads=[];download=(name,content)=>downloads.push({name,content});
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
        return {page, requests:()=>requests, releaseBundle};
    }
    // Freeze time so every boundary below is exercised before the idle debounce.
    const burst = await setup();
    await burst.page.waitForSelector('.cm-editor');
    await burst.page.locator('select').selectOption('/mixin.yaml');
    await burst.page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('enable: true'));
    await burst.page.clock.install();
    await burst.page.clock.pauseAt(new Date());
    await burst.page.evaluate(()=>{
        window.textareaWrites=0;
        const text=document.querySelector('textarea');
        const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
        Object.defineProperty(text,'value',{get(){return descriptor.get.call(this);},set(value){textareaWrites++;descriptor.set.call(this,value);}});
    });
    await burst.page.locator('.cm-content').click();
    await burst.page.keyboard.press('Control+End');
    for(const text of ['burst', ': ', 'true']) await burst.page.keyboard.insertText(text);
    assert.equal(await burst.page.evaluate(()=>textareaWrites),0,'typing burst never mirrors the hidden textarea');
    assert.equal(await burst.page.evaluate(()=>editorDirty()),true,'pending edits immediately count as unsaved');
    assert.equal(await burst.page.evaluate(()=>{
        const event=new Event('beforeunload',{cancelable:true});
        window.dispatchEvent(event);
        return event.defaultPrevented;
    }),true,'pending edits trigger unload warning');
    assert.equal(await burst.page.evaluate(()=>serializations),0,'typing burst does not serialize');
    assert.match(await burst.page.locator('.editor-status').textContent(),/Unsaved/);
    assert.doesNotMatch(await burst.page.evaluate(()=>drafts()['/mixin.yaml'].content),/burst: true/,'serialization waits for idle');
    await burst.page.clock.runFor(249);
    assert.doesNotMatch(await burst.page.evaluate(()=>drafts()['/mixin.yaml'].content),/burst: true/);
    await burst.page.clock.runFor(1);
    assert.match(await burst.page.evaluate(()=>drafts()['/mixin.yaml'].content),/burst: true/,'idle serializes the latest document');
    assert.equal(await burst.page.evaluate(()=>serializations),1,'one serialization per idle burst');
    await burst.page.keyboard.insertText(' save');
    await burst.page.evaluate(()=>saveNow());
    assert.match(await burst.page.evaluate(()=>writes.at(-1).content),/burst: true save$/,'immediate save flushes');
    assert.equal(await burst.page.evaluate(()=>editorDirty()),false,'save clears pending dirty state');
    await burst.page.keyboard.insertText(' download');
    await burst.page.getByRole('button',{name:'Download',exact:true}).evaluate(button=>button.click());
    assert.match(await burst.page.evaluate(()=>downloads.at(-1).content),/save download$/,'download flushes');
    await burst.page.keyboard.insertText(' switch');
    await burst.page.locator('select').selectOption('/profile.yaml');
    assert.match(await burst.page.evaluate(()=>drafts()['/mixin.yaml'].content),/download switch$/,'file switch flushes old buffer');
    await burst.page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('port: 7890'));
    await burst.page.locator('.cm-content').click();
    await burst.page.keyboard.press('Control+End');
    await burst.page.keyboard.insertText('crlf: true');
    await burst.page.evaluate(()=>{window.allowReload=false;document.querySelector('.editor-toolbar button').click();});
    assert.equal(await burst.page.evaluate(()=>confirmations),1,'reload confirms pending edits');
    assert.equal(await burst.page.evaluate(()=>drafts()['/profile.yaml'].content),'port: 7890\r\ncrlf: true','reload flush preserves CRLF');
    await burst.page.keyboard.insertText(' navigation');
    await burst.page.evaluate(()=>leaveEditor());
    assert.match(await burst.page.evaluate(()=>drafts()['/profile.yaml'].content),/crlf: true navigation$/,'unmount flushes synchronously');
    const serializedAtDestroy=await burst.page.evaluate(()=>serializations);
    await burst.page.clock.runFor(500);
    assert.equal(await burst.page.evaluate(()=>serializations),serializedAtDestroy,'destroy cancels pending timer');
    await burst.page.evaluate(()=>showEditor());
    await burst.page.waitForSelector('.cm-editor');
    assert.match(await burst.page.locator('.cm-content').textContent(),/crlf: true navigation/,'unmounted draft retained');
    await burst.page.close();

    const {page,requests} = await setup();
    const draft = async path => {
        await page.waitForFunction(path=>drafts()[path] && !drafts()[path].pending,path);
        return page.evaluate(path=>drafts()[path].content,path);
    };
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
    assert.match(await draft('/mixin.yaml'), /\n  test: 1$/);
    await page.keyboard.press('Control+z');
    assert.doesNotMatch(await draft('/mixin.yaml'),/test: 1$/,'undo removes typed text');
    await page.keyboard.press('Control+Shift+z');
    assert.match(await draft('/mixin.yaml'),/test: 1$/);
    await page.keyboard.press('Control+f');
    assert.ok(await page.locator('.cm-search input[name="search"]').isVisible());
    await page.keyboard.press('Escape');
    await page.getByLabel('Wrap lines',{exact:true}).check();
    assert.match(await content.getAttribute('class'),/cm-lineWrapping/);
    await page.locator('select').selectOption('/profile.yaml');
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent.includes('port: 7890'));
    await content.click();
    await page.keyboard.press('Control+z');
    assert.equal(await draft('/profile.yaml'),'port: 7890\r\n','undo cannot restore another file');
    await page.keyboard.press('Control+End');
    await page.keyboard.type('mode: rule');
    assert.equal(await draft('/profile.yaml'),'port: 7890\r\nmode: rule','editing preserves CRLF');
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

    const beforeIndent=await draft('/mixin.yaml');
    await content.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Tab');
    assert.match(await draft('/mixin.yaml'),/^  dns:\n    enable: true/,'indent selected lines');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await draft('/mixin.yaml'),beforeIndent,'unindent selected lines');
    await page.evaluate(()=>{ drafts()['/mixin.yaml'].content='dns:\n  enable: true'; showEditor(); });
    await page.waitForSelector('.cm-editor');
    await content.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    assert.match(await draft('/mixin.yaml'),/\n  $/,'Enter keeps YAML indentation');

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

    const late = await setup({defer:true});
    await late.page.locator('select').selectOption('/mixin.yaml');
    await late.page.waitForFunction(()=>!document.querySelector('textarea').disabled);
    await late.page.locator('textarea').fill('typed: before-bundle\n');
    late.releaseBundle();
    await late.page.waitForSelector('.cm-editor');
    assert.match(await late.page.locator('.cm-content').textContent(),/typed: before-bundle/,'late upgrade preserves typing');
    const departed = await setup({defer:true});
    await departed.page.evaluate(()=>leaveEditor());
    departed.releaseBundle();
    await departed.page.waitForFunction(()=>!!window.ExodusYamlEditor);
    assert.equal(await departed.page.locator('.cm-editor').count(),0,'late bundle cannot mount a departed page');
    assert.deepEqual(errors,[]);
    console.log('PASS YAML editor: palette, highlight, indent, undo, search, wrap, drafts, save, lazy load and fallback');
} finally { await browser.close(); }
