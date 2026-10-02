#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$APP_ROOT"
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo '이 설치 구성은 Linux x86_64용입니다.' >&2; exit 1
fi
node -e 'if(Number(process.versions.node.split(".")[0])<20)throw Error("Node.js 20+ required")'
python3 -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
python3 -m venv vendor/ocr/venv
if [[ -d vendor/ocr/wheels && "$(vendor/ocr/venv/bin/python -c 'import sys;print(str(sys.version_info.major)+"."+str(sys.version_info.minor))')" == 3.13 ]]; then
  vendor/ocr/venv/bin/python -m pip install --no-index --find-links vendor/ocr/wheels --require-hashes -r linux/requirements-debian13.txt
else
  vendor/ocr/venv/bin/python -m pip install --only-binary=onnxruntime,opencv-python,numpy,pillow,shapely,pyclipper,PyYAML -r linux/requirements.txt
fi
vendor/ocr/venv/bin/python linux/check-runtime.py
echo '설치 완료. ./linux/start.sh 또는 ./linux/test-headless.sh 를 실행하세요.'
