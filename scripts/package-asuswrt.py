#!/usr/bin/env python3
"""Build a portable native Merlin runtime bundle from the current working tree."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

ROOT=Path(__file__).resolve().parents[1]
PREFIX='exodus-native'

LAUNCHER='''#!/bin/sh
bundle_dir=$(cd "$(dirname "$0")" && pwd -P) || exit 1
cd "$bundle_dir" || exit 1
[ -s SHA256SUMS ] || { echo 'error: missing bundle checksums'; exit 1; }
if sha256sum /dev/null >/dev/null 2>&1; then
 digest() { sha256sum "$1" | awk '{print $1}'; }
else
 digest() { openssl dgst -sha256 -r "$1" | awk '{print $1}'; }
fi
while IFS= read -r line; do
 expected=${line%%  *}
 file=${line#*  }
 case "$file" in ''|/*|*../*) echo 'error: invalid checksum path'; exit 1 ;; esac
 actual=$(digest "$file" 2>/dev/null)
 [ "$actual" = "$expected" ] || { echo "error: bundle checksum mismatch: $file"; exit 1; }
done < SHA256SUMS
SOURCE_DIR="$bundle_dir"
export SOURCE_DIR
exec sh "$bundle_dir/install.sh"
'''


def build(output):
    paths=[ROOT/'install.sh',ROOT/'uninstall.sh',ROOT/'INSTALL-ASUSWRT.RU.md',
           ROOT/'asuswrt/opt/etc/init.d/S99exodus',ROOT/'asuswrt/opt/etc/exodus/config.json',
           ROOT/'asuswrt/opt/etc/exodus/mixin.yaml',*(ROOT/'asuswrt/opt/share/exodus').rglob('*')]
    files={}
    for path in sorted(paths):
        if not path.is_file(): continue
        name=path.relative_to(ROOT).as_posix()
        if name.endswith(('.pyc','.new','.old')) or '__pycache__' in name: continue
        if name=='INSTALL-ASUSWRT.RU.md': name='INSTALL-RU.md'
        files[name]=path.read_bytes().replace(b'\r\n',b'\n')
    version=files['asuswrt/opt/share/exodus/VERSION'].decode().strip()
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    dirty=subprocess.run(['git','diff','--quiet','--','install.sh','uninstall.sh','asuswrt'],cwd=ROOT).returncode!=0
    source_hash=hashlib.sha256(b''.join(name.encode()+b'\0'+files[name] for name in sorted(files))).hexdigest()
    files['PACKAGE.json']=(json.dumps({'version':version,'source_commit':commit,'working_tree_changes':dirty,'source_sha256':source_hash},indent=2)+'\n').encode()
    files['install-local.sh']=LAUNCHER.encode()
    files['SHA256SUMS']=''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name,data in sorted(files.items())).encode()
    output.mkdir(parents=True,exist_ok=True)
    archive=output/f'exodus-asuswrt-native-{version}-{source_hash[:8]}.tar.gz'
    with archive.open('wb') as raw, gzip.GzipFile(fileobj=raw,mode='wb',mtime=0,filename='') as zipped, tarfile.open(fileobj=zipped,mode='w',format=tarfile.PAX_FORMAT) as bundle:
        for name,data in sorted(files.items()):
            entry=tarfile.TarInfo(f'{PREFIX}/{name}')
            entry.size=len(data)
            entry.mode=0o755 if name.endswith('.sh') or name.endswith('/exodus') or name.endswith('/S99exodus') else 0o644
            bundle.addfile(entry,io.BytesIO(data))
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(archive.suffix+'.sha256').write_text(f'{digest}  {archive.name}\n',encoding='ascii')
    print(archive)
    print(f'SHA256 {digest}')
    return archive


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'docs/releases')
    build(parser.parse_args().output)
