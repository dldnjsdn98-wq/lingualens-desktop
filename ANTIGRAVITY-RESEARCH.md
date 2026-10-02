# Antigravity 연결 조사 — 2026-09-29

## 확인 결과

- 현재 PC에서 Gemini CLI 0.61.0은 Google 서버의 `UNSUPPORTED_CLIENT` 응답으로 개인 계정 사용을 거절당했습니다. 로그인 토큰 파일은 생성되었으나 서비스 인증 완료 후 저장되는 인증 방식 설정은 없었습니다.
- Antigravity 공식 Windows 배포 1.2.13을 작업 폴더에 다운로드하고 공식 배포 목록의 SHA-512와 일치함을 확인했습니다. 시스템에는 설치하지 않았습니다.
- 공식 CMD 설치 스크립트에 PowerShell 호출이 없으며, 내려받은 실행 파일의 `--help`도 PowerShell 도우미 없이 실행됐습니다.
- 실행 파일은 `--print`, `--output-format json`, `--json-schema`, `--mode plan`, `--sandbox`, `--print-timeout`을 제공합니다.
- 도움말에 전용 로그인 명령이나 이미지 첨부 플래그가 없습니다. 공식 문서는 최초 대화형 실행에서 브라우저 로그인 후, 저장된 로그인으로 자동 실행하는 방식을 안내합니다.
- 스트리밍 입력 문서는 텍스트 블록만 지원한다고 명시합니다. 이미지 파일을 읽는 도구를 통해 OCR이 가능한지는 로그인 완료 후 실제 시험이 필요합니다.

## 다음 검증 단계

Antigravity의 최초 설정 및 브라우저 로그인을 완료한 뒤, 별도 시험 폴더의 합성 이미지 한 장만 읽도록 실행하고 JSON 결과를 검증합니다. 이미지가 실제 입력으로 전달되는지, 권한 요청으로 멈추지 않는지, 취소가 동작하는지 확인한 후 앱에 연결합니다. 이 검증 전에는 앱에 사용 가능한 OCR 도구로 추가하지 않습니다.

## 공식 근거

- [설치 및 인증](https://www.antigravity.google/docs/cli/install/)
- [자동 실행과 JSON 출력](https://www.antigravity.google/docs/cli/headless/)
- [Gemini CLI 이전 안내](https://www.antigravity.google/docs/cli/gcli-migration/)
- [공식 저장소](https://github.com/google-antigravity/antigravity-cli)

실행 파일 검증: `8256013ff3ffbfec14157e1f25541c303b33d091ed05a645d02267b23c6f4615d8ffa1068cce2c7687f2fe216375f5d72642b43a2c73f3c90bd0c3d49e443187`
