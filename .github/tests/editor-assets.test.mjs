import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const www = new URL('../../asuswrt/opt/share/exodus/www/', import.meta.url);
test('browser scripts survive Merlin do_ej template processing', () => {
    for (const file of ['app.js','merlin.js','i18n.js','editor.js']) {
        const source = readFileSync(new URL(file, www), 'utf8');
        const served = source.replace(/<%[\s\S]*?(?:%>|$)/g, '');
        assert.doesNotThrow(() => new vm.Script(served, {filename:file}), `${file} after do_ej`);
        assert.ok(!source.includes('<%'), `${file} must not contain firmware template openers`);
    }
});

test('Editor has its own larger surface, without enlarging log fields', () => {
    const source = readFileSync(new URL('app.js', www), 'utf8');
    const css = readFileSync(new URL('style.css', www), 'utf8');
    assert.match(source, /class: 'textarea editor-text'/);
    assert.match(css, /\.editor-text\s*\{[^}]*height:\s*60vh/);
});
