# Language Test Linux x64 테스트용 배포

대상: Debian GNU/Linux 13.6, x86_64, glibc 2.41. 같은 앱 소스를 사용하며 Linux용 경로·실행·폴더 선택을 분리했습니다. **Windows에서 공통 로직과 OCR은 검증했고, 실제 Debian 실행은 dot의 테스트가 필요합니다.** GUI와 Google/Codex 실계정 로그인은 별도 확인 대상입니다.

## 1. 필수 의존성

Debian 13에서:

```bash
sudo apt update
sudo apt install nodejs python3 python3-venv ca-certificates libgl1 libglib2.0-0t64
```

- Node.js 20 이상, Python 3.11 이상. Debian 13 기본 Python 3.13을 기준으로 OCR 의존성 22종을 고정했습니다.
- `libgl1`, `libglib2.0-0t64`: 화면 없이 실행해도 OpenCV 로딩에 필요합니다.
- 화면을 열려면 웹 브라우저와 `xdg-utils`가 필요합니다. 폴더 선택 창은 `zenity` 또는 `kdialog`가 있으면 사용하며, 경로 직접 입력도 가능합니다.
- Google 로그인은 설치한 공식 Antigravity CLI(`agy`), Linux Secret Service/dbus 및 계정 사용 권한에 따릅니다. Codex는 설치한 `codex` CLI를 사용합니다. CLI와 계정 정보는 배포본에 포함하지 않습니다.

확인한 Debian 공식 패키지: [Node.js](https://packages.debian.org/trixie/nodejs), [python3-venv](https://packages.debian.org/trixie/python3-venv), [libgl1](https://packages.debian.org/trixie/libgl1), [GLib](https://packages.debian.org/trixie/libglib2.0-0t64).

## 2. 압축 해제·설치·실행

```bash
tar -xzf Language-Test-Linux-x64-0.4.3-preview.tar.gz
cd Language-Test-Linux-x64-0.4.3
./linux/install.sh
./linux/start.sh
```

설치는 앱 폴더의 `vendor/ocr/venv`에만 Python 환경을 만듭니다. Debian Python 3.13용 wheel 파일과 OCR 모델은 포함되어 있어 **OCR 의존성 설치에는 인터넷이 필요 없습니다.** 다른 Python 버전에서는 공식 PyPI에서 고정 버전 의존성을 받습니다. 운영체제 패키지 설치에는 Debian 패키지 접근이 필요합니다. 원본 모델은 SHA-256으로 확인하며, 처음 OCR을 실행할 때 모델을 내려받지 않습니다.

브라우저에서 표시된 `http://127.0.0.1:포트` 주소로 접속합니다. 종료는 실행한 터미널에서 Ctrl+C입니다. Linux 테스트 배포본은 새 버전 확인을 제공하고, 파일 교체는 새 압축을 별도 폴더에 풀어 진행합니다. Windows 업데이터는 Windows 배포본을 갱신합니다.

## 3. 화면 없는 실행과 자동 테스트

```bash
./linux/start.sh --headless --port 41837
```

다른 터미널에서 상태 확인:

```bash
curl http://127.0.0.1:41837/healthz
```

서버는 이 컴퓨터의 loopback 주소에만 연결합니다. 원격 브라우저가 필요하면 SSH 연결에서 `-L 41837:127.0.0.1:41837`로 포트를 전달합니다.

dot에 맡길 기본 테스트:

```bash
./linux/test-headless.sh
```

이 명령은 GUI·계정·API 키 없이 다음을 검사합니다.

1. Node 자동 테스트: 판정, 캐시, 저장/복구/휴지통, 일괄 검증 실패, 수동 문제, 폴더 감시, 플랫폼 경로.
2. Linux 런처의 HTTP 상태 확인과 종료.
3. Python/OpenCV/ONNX Runtime 로딩과 OCR 모델 4개 해시.
4. 양수·음수 이동, 특징 없는 화면 거부, 해상도 불일치/크기 맞춤 정렬 테스트.
5. 포함한 합성 이미지에서 실제 로컬 OCR로 `Start`, `42` 인식, 정렬 실행.

작업 데이터와 캐시는 테스트 전용 임시 폴더에 저장합니다. 결과 로그 경로를 출력하며 실패하면 0 이외의 종료 코드를 반환합니다. OCR 설치 전 공통 로직만 검사하려면 `./linux/test-headless.sh --skip-ocr`를 사용합니다. 이 경우 OCR 검증은 **SKIP**으로 남습니다.

dot 결과에 포함할 항목: `cat /etc/os-release`, `uname -m`, `ldd --version`, `node --version`, `python3 --version`, 테스트 종료 코드와 출력 로그. 토큰·인증 코드·개인 이미지는 필요하지 않습니다.

## 4. 저장 위치와 CLI

- 작업: `${XDG_DATA_HOME:-~/.local/share}/language-test/projects`
- OCR 캐시: `${XDG_CACHE_HOME:-~/.cache}/language-test/ocr-cache`
- 경로 변경: `LINGUALENS_PYTHON`, `LINGUALENS_OCR_MODELS`, `LINGUALENS_CODEX_CMD`, `LINGUALENS_AGY_CMD`.
- Google 로그인: 터미널에서 `agy`를 실행해 Google OAuth를 완료하고 `agy models`로 상태를 확인합니다. 앱의 로그인 버튼은 설치된 터미널을 엽니다. 화면 없는 환경에서는 직접 로그인 후 앱에서 상태를 확인합니다.
- Codex 로그인: 터미널에서 `codex login` 후 `codex login status`로 확인합니다. 로컬 OCR은 두 CLI 없이 사용할 수 있습니다.

Google 설치/인증은 [공식 Antigravity 안내](https://antigravity.google/docs/cli/install)를 따르세요. 계정별 모델 사용 가능 여부와 서버 응답 속도는 이 배포본으로 확인되지 않았습니다.

## 5. 포함 파일

`src/`: 앱 전체 소스. `tests/*.test.mjs`, `tests/alignment.test.py`, `tests/headless-local.mjs`: 테스트. `linux/`: 설치·실행·패키지 생성과 환경 검사. `vendor/`: 브라우저 라이브러리, 모델, 의존성 wheel 및 라이선스. `linux/requirements-debian13.txt`: 배포 의존성의 버전과 SHA-256.

패키지에 사용자 작업, 로그인 정보, Windows 실행 파일은 포함하지 않습니다.
