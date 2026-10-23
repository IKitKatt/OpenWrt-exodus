// Run all browser suites: npm test --prefix .github/tests
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
        window.showSettingsSave=()=>{
            state.timers.forEach(clearInterval); state.timers=[];
            state.config={value:'original'}; state.draft=clone(state.config);
            append(clear(exodusRoot),[E('div',{id:'savebar'}),input(ref('value'))]);
            renderSavebar(); updateDirty();
            api=async(action,params)=>{
                if(action!=='config_set')throw Error(action);
                window.submitted=clone(params.config);
                return new Promise((resolve,reject)=>{window.finishSave=resolve;window.failSave=()=>reject(Error('save failed'));});
            };
        };
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
    await page.evaluate(()=>showSettingsSave());
    await page.locator('#exodus-root input').fill('submitted');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.waitForFunction(()=>!!window.finishSave);
    await page.locator('#exodus-root input').fill('later');
    await page.evaluate(()=>finishSave({}));
    await page.waitForFunction(()=>document.querySelector('#savebar button[aria-busy="false"]'));
    assert.equal(await page.evaluate(()=>submitted.value),'submitted');
    assert.ok(await page.locator('#savebar').isVisible(),'edit during save remains dirty');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.evaluate(()=>failSave());
    await page.waitForFunction(()=>document.querySelector('#savebar button[aria-busy="false"]'));
    await page.locator('#exodus-root input').fill('submitted');
    assert.ok(await page.locator('#savebar').isHidden(),'failed save did not advance submitted baseline');
    assert.deepEqual(errors, []);
    console.log('PASS Updates launch, stale log, re-entry, error, success, interruption and background check');
} finally {
    await browser.close();
}
