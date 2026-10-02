# 0.4.1 검증

검증 호스트: Windows x64. Linux 목표: Debian GNU/Linux 13.6 x86_64, glibc 2.41.

## 확인 결과

- Node 자동 테스트: 39/39 통과. 실패한 재검증, 잘못된 일괄 요청, 수동 문제, 저장 실패 시 감시 중지/완료 처리, 저장 공간 보호, Linux 경로를 포함합니다.
- Python 정렬 테스트: 3/3 통과. 양수/음수 이동·같은 이미지, 특징 없는 화면·전부 무시, 해상도 불일치와 크기 맞춤.
- 실제 OCR/정렬 smoke test: 합성 이미지에서 `Start`, `42` 인식과 같은 이미지 이동 0/0 확인. 명시적 Linux 모델 경로 설정을 Windows Python에서 실행해 확인했습니다.
- 공통 Linux 런처 selftest: 임시 저장소를 이용한 HTTP 상태와 종료 확인. Windows Node에서 실행했습니다.
- Debian Python 3.13 x64용 의존성 22종: 공식 PyPI 파일을 받았고, Linux wheel 대상으로 전체 의존성 해결을 확인했습니다. 원본 모델 4개는 빌드 시 해시로 검사합니다.
- 실제 브라우저: 수동 문제가 확인할 이미지 필터에 표시됨, 파일명 검색, 게임 이미지 자동 정렬 0/0 및 차이 확인, 설정 변경 후 비교 저장 비활성화, 원본 사용량 확인.

## 별도 확인이 필요한 항목

실제 Debian에서 설치/실행, GLib/OpenCV/ONNX 로딩, GUI 연결·폴더 선택·CLI 로그인은 이 Windows 호스트에서 검증하지 못했습니다. Linux 패키지는 테스트용 preview입니다. `LINUX.md`와 `linux/test-headless.sh`로 dot에서 검사해 주세요. AI 도구의 실계정 OCR 응답 시간은 이번 자동 테스트 결과에 포함하지 않습니다.
