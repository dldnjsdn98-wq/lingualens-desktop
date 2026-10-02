"""Bundle source, tests, browser assets, models and optional Debian Python 3.13 wheels."""
import hashlib, json, tarfile, argparse
from pathlib import Path
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--wheels',type=Path);options=parser.parse_args()
version=(root/'version.txt').read_text().strip()
output=root/f'Language-Test-Linux-x64-{version}-preview.tar.gz'
prefix=f'Language-Test-Linux-x64-{version}'
manifest=json.loads((root/'vendor/ocr/manifest.json').read_text())
files=[]
for folder in ['src','linux']:
    files += [(p,p.relative_to(root).as_posix()) for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
for p in (root/'tests').glob('*.test.mjs'):files.append((p,p.relative_to(root).as_posix()))
for p in (root/'tests/fixtures').iterdir():
    if p.is_file():files.append((p,p.relative_to(root).as_posix()))
for path in ['tests/alignment.test.py','tests/headless-local.mjs','package.json',
             'version.txt','release-channel.json','README.md','LINUX.md',f'CHANGES-{version}.md',f'VALIDATION-{version}.md','THIRD_PARTY_NOTICES.md']:
    files.append((root/path,path))
for p in (root/'vendor').iterdir():
    if p.is_file():files.append((p,p.relative_to(root).as_posix()))
for name in ['manifest.json','RAPIDOCR-LICENSE.txt','PADDLEOCR-LICENSE.txt']:
    files.append((root/'vendor/ocr'/name,'vendor/ocr/'+name))
for model in manifest['models']:
    path=root/'vendor/ocr/packages/rapidocr/models'/model['file']
    if hashlib.sha256(path.read_bytes()).hexdigest()!=model['sha256']:raise RuntimeError('Bad model: '+model['file'])
    files.append((path,'vendor/ocr/models/'+model['file']))
if options.wheels:
    wheels=sorted(options.wheels.glob('*.whl'))
    if len(wheels)!=len(manifest['packages']):raise RuntimeError('Incomplete wheel bundle')
    lines=[]
    from zipfile import ZipFile
    from email import message_from_bytes
    expected={p['name'].lower().replace('_','-'):p['version'] for p in manifest['packages']}
    for path in wheels:
        with ZipFile(path) as wheel:
            metadata=message_from_bytes(wheel.read(next(n for n in wheel.namelist() if n.endswith('.dist-info/METADATA'))))
        name=metadata['Name'].lower().replace('_','-');version=metadata['Version']
        if expected.pop(name,None)!=version:raise RuntimeError('Unexpected wheel: '+path.name)
        lines.append(f'{name}=={version} --hash=sha256:{hashlib.sha256(path.read_bytes()).hexdigest()}')
        files.append((path,'vendor/ocr/wheels/'+path.name))
    if expected:raise RuntimeError('Missing packages')
    lock=root/'linux/requirements-debian13.txt';lock.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    files=[(p,n) for p,n in files if n!='linux/requirements-debian13.txt'];files.append((lock,'linux/requirements-debian13.txt'))
names=[name for _,name in files]
if len(names)!=len(set(names)):raise RuntimeError('Duplicate archive paths')
with tarfile.open(output,'w:gz',compresslevel=6) as archive:
    for source,name in files:
        info=archive.gettarinfo(str(source),prefix+'/'+name);info.mode=0o755 if name.endswith('.sh') else 0o644
        info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
        with source.open('rb') as content:archive.addfile(info,content)
with tarfile.open(output) as archive:
    members=archive.getmembers()
    if any(m.name.startswith('/') or '..' in Path(m.name).parts or m.issym() for m in members):raise RuntimeError('Unsafe archive')
    if any('.investigation' in m.name or '.exe' in m.name or 'projects/' in m.name for m in members):raise RuntimeError('Unexpected private or Windows files')
digest=hashlib.sha256(output.read_bytes()).hexdigest()
Path(str(output)+'.sha256').write_text(digest+'  '+output.name+'\n',encoding='ascii')
print(json.dumps({'file':str(output),'size':output.stat().st_size,'sha256':digest,'members':len(members)}))
