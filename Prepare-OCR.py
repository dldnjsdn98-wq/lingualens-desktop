"""Rebuild the private OCR bundle using Python 3.12; no global pip changes."""
import sys, json, hashlib, urllib.request, zipfile, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
if sys.version_info[:2]!=(3,12):
    raise SystemExit('Use Python 3.12 to prepare the Windows x64 OCR bundle.')
dest=root/'vendor/ocr';dest.mkdir(parents=True,exist_ok=True)
archive=root/'.investigation/python-embed.zip';archive.parent.mkdir(exist_ok=True)
url='https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip'
urllib.request.urlretrieve(url,archive)
if hashlib.md5(archive.read_bytes()).hexdigest()!='fe8ef205f2e9c3ba44d0cf9954e1abd3':
    raise SystemExit('Python distribution checksum mismatch')
with zipfile.ZipFile(archive) as source:source.extractall(dest)
(dest/'python312._pth').write_text('python312.zip\n.\npackages\nimport site\n',encoding='ascii')
subprocess.run([sys.executable,'-m','pip','install','--target',str(dest/'packages'),'--upgrade',
                'rapidocr==3.9.2','onnxruntime==1.30.0','opencv-python==5.0.0.93','numpy==2.5.3','Pillow==12.3.0'],check=True)
sys.path.insert(0,str(dest/'packages'))
import yaml
from importlib.metadata import distributions
config=yaml.safe_load((dest/'packages/rapidocr/default_models.yaml').read_text(encoding='utf8'))
entries={}
def walk(value):
    if isinstance(value,dict):
        if 'model_dir' in value and 'SHA256' in value:entries[value['model_dir'].rsplit('/',1)[-1]]=value
        for item in value.values():walk(item)
walk(config)
models=[]
for name in ['ch_ppocr_mobile_v2.0_cls_mobile.onnx','korean_PP-OCRv5_rec_mobile.onnx','PP-OCRv6_det_small.onnx','PP-OCRv6_rec_small.onnx']:
    entry=entries[name];target=dest/'packages/rapidocr/models'/name
    if not target.exists():urllib.request.urlretrieve(entry['model_dir'],target)
    sha=hashlib.sha256(target.read_bytes()).hexdigest()
    if sha!=entry['SHA256']:raise SystemExit('OCR model checksum mismatch: '+name)
    models.append({'file':name,'source':entry['model_dir'],'sha256':sha,'license':'Apache-2.0','upstream':'https://github.com/PaddlePaddle/PaddleOCR'})
for source,target in [('https://raw.githubusercontent.com/RapidAI/RapidOCR/main/LICENSE','RAPIDOCR-LICENSE.txt'),
                      ('https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/main/LICENSE','PADDLEOCR-LICENSE.txt')]:
    urllib.request.urlretrieve(source,dest/target)
packages=[{'name':d.metadata['Name'],'version':d.version} for d in distributions(path=[str(dest/'packages')])]
(dest/'manifest.json').write_text(json.dumps({'python':'3.12.10','pythonSource':url,'models':models,'packages':packages},indent=2),encoding='utf8')
print('OCR bundle prepared; run Build-Release.ps1 next.')
