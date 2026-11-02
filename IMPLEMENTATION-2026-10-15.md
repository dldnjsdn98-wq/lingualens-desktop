# 2026-10-15 구현·배포 기록

최종 지시: **업로드 완료되면 종료**. 앞서 요청된 18:30까지의 추가 구현은 취소하고 0.4.4 소스와 Windows/Linux 배포까지만 완료했다. 후속 자동화 `language-test-10-14-18-50`는 PAUSED로 변경했다.

## 완료 · 2026-10-15 12:29 KST

- main 및 v0.4.4: `f85fb3db8d6ed10f93a0dcef2b3ffdc85263170d`. GitHub 소스 tree와 로컬 준비본 일치 확인.
- 공개 릴리스: https://github.com/dldnjsdn98-wq/lingualens-desktop/releases/tag/v0.4.4 (Latest, draft=false, prerelease=false).
- Windows 설치 ZIP, Windows 자동 업데이트 ZIP, Linux x64 preview tar.gz 및 SHA256 파일 4개 게시 완료. GitHub API의 자산 크기·SHA256과 로컬 파일 모두 일치.
- 자동 테스트 148개, 일반 UI 36개, 비교 UI 11개, 모델 준비 10개 통과. Windows 실행기 selftest·업데이트 패키지 검증 통과. Linux 패키지에서 푼 공통 Node 테스트 148개 통과(Windows에서 실행).
- 실제 로컬 OCR은 합성 이미지로 확인. 화면의 AI/인증 실패·지연 테스트는 모의 응답이며 실제 Debian GUI·계정 로그인·실계정 응답 속도는 미검증.
- 원격 검증 증거: `.investigation/release-0.4.4-verified.json`; 배포 화면: `.investigation/release044/release-published.jpg`.
- 사용자 지시에 따라 추가 구현 없이 종료.

## 배포 후 새 요청: 개선 사항 조사·적용

사용자가 새로 요청한 소스 개선을 수행했다. 아래 변경은 로컬 소스에 적용했으며 공개 v0.4.4 설치파일에는 아직 포함되지 않는다. 자동화는 PAUSED를 유지한다.

- `src/feature-client.js`: 엑셀 연결 되돌리기 사본에 수동 판정과 검수 메모를 포함한다. 연결로 문구 ID가 교체되면 현재 검수 기록을 정리하되, 자동 저장 이후에도 되돌리기로 원래 기록을 복원한다.
- 같은 파일의 백업 경로: 미저장 이미지를 백업할 때 앱 저장소에 불필요하게 업로드하던 단계를 제거했다. 앱 저장소 쓰기가 실패해도 메모리의 원본 파일을 백업 JSON에 포함할 수 있다. 비교 기준·이력의 기존 읽기와 정상 앱 저장 업로드는 유지한다.
- `src/enhancement-client.js`: 비교 기준 교체·이력 복원 시 가로·세로 보정, 크기 맞춤, 허용치를 기준과 동기화한다. 이전 이미지의 보정값이 남아 잘못된 차이가 생기는 문제를 방지한다. 실패한 기준 업로드는 기존 설정을 유지한다.
- `src/server.js`: 로그인 상태 조회 실패를 재시도 가능한 503 응답으로 처리한다. HTTP 요청 전체의 예외를 처리해 잘못된 URL, 세션 조회·JSON 직렬화 오류가 서버 프로세스를 종료하지 않게 한다. 연결이 닫힌 응답에 다시 쓰지 않는다.
- Codex 모의 서버 취소 검사는 고정 50ms 대신 실제 요청 시작 이벤트 후 취소한다. 부하에 따라 전송 전에 취소되어 재사용 횟수 검사가 실패하던 테스트의 시간 의존성을 제거했다. 실제 Codex 호출은 하지 않았다.

검증 결과:

- 전체 Node 테스트 **161개 통과**, 실패 0개. 신규 회귀 13개를 포함한다.
- 일반 화면 **39개**, 비교 화면 **14개** 통과. 각 브라우저 오류 0개.
- 실제 자동 저장 완료 후 엑셀 연결을 되돌려 수동 문제 판정·메모 복원 확인.
- 이미지 저장을 모의 500 응답으로 막은 상태에서 백업 다운로드 완료. JSON에 담긴 미저장 원본 바이트와 검수 기록을 확인하고 정상 저장 재시도 성공.
- 기준 변경·복원 후 실제 브라우저 Worker의 동일 이미지 비교 결과 0픽셀 확인.
- 검사는 별도 임시 저장소·합성 이미지·모의 AI 응답을 사용했다. 실제 계정 응답 속도나 Debian 실행을 새로 측정한 결과가 아니다.
- 증거: `.investigation/improvements-20261015/node-tests.txt`, `ui/ui-result.json`, `comparison/comparison-result.json`, `ui/excel-undo-proof.png`, `comparison/baseline-controls-proof.png`.

남은 확장 후보: 기준 이력이 많은 큰 작업은 백업에 이미지를 반복 포함하여 가져오기 제한 750MB를 넘을 수 있다. 중복 제거를 지원하는 백업 형식과 내보내기 용량 사전 안내는 별도 설계가 필요하다.

## 초기 계획 (위 최종 지시로 대체됨)

1. 0.4.4 초기 배포 준비 중. 원격 main은 `5ffac9f6b36f1d775780ac70a332d36f6124bbc6`, 최신 공개 v0.4.3 확인. 새 버전 0.4.4 사용.
2. 기존 회귀 148개, UI 36개·비교 11개와 실제 합성 OCR 결과를 보존. 새 버전/패키지 기준으로 확인 후 문서에 기록할 것.
3. 소스 복사 helper `.investigation/prepare-source-push.py`로 앱 전용 `.investigation/source-push`를 준비. 상위 Git은 다른 프로젝트이므로 사용하지 않음. GitHub connector create_tree/create_commit/update_ref로 올릴 수 있음.
4. Windows `Build-Release.ps1`, Linux `python linux/build-package.py --wheels .investigation/linux-wheels` 사용. wheel 22개가 이미 있음. 설치 ZIP은 Language-Test-Setup-0.4.4.zip, 자동 업데이트는 LinguaLens-Windows.zip, Linux는 Language-Test-Linux-x64-0.4.4-preview.tar.gz 및 sha256.
5. GitHub release UI는 in-app browser에 로그인된 상태. cua_repl의 releaseTab은 https://github.com/dldnjsdn98-wq/lingualens-desktop/releases/new (tab id 1). API에 release upload 도구가 없어 UI를 사용. 새 태그는 푸시된 main을 대상으로 생성하여 전체 소스와 일치시킬 것. 기존 태그/자산 덮지 않음.
6. 배포 완료 후 추가 개선을 작은 단위로 구현·회귀/UI 검증하고 소스로 푸시. 18:30에 새 기능 구현을 멈추고 추가 변경이 있으면 다음 버전으로 빌드·검증·배포. 최종 보고 뒤 자동화 PAUSED.

실제 외부 AI 계정 호출·사용자 데이터 삭제·새 채팅 생성·타 작업 메시지 없이 진행. GUI 검사는 자기 headless 브라우저와 분리된 테스트 폴더 사용. 실제 Debian/AI 계정 속도를 확인했다고 주장하지 말 것.
