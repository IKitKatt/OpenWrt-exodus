import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../asuswrt/opt/share/exodus/www/app.js', import.meta.url), 'utf8');
function load(name, next, globals = {}) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} exists`);
    const end = source.indexOf(`\nfunction ${next}(`, start);
    return vm.runInNewContext(`${source.slice(start, end)}; ${name}`, globals);
}

test('update results distinguish failure, interruption, running and success', () => {
    const result = load('updateLogState', 'pageUpdates');
    assert.equal(result({content:'success\n', running:true}), 'running');
    assert.equal(result({content:'error: network\n', running:false}), 'error');
    assert.equal(result({content:'[ OK ] Installation complete.\n', running:false}), 'success');
    assert.equal(result({content:'downloading\n', running:false}), 'interrupted');
    assert.equal(result({content:'', running:false}), 'idle');
});

test('Editor has its own larger surface, without enlarging log fields', () => {
    const css = readFileSync(new URL('../../asuswrt/opt/share/exodus/www/style.css', import.meta.url), 'utf8');
    assert.match(source, /class: 'textarea editor-text'/);
    assert.match(css, /\.editor-text\s*\{[^}]*height:\s*60vh/);
});
