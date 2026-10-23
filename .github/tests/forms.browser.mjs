// Run all browser suites: npm test --prefix .github/tests
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
const source = readFileSync(new URL('app.js', www), 'utf8');
const css = readFileSync(new URL('style.css', www), 'utf8');
const translations = readFileSync(new URL('i18n.js', www), 'utf8');
const config = JSON.parse(readFileSync(new URL('../../asuswrt/opt/etc/exodus/config.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({headless:true});
try {
    const page = await browser.newPage({viewport:{width:1280,height:900}}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const language of ['en', 'ru']) {
        await page.setContent(`<style>${css}</style><div id="exodus-root"><nav id="menu"><a href="#ports">Ports</a></nav><div id="savebar"></div><div id="content"></div><div id="dialog" hidden></div></div>`);
        await page.addScriptTag({content:translations});
        await page.evaluate(lang => { window.ExodusBootstrap = {lang}; }, language);
        await page.addScriptTag({content:source.slice(0, source.indexOf('// ---------- init ----------')) + `
            window.submissions=[]; window.notices=[];
            api=async(action, params)=>{ if(action!=='config_set')throw Error(action); submissions.push(clone(params.config)); return {}; };
            toast=message=>notices.push(message); run=p=>p;
            state.config={ports:'80',marks:[62]}; state.draft=clone(state.config);
            renderSavebar();
            append(document.getElementById('content'),[
                field('Ports',input(ref('ports'),{type:'portlist',values:['80','443']}),'Keep other ports direct.'),
                field('Marks',tags(ref('marks'),{type:'dscp',number:true}),'Marks choose the route.'),
                field('Initial invalid',input(objRef({value:'wrong'},'value'),{type:'port'})),
                btn('Submit',{onClick:()=>save('none')})
            ]);
            window.saveCurrent=()=>save('none'); window.rerender=render;
            window.showSubscription=(subscription={id:'one',name:'Plan',url:'https://example.test',update_interval:1})=>subscriptionDialog(subscription,value=>window.accepted=value);
            window.renderSettings=async()=>{
                currentPage=()=>pages.find(page=>page[0]==='settings');
                state.config=${JSON.stringify(config)}; state.draft=clone(state.config);
                await render();
            };
            window.showValidation=(type,value,withList)=>{
                state.invalid.clear();
                append(clear(document.getElementById('content')),field('Value',input(objRef({value},'value'),{type,values:withList?['7890']:null})));
            };
            changed();
        })();`});
        const initial = page.getByLabel('Initial invalid', {exact:true});
        const initialError = page.locator('.field').filter({has:initial}).locator('.field-error');
        assert.equal(await initialError.count(), 1, 'invalid saved values have a local explanation on first render');
        assert.ok(await initialError.isVisible());
        await initial.fill('7890');
        assert.ok(await initialError.isHidden());

        const ports = page.getByLabel('Ports', {exact:true});
        await ports.fill('not-a-number');
        const portError = page.locator('.field').filter({has:ports}).locator('.field-error');
        assert.ok(await portError.isVisible(), 'invalid text has a visible recovery message');
        assert.equal(await ports.getAttribute('aria-invalid'), 'true');
        const description = await ports.evaluate(el => el.getAttribute('aria-describedby').split(/\s+/).map(id => ({text:document.getElementById(id).textContent,hidden:document.getElementById(id).hidden})));
        assert.equal(description.length, 2, 'validation preserves the existing description');
        assert.ok(description.some(item => item.text === 'Keep other ports direct.'));
        assert.ok(description.some(item => !item.hidden && /80.*443.*1000-2000/.test(item.text)), 'error includes an example');
        assert.equal(/[А-Яа-я]/.test(await portError.textContent()), language === 'ru', 'error follows firmware language');
        await ports.fill('still-wrong');
        assert.equal(await page.locator('.field').filter({has:ports}).locator('.field-error').count(), 1, 'repeated edits do not duplicate errors');
        await page.getByRole('button', {name:'Submit',exact:true}).click();
        assert.equal(await page.evaluate(() => submissions.length), 0, 'invalid text cannot be saved');
        assert.ok(await ports.evaluate(el => el === document.activeElement), 'save focuses the failing input');
        await ports.fill('80 443 1000-2000');
        assert.ok(await portError.isHidden());
        assert.equal(await ports.getAttribute('aria-invalid'), 'false');

        const marks = page.getByLabel('Marks', {exact:true});
        await marks.fill('64');
        await marks.press('Enter');
        const markError = page.locator('.field').filter({has:marks}).locator('.field-error');
        assert.ok(await markError.isVisible(), 'tag input has the same inline feedback');
        assert.equal(await marks.getAttribute('aria-invalid'), 'true', 'ARIA state belongs to the editable input');
        assert.match(await markError.textContent(), /0.*63/);
        assert.ok((await marks.getAttribute('aria-describedby')).split(/\s+/).includes(await markError.getAttribute('id')));
        await page.getByRole('button', {name:'Submit',exact:true}).click();
        assert.equal(await page.evaluate(() => submissions.length), 0, 'bad tag cannot be saved');
        assert.ok(await marks.evaluate(el => el === document.activeElement), 'save focuses the tag entry, not its container');
        await marks.fill('63');
        await marks.press('Enter');
        assert.ok(await markError.isHidden());
        assert.equal(await marks.getAttribute('aria-invalid'), 'false');
        await page.getByRole('button', {name:'Submit',exact:true}).click();
        assert.deepEqual(await page.evaluate(() => submissions), [{ports:'80 443 1000-2000',marks:[62,63]}], 'only corrected values reach the router');
        await marks.fill('wrong'); await marks.press('Enter');
        await marks.fill('');
        assert.ok(await markError.isHidden(), 'clearing an invalid pending tag clears its error');
        for (const [type,bad,good] of [
            ['port','65536','7890'],['uinteger','-1','0'],['dscp','64','63'],
            ['mac','invalid','00:11:22:33:44:55'],['ip4','999.0.0.1','192.168.1.0/24'],
            ['ip6','invalid','2001:db8::/32'],['cron','* *','0 3 * * *'],['portlist','invalid','80 443 1000-2000']
        ]) {
            await page.evaluate(([type,value])=>showValidation(type,value,true), [type,bad]);
            const value=page.getByLabel('Value',{exact:true}), error=page.locator('.field-error');
            assert.ok(await error.isVisible(), `${type}: invalid initial values with a datalist show their error`);
            assert.equal(/[А-Яа-я]/.test(await error.textContent()), language==='ru');
            await value.fill(good); assert.ok(await error.isHidden(), `${type}: correction clears feedback`);
            await value.fill(bad); assert.ok(await error.isVisible(), `${type}: malformed input shows feedback`);
            await value.fill(''); assert.ok(await error.isHidden(), `${type}: optional empty value is accepted`);
        }
        await page.evaluate(()=>{window.accepted=null;showSubscription({id:'new',name:'',url:''});});
        assert.equal(await page.locator('[role=dialog] input[required]').count(),2,'subscription name and URL are semantically required');
        const name=page.getByRole('textbox',{name:language==='ru'?/^Название/:/^Name/});
        const url=page.getByRole('textbox',{name:/^URL(?: \(|$)/});
        const nameError=page.locator('.field').filter({has:name}).locator('.field-error');
        const urlError=page.locator('.field').filter({has:url}).locator('.field-error');
        const done=page.getByRole('button',{name:language==='ru'?'Готово':'Done',exact:true});
        assert.match(await name.evaluate(el=>el.labels[0].textContent),language==='ru'?/обязательно/:/required/,'requiredness is visible before submission');
        assert.ok(await nameError.isHidden()); assert.ok(await urlError.isHidden());
        await done.click();
        assert.ok(await nameError.isVisible()); assert.ok(await urlError.isVisible());
        assert.ok(await name.evaluate(el=>el===document.activeElement),'Done focuses the first missing field');
        assert.equal(await page.evaluate(()=>accepted),null,'an incomplete subscription never reaches onSave');
        for(const control of [name,url]) {
            assert.equal(await control.getAttribute('aria-invalid'),'true');
            const descriptions=await control.evaluate(el=>el.getAttribute('aria-describedby').split(/\s+/).map(id=>document.getElementById(id)) .filter(el=>!el.hidden).map(el=>el.textContent));
            assert.ok(descriptions.some(text=>/[А-Яа-я]/.test(text)===(language==='ru')),'local errors follow the firmware language');
        }
        const subscriptionName='План 🛰️ <test> '+ '長い名前'.repeat(30);
        await name.fill('  '+subscriptionName+'  ');
        assert.ok(await nameError.isHidden());
        await done.click(); assert.ok(await url.evaluate(el=>el===document.activeElement));
        await url.fill('  https://example.test/sub?token=a%26b&lang=ru  ');
        assert.ok(await urlError.isHidden());
        await name.fill('   '); await done.click();
        assert.ok(await nameError.isVisible());
        assert.equal(await page.evaluate(()=>accepted),null,'clearing a previously valid name cannot submit its stale draft value');
        await name.fill(subscriptionName); await done.click();
        assert.equal(await page.getByRole('dialog').count(),0);
        assert.deepEqual(await page.evaluate(()=>accepted),{id:'new',name:subscriptionName,url:'https://example.test/sub?token=a%26b&lang=ru'});
        await page.evaluate(()=>showSubscription({id:'new',name:'',url:''}));
        assert.equal(await page.locator('[role=dialog] .field-error:visible').count(),0,'reopening starts without stale errors');
        await page.getByRole('button',{name:language==='ru'?'Отмена':'Cancel',exact:true}).click();
        await page.evaluate(()=>showSubscription());
        const interval=page.getByLabel(language==='ru'?'Интервал обновления, часов':'Update interval, hours',{exact:true});
        await interval.fill('-1');
        await page.getByRole('button',{name:language==='ru'?'Готово':'Done',exact:true}).click();
        assert.ok(await page.getByRole('dialog').isVisible(), 'Done cannot silently accept the previous value of an invalid field');
        assert.ok(await interval.evaluate(el=>el===document.activeElement));
        await page.getByRole('button',{name:language==='ru'?'Отмена':'Cancel',exact:true}).click();
        await page.evaluate(()=>showSubscription());
        await interval.fill('2');
        await page.getByRole('button',{name:language==='ru'?'Готово':'Done',exact:true}).click();
        assert.equal(await page.evaluate(()=>accepted.update_interval),2);
        await page.evaluate(()=>saveCurrent());
        assert.equal(await page.evaluate(()=>submissions.length),2,'cancelled invalid dialog must not block saving the page');
        await page.evaluate(()=>renderSettings());
        const tcp=page.getByLabel(language==='ru'?'Проксируемые порты TCP':'TCP ports to proxy',{exact:true});
        await tcp.fill('wrong');
        await page.evaluate(()=>rerender());
        await tcp.fill('443');
        await page.getByRole('button',{name:language==='ru'?'Сохранить':'Save',exact:true}).click();
        assert.equal(await page.evaluate(()=>submissions.length),3,'removed invalid controls must not poison subsequent saves');
        console.log(`PASS localized validation, preserved hints, tag recovery, dialog lifecycle and safe save (${language})`);
    }

    // Actual computed focus colors must remain visible on every application surface.
    await page.setContent(`<style>${css}</style><div id="exodus-root"><button class="btn btn-ghost">Focus</button><div class="card"><input class="input invalid" aria-label="Invalid"><div class="tags"><input aria-label="Tags"></div><div class="cm-editor cm-focused"></div></div></div>`);
    await page.keyboard.press('Tab');
    const luminance = color => {
        const [r,g,b] = color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(value => value/255).map(value => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
        return 0.2126*r + 0.7152*g + 0.0722*b;
    };
    const surfaces = await page.locator('#exodus-root').evaluate(el => ['--surface','--surface-raised','--surface-subtle','--accent-soft'].map(token => {
        const probe=document.createElement('div'); probe.style.backgroundColor=`var(${token})`; el.append(probe);
        const color=getComputedStyle(probe).backgroundColor; probe.remove(); return {token,color};
    }));
    for (const [selector,outlineSelector] of [['button','button'],['.input','.input'],['.tags input','.tags'],['.cm-editor','.cm-editor']]) {
        if (selector!=='.cm-editor') await page.locator(selector).focus();
        const outline = await page.locator(outlineSelector).evaluate(el => ({color:getComputedStyle(el).outlineColor,width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
        assert.ok(outline.width>=2 && outline.style!=='none', `${selector} has a visible focus outline`);
        for (const {token,color} of surfaces) {
            const levels=[luminance(outline.color),luminance(color)].sort((a,b)=>a-b);
            const ratio=(levels[1]+0.05)/(levels[0]+0.05);
            assert.ok(ratio>=3, `${selector} focus on ${token}: ${ratio.toFixed(2)}:1 must reach 3:1`);
        }
    }
    assert.deepEqual(errors, []);
    console.log('PASS focus contrast across canvas, cards, popovers and selection surfaces');
} finally { await browser.close(); }
