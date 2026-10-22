import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
test('browser scripts survive Merlin do_ej template processing', () => {
    for (const file of ['app.js','merlin.js','i18n.js']) {
        const source = readFileSync(new URL(file, www), 'utf8');
        const served = source.replace(/<%[\s\S]*?(?:%>|$)/g, '');
        assert.doesNotThrow(() => new vm.Script(served, {filename:file}), `${file} after do_ej`);
        assert.ok(!source.includes('<%'), `${file} must not contain firmware template openers`);
    }
});

test('addon page uses the standard ASUS favicon', () => {
    const page = readFileSync(new URL('Exodus.asp', www), 'utf8');
    assert.ok(page.includes('rel="icon"') && page.includes('href="/images/favicon.png"'));
    assert.ok(!page.includes('href="/ext/exodus/favicon.svg"'));
});

test('firmware unload listeners use pagehide only while state.js loads', () => {
    const page = readFileSync(new URL('Exodus.asp', www), 'utf8');
    const [before,after]=page.split('<script src="/state.js"></script>');
    const registrations=[], original=function(...args){registrations.push({self:this,args});};
    const window={addEventListener:original}, context=vm.createContext({window});
    for(const script of before.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1],context);
    const save=()=>{}, options={once:true};
    window.addEventListener('unload',save,options);
    assert.equal(registrations[0].args[0],'pagehide');
    assert.equal(registrations[0].args[1],save);
    assert.equal(registrations[0].args[2],options);
    assert.equal(registrations[0].self,window);
    window.addEventListener('visibilitychange',save,options);
    assert.equal(registrations[1].args[0],'visibilitychange','other events are unchanged');
    vm.runInContext(after.match(/<script>([\s\S]*?)<\/script>/)[1],context);
    assert.equal(window.addEventListener,original,'restore the native event method');
});
