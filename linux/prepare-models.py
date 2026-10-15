"""Prepare manifest-pinned OCR models using only the Python standard library."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
MAX_BYTES = 256 * 1024 * 1024


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(manifest):
    if not isinstance(manifest, dict):
        raise ValueError('OCR 모델 manifest가 잘못되었습니다.')
    models = manifest.get('models')
    if not isinstance(models, list) or not models:
        raise ValueError('OCR 모델 목록이 없습니다.')
    seen = set()
    for model in models:
        if not isinstance(model, dict):
            raise ValueError('OCR 모델 항목이 잘못되었습니다.')
        name = model.get('file', '')
        if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*\.onnx', name):
            raise ValueError('OCR 모델 파일 이름이 잘못되었습니다.')
        if name.casefold() in seen:
            raise ValueError('OCR 모델 이름이 중복되었습니다: ' + name)
        seen.add(name.casefold())
        if not isinstance(model.get('sha256'), str) or not re.fullmatch(r'[0-9a-f]{64}', model['sha256']):
            raise ValueError('OCR 모델 해시가 잘못되었습니다: ' + name)
        source = model.get('source')
        if not isinstance(source, str):
            raise ValueError('OCR 모델 다운로드 주소가 없습니다: ' + name)
        check_url(source)
    return models


def check_url(source):
    url = urlsplit(source)
    if url.scheme != 'https' or not url.hostname or url.username or url.password:
        raise ValueError('OCR 모델 다운로드에는 HTTPS 주소가 필요합니다.')


def prepare(manifest, model_root, *, check_only=False, opener=urlopen):
    models = validate_manifest(manifest)
    model_root = Path(model_root).resolve()
    targets = []
    for model in models:
        target = model_root / model['file']
        if target.is_symlink() or target.resolve().parent != model_root:
            raise ValueError('OCR 모델 경로에 심볼릭 링크를 사용할 수 없습니다: ' + model['file'])
        targets.append((model, target))
    results = []
    for model, target in targets:
        valid = target.is_file() and checksum(target) == model['sha256']
        if valid:
            results.append({'file': model['file'], 'status': 'verified'})
            continue
        if check_only:
            raise ValueError('OCR 모델이 없거나 해시가 다릅니다: ' + model['file'])
        model_root.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=model_root, prefix='.model-', suffix='.tmp', delete=False) as output:
                temporary = Path(output.name)
                digest = hashlib.sha256()
                size = 0
                with opener(model['source'], timeout=60) as response:
                    check_url(response.geturl())
                    while chunk := response.read(1024 * 1024):
                        size += len(chunk)
                        if size > MAX_BYTES:
                            raise ValueError('OCR 모델 다운로드 용량 제한을 초과했습니다.')
                        digest.update(chunk)
                        output.write(chunk)
                output.flush()
                os.fsync(output.fileno())
            if digest.hexdigest() != model['sha256']:
                raise ValueError('다운로드한 OCR 모델의 해시가 다릅니다: ' + model['file'])
            if target.is_symlink():
                raise ValueError('OCR 모델 대상 경로가 변경되었습니다.')
            os.replace(temporary, target)
            results.append({'file': model['file'], 'status': 'downloaded', 'bytes': size})
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='인터넷 연결 없이 기존 모델만 검사')
    parser.add_argument('--models', type=Path, default=Path(os.environ.get('LINGUALENS_OCR_MODELS') or ROOT / 'vendor/ocr/models'))
    options = parser.parse_args()
    try:
        manifest = json.loads((ROOT / 'vendor/ocr/manifest.json').read_text(encoding='utf-8'))
        results = prepare(manifest, options.models, check_only=options.check)
    except (OSError, ValueError) as error:
        parser.exit(1, 'OCR 모델 준비 실패: ' + str(error) + '\n')
    print(json.dumps({'test': 'models', 'status': 'pass', 'models': results}, ensure_ascii=False))


if __name__ == '__main__':
    main()
