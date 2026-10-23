import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {discoverBrowserSuites} from './run-browser.mjs';

const directory = new URL('./', import.meta.url);
const runner = new URL('run-browser.mjs', directory);

test('browser runner discovers every present browser suite in sorted order', () => {
    const expected = readdirSync(directory).filter(name => name.endsWith('.browser.mjs')).sort();
    assert.ok(expected.length >= 3);
    assert.deepEqual(discoverBrowserSuites(directory), expected);
});

test('browser runner executes discovered suites and propagates failure', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'exodus-browser-runner-'));
    try {
        writeFileSync(join(fixture, 'b.browser.mjs'), "console.log('suite-b');\n");
        writeFileSync(join(fixture, 'a.browser.mjs'), "console.log('suite-a');\n");
        writeFileSync(join(fixture, 'ignored.test.mjs'), 'throw Error("not a browser suite");\n');
        const run = () => spawnSync(process.execPath, [fileURLToPath(runner), fixture], {encoding:'utf8'});
        const success = run();
        assert.equal(success.status, 0, success.stderr);
        assert.ok(success.stdout.indexOf('suite-a') < success.stdout.indexOf('suite-b'));
        assert.match(success.stdout, /suite-b/);
        writeFileSync(join(fixture, 'a.browser.mjs'), 'process.exit(7);\n');
        const failure = run();
        assert.equal(failure.status, 1, failure.stderr);
        assert.match(failure.stdout, /suite-b/, 'later suites still execute after failure');
        assert.match(failure.stderr, /a\.browser\.mjs/);
        rmSync(join(fixture, 'a.browser.mjs'));
        rmSync(join(fixture, 'b.browser.mjs'));
        const empty = run();
        assert.equal(empty.status, 1);
        assert.match(empty.stderr, /No browser suites found/);
    } finally {
        rmSync(fixture, {recursive:true, force:true});
    }
});
