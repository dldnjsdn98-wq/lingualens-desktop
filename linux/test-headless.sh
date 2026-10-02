#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$APP_ROOT"
REPORT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/language-test-report.XXXXXX")"
export LINGUALENS_PYTHON="${LINGUALENS_PYTHON:-$APP_ROOT/vendor/ocr/venv/bin/python}"
export LINGUALENS_OCR_MODELS="${LINGUALENS_OCR_MODELS:-$APP_ROOT/vendor/ocr/models}"
export XDG_DATA_HOME="$REPORT_DIR/data" XDG_CACHE_HOME="$REPORT_DIR/cache"
trap 'echo "테스트 로그: $REPORT_DIR"' EXIT
node --test tests/*.test.mjs 2>&1 | tee "$REPORT_DIR/node-tests.txt"
node linux/launch.mjs --selftest 2>&1 | tee "$REPORT_DIR/launcher.txt"
if [[ "${1:-}" == --skip-ocr ]]; then
  echo 'SKIP: OCR runtime, alignment and actual OCR smoke tests' | tee "$REPORT_DIR/ocr-skipped.txt"
else
  "$LINGUALENS_PYTHON" linux/check-runtime.py 2>&1 | tee "$REPORT_DIR/runtime.txt"
  "$LINGUALENS_PYTHON" -B tests/alignment.test.py 2>&1 | tee "$REPORT_DIR/alignment.txt"
  node tests/headless-local.mjs 2>&1 | tee "$REPORT_DIR/local-ocr.txt"
fi
echo '요청한 테스트가 모두 통과했습니다. skip-ocr 사용 시 OCR은 검증되지 않았습니다.'
