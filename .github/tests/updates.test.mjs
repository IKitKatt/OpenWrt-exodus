import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../asuswrt/opt/share/exodus/www/app.js', import.meta.url), 'utf8');
test('update results distinguish failure, interruption, running and success', () => {
    const start = source.indexOf('function updateLogState(');
    assert.notEqual(start, -1);
    const end = source.indexOf('\nfunction pageUpdates(', start);
    const result = vm.runInNewContext(`${source.slice(start, end)}; updateLogState`);
    assert.equal(result({content:'success\n', running:true}), 'running');
    assert.equal(result({content:'error: network\n', running:false}), 'error');
    assert.equal(result({content:'[ OK ] Installation complete.\n', running:false}), 'success');
    assert.equal(result({content:'downloading\n', running:false}), 'interrupted');
    assert.equal(result({content:'', running:false}), 'idle');
});
