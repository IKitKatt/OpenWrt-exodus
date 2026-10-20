import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
test('browser scripts survive Merlin do_ej template processing', () => {
    for (const file of ['app.js','merlin.js','i18n.js','editor.js']) {
        const source = readFileSync(new URL(file, www), 'utf8');
        // Unknown firmware directives disappear, including an unterminated directive at EOF.
        const served = source.replace(/<%[\s\S]*?(?:%>|$)/g, '');
        assert.doesNotThrow(() => new vm.Script(served, {filename:file}), `${file} after do_ej`);
        assert.ok(!source.includes('<%'), `${file} must not contain firmware template openers`);
    }
});

test('addon page declares its existing favicon instead of requesting /favicon.ico', () => {
    const page = readFileSync(new URL('Exodus.asp', www), 'utf8');
    assert.ok(page.includes('rel="icon"') && page.includes('href="/ext/exodus/favicon.svg"'));
});
