# Language Test 0.4.4 검증

2026-10-15 Windows x64에서 소스·패키지 검증을 진행합니다. 배포 완료 여부와 Git 커밋·자산 해시는 릴리스에서 확인할 수 있습니다.

## 기능 검사

- Node 자동 회귀: 148개 통과, 실패 0.
- 일반 headless Edge 화면: 36개 통과, 처리되지 않은 오류 0.
- 비교 화면: 11개 통과, 실제 비교 Worker 사용.
- 모델 준비 도구: 10개 통과. 다운로드 응답은 메모리 fixture로 모의합니다.
- 실제 번들 모델 SHA-256: 4개 통과.
- Python/OpenCV 정렬: 3개 통과.
- 실제 로컬 OCR·정렬: 포함된 합성 이미지에서 Start·42 인식. 10월 14일 측정 약 5.248초.

각 실패·취소 검사는 분리된 서버·폴더·브라우저를 사용합니다. Codex·Gemini 응답과 인증 실패·지연은 모의하며 실제 AI 계정을 호출하지 않습니다.

## 패키지 검사

배포 전 Windows 실행기 selftest, ZIP의 소스/버전/개인 파일 제외, 업데이터 패키지 검증, Linux 소스·테스트·모델·wheel 포함 및 해시를 검사합니다. 완료한 패키지 결과는 이 문서에 추가합니다.

## 범위와 재현

실제 Debian 13 실행·GUI·실계정 로그인과 사용자 2340×1080 게임 이미지의 AI 속도는 확인하지 않았습니다. 실제 로컬 OCR 결과를 모의 AI 결과와 구분합니다.

```sh
node --test tests/*.test.mjs
python -B tests/model-preparation.test.py
node tests/headless-local.mjs
npm run test:browser
npm run test:comparison
```

OCR 런타임과 선택적 Playwright 준비는 [README.md](README.md), Debian 의존성과 화면 없는 전체 검사는 [LINUX.md](LINUX.md)를 확인하세요. 10월 14일 구현 내역은 [검증 기록](VALIDATION-2026-10-14.md)에 있습니다.
