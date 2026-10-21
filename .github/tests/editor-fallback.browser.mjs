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

    assert.deepEqual(errors, []);
    console.log('PASS plain Editor fallback selection scrolling and keyboard input');
} finally {
    await browser.close();
}
