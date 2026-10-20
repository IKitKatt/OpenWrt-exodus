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
await writeFile(resolve(output,'editor.js'),result.outputFiles[0].contents);
await writeFile(resolve(output,'editor.LICENSE.txt'),licenses.join('\n\n--------------------\n\n'));
console.log(`editor.js: ${result.outputFiles[0].contents.length} bytes; ${packages.length} packages; licenses included`);
