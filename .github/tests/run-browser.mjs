import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function discoverBrowserSuites(directory) {
    return readdirSync(directory).filter(name => name.endsWith('.browser.mjs')).sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const directory = process.argv[2] || fileURLToPath(new URL('./', import.meta.url));
    const suites = discoverBrowserSuites(directory);
    if (!suites.length) {
        console.error('No browser suites found');
        process.exitCode = 1;
    }
    for (const suite of suites) {
        console.log(`Browser suite: ${suite}`);
        const result = spawnSync(process.execPath, [resolve(directory, suite)], {stdio:'inherit'});
        if (result.error || result.status !== 0) {
            console.error(`Browser suite failed: ${suite}`, result.error || result.signal || result.status);
            process.exitCode = 1;
        }
    }
}
