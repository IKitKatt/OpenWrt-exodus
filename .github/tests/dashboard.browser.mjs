// Run all browser suites: npm test --prefix .github/tests
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
const source = readFileSync(new URL('app.js', www), 'utf8');
const css = readFileSync(new URL('style.css', www), 'utf8');
const defaults = JSON.parse(readFileSync(new URL('../../asuswrt/opt/etc/exodus/config.json', import.meta.url), 'utf8'));
const miboard = 'https://github.com/blagodaren/miboard/releases/latest/download/dist.zip';
const zashboard = 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist-cdn-fonts.zip';
const browser = await chromium.launch({headless:true});
try {
    const page = await browser.newPage({viewport:{width:1100,height:900}}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://router.test/', route => route.fulfill({contentType:'text/html',
        body:`<style>${css}</style><div id="exodus-root"><div id="savebar"></div><div id="content"></div><div id="toaster"></div></div>`}));
    await page.goto('http://router.test/');
    await page.evaluate(config => { window.defaults = config; }, defaults);
    // Real settings, select binding and save flow; only router I/O is replaced.
    await page.addScriptTag({content:source.slice(0, source.indexOf('// ---------- init ----------')) + `
        window.showSettings=(url=defaults.mixin.ui_url)=>{
            state.config=clone(defaults); state.config.mixin.ui_url=url; state.draft=clone(state.config);
            state.invalid.clear(); dependents=[];
            append(clear(document.getElementById('content')),pageSettings());
            renderSavebar(); updateDirty();
        };
        api=async(action,params)=>{
            if(action!=='config_set')throw Error(action);
            window.submitted=clone(params); return {};
        };
        window.open=(...args)=>{ window.opened=args; };
        window.openPanel=(info)=>{ state.status={running:true,api:info}; openDashboard(); };
        window.savedPanel=()=>state.config.mixin.ui_url;
        showSettings();
    })();`});
    await page.getByRole('tab', {name:'Mihomo',exact:true}).click();
    const panel = page.getByLabel('Panel', {exact:true});
    assert.equal(defaults.mixin.ui_url, zashboard, 'default must remain Zashboard');
    assert.equal(await panel.inputValue(), zashboard, 'rendering does not migrate the default');
    assert.deepEqual(await panel.locator('option').allTextContents(), ['From profile', 'Zashboard', 'MIBoard', 'MetaCubeXD', 'YACD']);
    await panel.selectOption({label:'MIBoard'});
    assert.equal(await panel.inputValue(), miboard);
    assert.ok(await page.locator('#savebar').isVisible(), 'selecting MIBoard marks the draft dirty');
    await page.getByRole('button', {name:'Save',exact:true}).click();
    await page.waitForFunction(() => document.getElementById('savebar').hidden);
    const submitted = await page.evaluate(() => window.submitted);
    assert.deepEqual(submitted, {config:{...defaults,mixin:{...defaults.mixin,ui_url:miboard}},apply:'none'});
    assert.equal(await page.evaluate(() => savedPanel()), miboard, 'save retains MIBoard URL');

    for (const url of [miboard, zashboard, 'https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip',
        'https://github.com/MetaCubeX/Yacd-meta/archive/refs/heads/gh-pages.zip', 'https://example.test/custom.zip', null]) {
        await page.evaluate(url => showSettings(url), url);
        assert.equal(await panel.inputValue(), url || '', 'saved, custom and profile choices remain selected');
        assert.ok(await page.locator('#savebar').isHidden(), 'rendering does not change stored settings');
    }

    for (const tls of [false,true]) {
        await page.evaluate(({url,tls}) => openPanel({listen:':9090',tls_listen:tls?':9443':'',ui_name:'miboard',ui_url:url,secret:'test secret+&'}), {url:miboard,tls});
        const [address, target, features] = await page.evaluate(() => opened);
        const opened = new URL(address);
        assert.equal(opened.protocol, tls?'https:':'http:');
        assert.equal(opened.port, tls?'9443':'9090');
        assert.equal(opened.pathname, '/ui/miboard/');
        assert.equal(opened.searchParams.get('port'), opened.port);
        assert.equal(opened.searchParams.get('secret'), 'test secret+&');
        assert.equal(opened.searchParams.get('host'), await page.evaluate(() => location.hostname));
        assert.equal(opened.searchParams.get('hostname'), opened.searchParams.get('host'));
        assert.equal(opened.hash, '#/setup?' + opened.search.slice(1), 'setup receives current API credentials');
        assert.equal(target, '_blank'); assert.equal(features, 'noopener');
    }
    assert.deepEqual(errors, []);
    console.log('PASS MIBoard selection/save, unchanged default/custom/profile panels and API links (HTTP/HTTPS)');
} finally { await browser.close(); }
