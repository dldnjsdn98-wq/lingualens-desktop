import hashlib, json, platform, sys, os
from pathlib import Path
import cv2, numpy, PIL, onnxruntime, rapidocr
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'vendor/ocr/manifest.json').read_text(encoding='utf-8'))
model_root=Path(os.environ.get('LINGUALENS_OCR_MODELS') or root/'vendor/ocr/models')
for model in manifest['models']:
    path=model_root/model['file']
    if hashlib.sha256(path.read_bytes()).hexdigest()!=model['sha256']:
        raise RuntimeError('OCR model checksum mismatch: '+model['file'])
print(json.dumps({'test':'runtime','status':'pass','python':sys.version.split()[0],
                  'platform':platform.system(),'arch':platform.machine(),'libc':platform.libc_ver(),
                  'onnxruntime':onnxruntime.__version__,'opencv':cv2.__version__,'models':len(manifest['models'])}))
