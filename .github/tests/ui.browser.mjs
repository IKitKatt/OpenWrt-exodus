// Optional browser smoke test. Install Playwright outside the project and set
// PLAYWRIGHT_MODULE to its module entry, or use a locally available playwright.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = readFileSync(new URL('../../asuswrt/opt/share/exodus/www/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../asuswrt/opt/share/exodus/www/style.css', import.meta.url), 'utf8');
const browser = await chromium.launch({headless:true});
try {
    const page = await browser.newPage({viewport:{width:1100,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`<style>${css}</style><div id="exodus-root" style="width:900px;padding:80px"><textarea class="textarea editor-text" wrap="off"></textarea></div>`);
    const helper = source.slice(source.indexOf('function editorSelectionScroll('), source.indexOf('\nfunction pageEditor('));
    await page.addScriptTag({content:helper + String.raw`; window.text=document.querySelector('textarea'); text.value=Array.from({length:2000},(_,i)=>'line '+i+' '+ 'yaml: value '.repeat(15)).join('\n'); editorSelectionScroll(text);`});
    const box = await page.locator('textarea').boundingBox();
    const drag = async (direction, wrap) => {
        await page.evaluate(w => { text.wrap=w?'soft':'off'; text.scrollTop=7000; }, wrap);
        const before = await page.evaluate(() => text.scrollTop);
        await page.mouse.move(box.x+60, box.y+box.height/2);
        await page.mouse.down();
        await page.mouse.move(box.x+60, direction<0?box.y-30:box.y+box.height+30);
        await page.waitForTimeout(1100);
        const after = await page.evaluate(() => ({scroll:text.scrollTop, start:text.selectionStart, end:text.selectionEnd}));
        await page.mouse.up();
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => text.scrollTop), after.scroll, 'mouseup stops scrolling');
        assert.notEqual(after.start, after.end, 'drag extends selection');
        const delta = Math.abs(after.scroll-before);
        assert.ok(delta>=60 && delta<=150, `slow scroll: ${delta}px/1.1s`);
        return delta;
    };
    for (const wrap of [false,true]) {
        const down = await drag(1,wrap), up = await drag(-1,wrap);
        assert.ok(Math.abs(down-up)<=20, 'symmetric selection scrolling');
        console.log(`Editor wrap=${wrap}: down ${down}px, up ${up}px in 1.1s`);
    }
    await page.evaluate(() => { text.scrollTop=0; text.focus(); text.setSelectionRange(0,0); });
    await page.keyboard.type('test');
    assert.ok(await page.evaluate(() => text.value.startsWith('testline')), 'keyboard input');

    await page.setContent(`<style>${css}</style><button id="about"></button><div id="exodus-root"></div>`);
    // Execute the real UI helpers/pages without starting the native Merlin session.
    const app = source.slice(0, source.indexOf('// ---------- init ----------'));
    await page.addScriptTag({content:app + String.raw`
        window.log={content:'success\n',running:false,id:'old'};
        window.notices=[]; window.releaseUpdate=null;
        toast=(message,type)=>notices.push({message:typeof message==='string'?message:message.textContent,type});
        confirmDialog=async()=>true;
        run=p=>p;
        api=async(action,params)=>{
            if(action==='log_read')return {...window.log};
            if(action==='check_update')return {...state.update,checking:!!params?.force};
            if(action==='update')return new Promise(resolve=>window.releaseUpdate=()=>resolve({id:'new'}));
            throw Error(action);
        };
        state.update={app:'1',app_latest:'2',app_update:true,core:'1',core_latest:'1',core_type:'mihomo'};
        window.showUpdates=()=>{
            state.timers.forEach(clearInterval);state.timers=[];state.pagePollers=[];renderToken++;
            append(clear(exodusRoot),pageUpdates());
        };
        window.poll=()=>Promise.all(state.pagePollers.map(p=>p()));
        showUpdates();
    })();`});
    await page.waitForTimeout(100);
    await page.getByRole('button',{name:'Update',exact:true}).click();
    await page.waitForFunction(() => !!window.releaseUpdate);
    assert.ok(await page.getByRole('button',{name:'Updating…',exact:true}).isDisabled());
    await page.evaluate(() => releaseUpdate());
    await page.waitForTimeout(100);
    assert.ok(await page.getByRole('button',{name:'Updating…',exact:true}).isDisabled(), 'old success log cannot finish new run');
    await page.evaluate(async () => { window.log={content:'Downloading…\n',running:true,id:'new'}; await poll(); });
    await page.evaluate(() => showUpdates());
    await page.waitForTimeout(100);
    assert.ok(await page.getByRole('button',{name:'Updating…',exact:true}).isDisabled(), 're-entry resumes running state');
    await page.evaluate(async () => { window.log={content:'error: network\n',running:false,id:'new'}; await poll(); });
    assert.ok(await page.getByText('Update failed. See the log below.',{exact:true}).isVisible());
    assert.equal(await page.evaluate(() => notices.at(-1).type), 'error');
    assert.ok(await page.getByRole('button',{name:'Update',exact:true}).isEnabled());
    await page.evaluate(async () => { window.log={content:'Installing…\n',running:true,id:'other'}; await poll(); });
    await page.evaluate(async () => { window.log={content:'[ OK ] Installation complete.\n',running:false,id:'other'}; await poll(); });
    assert.ok(await page.getByText('Update finished.',{exact:true}).first().isVisible());
    assert.match(await page.evaluate(() => notices.at(-1).message), /Update finished/);
    await page.evaluate(async () => { window.log={content:'Downloading…\n',running:true,id:'next'}; await poll(); });
    await page.evaluate(async () => { window.log={content:'Downloading…\n',running:false,id:'next'}; await poll(); });
    assert.ok(await page.getByText('Update stopped without a completion message. See the log below.',{exact:true}).isVisible());
    await page.getByRole('button',{name:'Check again',exact:true}).click();
    assert.ok(await page.getByRole('button',{name:'Checking…',exact:true}).isDisabled());
    const checking=page.getByRole('button',{name:'Checking…',exact:true});
    assert.equal(await checking.getAttribute('aria-busy'),'true','background checking stays visibly busy');
    assert.ok(await checking.locator('.refresh-icon.spin').count()>0,'spinner persists after launch response');
    await page.evaluate(()=>poll());
    assert.ok(await page.getByRole('button',{name:'Check again',exact:true}).isEnabled(),'finished check restores the button');
    assert.deepEqual(errors, []);
    console.log('PASS Editor selection + Updates launch, stale log, re-entry, error, success, interruption and background check');
} finally {
    await browser.close();
}
