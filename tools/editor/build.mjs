import {build} from 'esbuild';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(root, '../../asuswrt/opt/share/exodus/www');
const result = await build({
    absWorkingDir: root, entryPoints: ['editor.js'], bundle: true, minify: true,
    format: 'iife', target: 'es2020', write: false, metafile: true, legalComments: 'none',
    banner: {js: '/* CodeMirror YAML editor. Build: tools/editor. Licenses: editor.LICENSE.txt. */'}
});
const packages = [...new Set(Object.keys(result.metafile.inputs).filter(p=>p.startsWith('node_modules/')).map(p=>{
    const parts=p.slice('node_modules/'.length).split('/');
    return parts.slice(0,parts[0].startsWith('@')?2:1).join('/');
}))].sort();
const licenses = [];
for (const name of packages) {
    const folder=resolve(root,'node_modules',name);
    const info=JSON.parse(await readFile(resolve(folder,'package.json'),'utf8'));
    licenses.push(`${name} ${info.version}\n${await readFile(resolve(folder,'LICENSE'),'utf8')}`);
}
// Merlin runs do_ej on JS too; YAML parser tables must not contain ASP openers.
const code = result.outputFiles[0].text.replaceAll('<%', '\\x3c%');
await writeFile(resolve(output,'editor.js'),code);
await writeFile(resolve(output,'editor.LICENSE.txt'),licenses.join('\n\n--------------------\n\n'));
console.log(`editor.js: ${Buffer.byteLength(code)} bytes; ${packages.length} packages; licenses included`);
