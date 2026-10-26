// Run all browser suites: npm test --prefix .github/tests
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
const source = readFileSync(new URL('app.js', www), 'utf8');
const css = readFileSync(new URL('style.css', www), 'utf8');
const translations = readFileSync(new URL('i18n.js', www), 'utf8');
const browser = await chromium.launch({headless:true});
try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1280, 768, 375]) {
        await page.setViewportSize({width,height:900});
        for (const language of ['en', 'ru']) {
            await page.setContent(`<style>${css}</style><div id="exodus-root"><div id="toaster" class="toaster" aria-live="polite"></div></div>`);
            await page.addScriptTag({content:translations});
            await page.evaluate(lang => { window.ExodusBootstrap = {lang}; }, language);
            // Keep the real notification renderer and request success/error handling.
            await page.addScriptTag({content:source.slice(0, source.indexOf('// ---------- init ----------')) + `
                window.showNotice=(message,type)=>toast(message,type);
                window.showSaveResult=async(failed)=>{
                    try {
                        await run(failed ? Promise.reject(Error(_('Some fields are invalid, fix them before saving.'))) : Promise.resolve({}),
                            _('Settings are saved, the service is restarting.'));
                    } catch (_) { /* run already displayed the request error */ }
                };
            })();`});
            for (const scenario of ['save', 'failure', 'short', 'long', 'link']) {
                await page.evaluate(async scenario => {
                    document.getElementById('toaster').replaceChildren();
                    if (scenario === 'save' || scenario === 'failure') await showSaveResult(scenario === 'failure');
                    else if (scenario === 'short') showNotice('Ошибка', 'error');
                    else if (scenario === 'long') showNotice('Ошибка / error: ' + 'configuration.yaml/'.repeat(30), 'error');
                    else {
                        const link = document.createElement('a');
                        link.href = '#'; link.textContent = 'Reload the page';
                        showNotice(link, 'info');
                    }
                }, scenario);
                const notice = page.locator('.toast');
                const layout = await notice.evaluate(el => {
                    const [icon, message, close] = el.children;
                    const box = node => node.getBoundingClientRect().toJSON();
                    return {toast:box(el),icon:box(icon),message:box(message),close:box(close),
                        closeIcon:box(close.querySelector('svg')),overflow:el.scrollWidth>el.clientWidth};
                });
                const label = `${language}/${width}/${scenario}`;
                const center = box => box.y + box.height/2;
                for (const part of ['icon', 'message', 'close', 'closeIcon']) {
                    assert.ok(Math.abs(center(layout[part])-center(layout.toast))<=1, `${label}: ${part} must be vertically centered`);
                }
                assert.ok(!layout.overflow, `${label}: content must wrap without horizontal overflow`);
                assert.ok(layout.toast.x>=0 && layout.toast.right<=width, `${label}: toast stays in the viewport`);
                assert.ok(layout.icon.right<layout.message.x && layout.message.right<layout.close.x, `${label}: content columns do not overlap`);
                assert.ok(layout.close.width>=40 && layout.close.height>=40, `${label}: close keeps its full hit area`);
                await notice.getByRole('button', {name:language==='ru'?'Закрыть':'Close',exact:true}).focus();
                await page.keyboard.press('Enter');
                assert.equal(await notice.count(), 0, `${label}: keyboard dismissal works`);
            }
        }
    }
    assert.deepEqual(errors, []);
    console.log('PASS centered save/error toasts, long messages, links and keyboard dismissal (en/ru, desktop/tablet/mobile)');
} finally { await browser.close(); }
