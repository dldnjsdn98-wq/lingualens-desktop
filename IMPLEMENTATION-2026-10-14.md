# 2026-10-14 구현 기록

마감: **2026-10-14 18:50 Asia/Seoul**. 연결된 후속 실행: `language-test-10-14-18-50`.

프로젝트는 `C:\Users\이원우\Desktop\123\testtt\lingualens-desktop`입니다. 상위 Git 저장소는 다른 프로젝트이므로 전체를 스테이징하지 않습니다. 마지막 공개 앱 소스는 `main`의 `5ffac9f6b36f1d775780ac70a332d36f6124bbc6`, 공개 배포 버전은 0.4.3입니다. 이후 소스 수정은 배포 패키지에 자동으로 들어가지 않습니다.

## 이어서 진행할 순서

1. **완료:** OCR 동일 요청 공유, 개별 취소와 마지막 대기자 취소, 새로 읽기·캐시 삭제 중 오래된 결과 재저장 방지.
2. **완료:** 로컬 OCR 직렬 대기열·즉시 대기 취소·닫기 후 재시작 차단·타임아웃과 프로세스 종료 뒤 복구. 실제 번들 OCR 및 모의 프로세스 검사.
3. **완료:** 새 작업·작업 불러오기의 전환 잠금, 임시 저장 실패 시 기존 내용 보존. 새로고침·닫기의 복구 UX는 추가 점검 후보.
4. **완료:** 검수 판정·기록 삭제 후 현재 필터·배지·개수 즉시 갱신. 빈 선택에서 A/I 키가 오류를 내지 않음. 필터에서 다음 항목으로 자동 이동한 뒤 ‘확인 완료 후 다음’이 한 항목을 더 건너뛰지 않도록 수정. 메모 입력 중 단축키 보호와 다음 이미지 이동을 실제 화면에서 확인.
5. **완료:** 현재 UI용 `tests/browser-smoke.mjs`, `tests/browser-runtime.mjs`, `npm run test:browser`와 README 안내. 버전을 version.txt에서 읽고 개인 경로 없이 Playwright·브라우저를 선택. 기본 테스트용 임시 폴더 또는 환경 변수 출력 경로를 사용. Linux 패키지에도 이 선택적 검사 소스를 포함하도록 빌드 목록 수정.
6. **완료:** 기준 다운로드 및 자동 정렬 네트워크 요청의 취소 전달, 비교 Worker의 늦은 메시지·전송 실패 정리, 취소·창 닫기 후 컨트롤 복구와 재실행. 기준 디코딩 공통 안내 및 업로드 실패 시 기존 기준·이력 보존. 슬라이더 비율 안내 및 번갈아 보기 종료를 실제 화면에서 확인.
7. **완료:** Linux 소스 체크아웃용 모델 준비 도구와 설치 연결. manifest의 HTTPS 주소·SHA-256으로 준비하며 `--check`는 인터넷 없이 검사. 실패한 다운로드로 기존 파일을 덮지 않음. stdlib 회귀 검사 10개와 실제 번들 모델 4개의 해시 검사 통과. 실제 Debian 실행은 아직 확인하지 않음.
8. **완료:** 임시 저장 실패 시 상단 재시도 버튼, 현재 수정 번호 기준 저장 상태, 다른 작업의 늦은 응답 보호, 앱에 저장 후 대기 중 임시 저장이 되살리는 문제 방지. 임시 데이터 정리 실패도 저장 작업이 보관됐음을 명시.
9. **완료:** 복구·임시 작업 지우기·프리셋 삭제의 실패 처리/잠금. 복사 설정 전체 준비 후 적용. 감시 시작·중지 중첩/늦은 결과 보호. 열린 모달 내부 오류 안내와 닫기 후 정리.
10. **완료:** OCR 검증 항목 만들기에 취소 버튼·닫기 취소·경과 시간 표시. 전처리 및 응답 이후 취소 확인과 작업별 컨트롤러 정리. 취소·닫기 후 버튼 복구와 재시작을 실제 화면에서 확인.
11. **완료:** 중복 이미지·문구·OCR 결과·기준 이력 ID와 중복 실행 ID/목록 외 완료 기록을 적용 전 거부. 구버전 이미지 ID 생략과 삭제된 이미지가 남은 실행 목록은 호환. 저장·원본 업로드·OCR 공통 JSON 요청에 연결 실패/HTML 응답 안내와 취소 전달.
12. **완료:** Linux 런처 옵션 검증·포트 충돌 안내·공유 종료/리스너·selftest 임시 폴더 정리 검사. 실제 합성 OCR·정렬 재검증.
13. **완료:** 선택 영역 AI 재확인의 인증 조회 단계부터 잠금·취소·실패 처리. 결과 사본에 재인식하고 완료 후 적용. 자동 AI 재확인 인증 실패/timeout은 기본 OCR과 안내를 유지. 화면/회귀 모의 인증 검사.
14. **완료:** 일반 영역 다시 읽기도 사본 실행·취소/완료 적용 보호. 최근 기록 IndexedDB 거래 완료/실패/abort 및 항상 연결 정리, 삭제 실패/재시도 및 저장 실패 안내. 화면 검사에서 새로 드러난 이전 영역 OCR 문구 누적 문제도 수정: 재인식 영역의 이전 문구 교체, 현재 화면/재열기 판정 규칙 일치.
15. **완료:** `VALIDATION-2026-10-14.md`에 변경과 결과/제약/실행 명령 정리. README에 미배포 기록 링크. 읽기 전용 패키지 preflight로 새 모듈·검사·문서 링크 포함과 누락/중복/개인 경로 제외 확인. Bash 샌드박스 제한을 구분하여 정상 권한의 셸 구문 검사 통과.
16. **마감 완료:** 2026-10-14 18:50 Asia/Seoul에 새 구현 중단. 최종 기록과 성공 로그를 확인하고 기존 자동화의 필드를 보존하여 PAUSED로 변경. 추가 구현·동일 검사 반복 없이 결과를 보고함.
17. 실제 Debian/GUI·실계정 인증/AI 속도 및 새 설치파일 테스트는 미확인으로 남김. 공개 배포·푸시·패키징은 수행하지 않음.

## 기존에 완료한 변경

- 10월 13일: 손상된 이미지 디코딩 실패를 한국어로 안내. 정상·손상 이미지가 섞인 추가에서도 기존 작업과 선택을 보존하고 버튼 잠금 해제.
- 자동 테스트 64개, 이미지 정렬 3개, 실제 합성 이미지 OCR·정렬, headless UI 10개 통과. `VALIDATION-2026-10-13.md` 참고.
- 개인 데이터는 `.investigation/error-test-20261013/` 등 테스트 전용 폴더에만 보관. 사용자 저장 작업과 분리.

## 검증·작업 방식

Node는 `node` 또는 `C:\Users\이원우\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`를 사용합니다. `node --test tests/*.test.mjs`와 해당 수정의 회귀 검사부터 실행합니다. 샌드박스의 EACCES/EPERM은 정상 권한 실행으로 구분합니다. 실제 OCR은 `node tests/headless-local.mjs`, 정렬은 `vendor/ocr/python.exe -B tests/alignment.test.py`로 확인할 수 있습니다.

실제 AI 계정 호출·Debian 실행 성공을 모의 검사로 주장하지 않습니다. 새로운 배포 요청이 없으면 공개 릴리스는 만들지 않습니다. 18:50 이후에는 새 구현을 시작하지 말고 진행한 수정의 검증·정리를 마친 뒤 결과를 보고하고 자동화를 PAUSED로 바꿉니다.

## 1차 구현 결과 · 16시대

- `src/ocr-cache.js`: 동일 키의 진행 중 요청을 공유. 각 요청에 별도 취소·진행 콜백, 마지막 요청 취소 시 실제 추출 취소. 새로 읽기가 진행 중인 이전 결과를 대체하며 오래된 결과가 새 캐시를 덮지 않음. 캐시 삭제 시 세대를 바꿔 진행 중 결과가 캐시를 되살리지 않음. 디스크 쓰기·삭제는 저장 잠금으로 직렬 처리. 디스크 결과를 메모리에 올리고 새로 읽기와 디스크 조회의 겹침을 보호.
- `src/local-ocr.js`: 대기열로 순차 실행하고 대기 중 취소는 즉시 제거. 닫기 시 모든 요청을 정리하며 다시 실행하지 않음. 타임아웃·예상 밖 종료·깨진 JSON은 작업을 실패시키고 새 프로세스로 복구. 기본 timeout 90초·idle 45초는 유지. `spawnProcess`, `requestTimeout`, `idleTimeout` 주입으로 모의 프로세스 회귀 검사를 지원.
- `src/workspace-client.js`: 새 작업과 다른 작업 불러오기 전에 전환을 잠그고 강제 임시 저장 결과를 확인. 실패하면 원래 작업·메모·이미지를 보존하며 저장·백업 안내. 동시에 전환하는 요청은 차단.
- 새 회귀 파일: `tests/cache-concurrency.test.mjs` 7개, `tests/local-ocr-lifecycle.test.mjs` 7개, `tests/workspace-transition.test.mjs` 3개.
- **전체 81개 통과, 실패 0개**. 로그: `.investigation/implementation-20261014/node-tests.txt`.
- **headless UI 11개 통과**. 임시 저장 서버를 500으로 실패시켜 새 작업 전환 중단·메모·두 이미지 보존·버튼 복구를 확인. 로그: `.investigation/ui-recheck-20261014.txt`.
- 실제 합성 이미지 OCR·정렬 통과: `Start`, `42` 인식. 약 9.3초였으며 동시 검사 중 측정이라 속도 개선 배율을 주장하지 않음.
- 화면 검사 임시 스크립트는 `.investigation/error-test-20261013/ui-smoke.mjs`에 있음. 분석 결과 표시 직후에는 아직 버튼이 잠겨 있을 수 있으므로 다음 파일 가져오기에 앞서 `#run` 활성화를 기다리도록 수정. 사용자 UI를 건드리는 스크립트가 아니라 새 headless 세션과 분리된 서버를 사용함.
- 현재 버전 파일은 0.4.3이고 새 코드의 공개 패키징·푸시는 아직 수행하지 않음. 기존 배포 ZIP에 새 소스가 들어갔다고 주장하지 말 것.

## 2차 구현 결과 · 16:40~16:50

- 검색 결과가 없을 때 A/I 단축키를 누르면 `Cannot read properties of null (reading 'value')`가 발생하는 것을 headless Edge에서 재현. `saveManualReview()`가 실제 선택과 상세 입력 필드를 확인하고 안전하게 무시하도록 수정.
- 수동 판정 저장 및 기록 삭제 후 `render(UX.filter)`를 호출해 현재 목록·배지·개수·선택 상세를 즉시 갱신. 판정 저장 실패 시에는 다음 대상으로 이동하지 않음.
- `acceptReviewAndNext()`는 필터 갱신으로 이미 다음 항목을 선택했으면 추가 이동을 생략. 필터 결과가 비었거나 기존 항목을 유지하면 다음 검수/다음 이미지 이동을 수행.
- 회귀 검사: `tests/review-interaction.test.mjs` 4개 추가. **전체 Node 85개 통과, 실패 0개**.
- `tests/browser-smoke.mjs`는 최신 UI 검사로 교체. **화면 검사 15개 통과**. 기존 11개에 빈 선택 단축키, 수동 기록의 필터/배지 갱신, 메모 입력 단축키 보호, 필터에서 다음 검수/다음 이미지 이동을 추가.
- `tests/browser-runtime.mjs`는 선택적 Playwright를 읽고 Windows의 Edge 또는 지정한 실행 파일/Chromium으로 새 headless 세션을 생성. `LANGUAGE_TEST_PLAYWRIGHT_MODULE`은 설치된 패키지 폴더, `LANGUAGE_TEST_BROWSER_PATH`는 실행 파일, `LANGUAGE_TEST_TEST_OUTPUT`은 출력 폴더. Playwright 누락 시 안내와 0 이외 종료 코드를 확인.
- 테스트는 로컬 테스트 서버 외 브라우저 네트워크를 차단. AI 응답은 모의이며 개인 작업·계정·이미지를 사용하지 않음.
- 실행 예: PowerShell 프로세스에서 `$env:LANGUAGE_TEST_PLAYWRIGHT_MODULE='C:\Users\이원우\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'`, `$env:LANGUAGE_TEST_TEST_OUTPUT=Join-Path $PWD '.investigation\implementation-20261014\ui'`를 지정한 뒤 `node tests/browser-smoke.mjs`.
- 로그: `.investigation/implementation-20261014/node-tests.txt`, `browser-tests.txt`, `ui/ui-result.json`. 마지막 UI 합성 검사 스크린샷도 같은 ui 폴더에 있음.
- 변경된 production 소스: `src/feature-client.js`, `src/ux-client.js`. 추가 유지보수: `package.json`, `README.md`, `linux/build-package.py`, `tests/browser-smoke.mjs`, `tests/browser-runtime.mjs`. 로컬 소스 상태이며 공개 설치 패키지는 바꾸지 않음.

## 3차 구현 결과 · 16:53~17:15

- `runComparison()`의 기준 이미지 fetch에 작업의 AbortSignal을 전달. 이미지 디코딩 후와 Worker 응답 후에도 취소 여부를 확인하고 적용. 취소·실패 시 부분 그림과 라벨을 비우며 기존 `item.baseline`·`item.comparison`은 보존. 취소한 작업의 컨트롤을 복구하고 재실행 가능.
- `autoAlign()`에도 비교 작업 컨트롤러를 적용하고 원본 업로드와 정렬 요청에 취소를 전달. 비교 창을 닫거나 비교 취소를 누르면 정렬도 중단. 늦은 응답이 이동 값을 변경하지 않음.
- `projectRequest(url,body,signal)`, `imageReference(file,signal)`는 선택적 취소 신호를 지원하고 응답 이후 재확인. 기존 호출은 그대로 지원.
- `diffInWorker()`는 이미 취소된 작업에 Worker를 만들지 않으며, 완료/취소 이후 핸들러와 리스너를 정리. 늦은 stage 메시지가 취소 안내를 덮지 않음. postMessage 전송 실패도 Worker 종료 후 거부.
- 단일·일괄 기준 파일 디코딩은 공통 한국어 안내 사용. 단일 업로드는 실제 원본 저장에 성공한 뒤 기준·이력을 변경하여 레거시 이력이 실패한 업로드 때문에 달라지지 않음.
- 비교 중 기준 파일·선택·버전 이름·기준 설정/일괄 버튼과 기준 이력을 잠가 변경 요청이 무시되는 혼란을 줄임.
- 슬라이더에 ‘왼쪽 기준 40% · 오른쪽 현재 60%’처럼 실제 비율을 표시. 비교 초기화 시 오래된 프레임 라벨 삭제.
- `tests/comparison-lifecycle.test.mjs` 3개, 기존 Worker 파일에 3개 추가. **전체 자동 테스트 91개 통과, 실패 0개**.
- `tests/browser-comparison.mjs` 추가. **비교 화면 11개 통과**, 기존 일반 화면 **15개 통과**. 실제 동일 이미지 Worker 결과 0픽셀, 슬라이더 비율, 닫기 후 번갈아 보기 타이머 중단, 손상 기준·저장 실패 시 이력 보존, 다운로드 취소/닫기와 정렬 취소, 이후 재실행·저장 결과를 확인.
- 비교 UI에서 취소 지연은 테스트 라우트가 모의 네트워크 대기로 만들었으며 외부 AI 계정은 호출하지 않음. 픽셀 비교는 실제 브라우저 Worker를 사용. 기본 버튼 복구는 1.5초 이내 조건으로 확인.
- `npm run test:comparison`과 README 안내, Linux 패키지 및 소스 복사 helper의 해당 검사 파일 포함 목록 수정.
- 비교 로그: `.investigation/implementation-20261014/comparison-tests.txt`, `comparison/comparison-result.json`, `comparison/comparison-proof.png`. 공통 로그와 일반 UI 로그도 현재 결과로 갱신됨.
- 화면 없는 런처 selftest 및 Linux 패키지 Python 구문 검사 통과. 실제 Debian 실행 검증은 아직 수행하지 않음.

## 4차 구현 결과 · 17:21~17:28

- `linux/prepare-models.py`: stdlib만으로 manifest 모델 이름·HTTPS URL·SHA-256 검증. 정상 파일은 재다운로드하지 않음. 모델 폴더의 임시 파일에 스트리밍하고 256MB 제한·해시를 확인한 뒤 원자 교체. 실패하면 임시 파일을 정리하며 기존 파일 보존. 심볼릭 링크 대상 및 잘못된 경로 거부. `--check`, `--models`, `LINGUALENS_OCR_MODELS` 지원.
- `linux/install.sh`에서 모델 준비를 먼저 수행. Git 소스 설치의 모델 누락 해결. 이미 모델이 포함된 정상 배포본은 오프라인 검증만 수행. Git 소스에는 모델·wheel이 없어 처음 설치에 인터넷이 필요함을 `LINUX.md`에 구분.
- `tests/model-preparation.test.py` 10개 추가. 외부 다운로드 없이 메모리 응답으로 성공, 해시·네트워크·용량·파일 교체 실패, 오프라인 누락, 경로·URL·중복 거부를 검증. 기본 샌드박스 임시 파일 정리 제한 때문에 일반 권한으로 실행한 검사 10개 통과. 첫 제한된 실행은 중단했고 검사 프로세스를 남기지 않음.
- 실제 Windows 번들 모델 4개를 `prepare-models.py --check --models vendor/ocr/packages/rapidocr/models`로 검증. Linux 셸 구문 검사와 공통 런처 selftest 통과. Debian 실행 성공을 주장하지 않음.
- Linux headless 검사 및 소스/패키지 목록에 모델 준비 테스트 포함. 새로운 패키지를 생성하거나 공개하지 않음.
- `src/workspace-upgrade.js`: 저장 도중 수정이 생기면 완료 대신 추가 저장 중으로 표시하고 다음 저장을 예약. 다른 작업으로 바뀐 뒤 늦게 실패한 저장은 새 화면 상태를 덮지 않음. 명시적으로 앱에 저장한 뒤 대기 중 임시 저장은 다시 만들지 않음. 임시 데이터 정리 실패 시 저장 작업은 보관됐다는 안내.
- `src/workbench-client.js`, 스타일: 저장 실패 때 상단 ‘임시 저장 재시도’ 표시. 실패 상태색과 안내 유지, 잠금 상태에 따라 실행 보호. 재시도 성공 후 버튼 숨기고 기존 오류 안내 정리.
- `tests/draft-lifecycle.test.mjs` 5개 추가. **전체 Node 96개 통과, 실패 0개**. 일반 화면 **17개 통과**. 실패→재시도→메모·이미지 보존, 1024px/390px 화면 넘침 없음, 오류 없음. 저장 실패 시 화면은 `ui/draft-retry-proof.png`에서 직접 확인. 이전 비교 화면 11개 통과 결과도 보존.
- 최신 로그: `.investigation/implementation-20261014/node-tests.txt`, `browser-tests.txt`, `model-tests.txt`, `ui/ui-result.json`. 공개 버전 0.4.3 설치파일에는 이 수정이 아직 포함되지 않음.

## 5차 구현 결과 · 17:29~17:40

- `src/workspace-upgrade.js`: 임시 작업 복구·지우기·프리셋 삭제에 작업 잠금·실패 안내·finally 해제를 추가. 복구는 조회가 성공한 뒤 기존 `loadWorkspace()`의 임시 저장 보호를 사용. 실패하면 기존 이미지·선택·복구 항목을 유지. 중복 클릭이 요청을 늘리지 않음.
- 설정 복사는 모든 대상의 이미지 크기 및 새 문구 준비가 끝난 뒤 한 번에 적용. 중간 이미지 준비 실패로 일부 대상만 바뀌는 상태를 방지하며, 실패 시 원래 결과와 문구 및 복사 계획을 유지.
- `src/folder-watch.js`: 시작 세대로 중지 후 늦게 완료된 스캔이나 이전 시작이 세션을 되살리지 못하게 보호. poll/read는 캡처한 세션을 사용하고 종료 여부 재확인. read 도중 session=null로 생기는 내부 TypeError를 한국어 종료 안내로 처리.
- 감시 UI 시작은 작업 전환을 잠그며 중복 실행을 무시. 중지 요청은 공유하고 중지 중 새 시작 차단. 활성 감시·전환 중 경로와 옵션 잠금. 시작 실패/재시도·중지 후 컨트롤 복구. 이전 poll 실패가 현재 안내를 덮지 않음. 서버 종료 시 watcher.stop() 호출.
- `src/client-source.js`: error()는 열린 대화상자 안에 role=alert 안내도 표시. 즉시 스크롤로 보이게 하고 창 닫기 시 제거. 전역 안내도 유지하며 텍스트만 삽입. 새 스타일 추가.
- `tests/workspace-actions.test.mjs` 6개와 `tests/watch-lifecycle.test.mjs` 6개. **전체 Node 108개 통과, 실패 0개**. 일반 화면 **23개 통과**. 복구/삭제 실패 시 2장 보존, 설정 모달의 오류 위치·선택 보존·닫기 정리, 감시 실패·재시작·중지를 추가.
- 설정 오류 스크린샷 `ui/settings-error-proof.png`를 직접 확인. 첫 UI 검사는 접힌 ‘작업 도구 더보기’를 펼치지 않아서 실패했고, 다음은 하위 summary까지 선택하는 테스트 선택자 때문에 실패. `.workspace-more > summary`로 실제 사용자 동선을 검사하도록 고쳤으며 이후 전체 23개 통과, pageerror 0개.
- 모든 실패 상황은 분리된 데이터와 모의 저장소/감시 라우트로 검사. 실제 AI 계정 호출과 사용자 작업 삭제 없음. 소스만 변경했으며 공개 배포·푸시는 하지 않음.

## 6차 구현 결과 · 17:49~17:52

- `src/feature-client.js`: OCR 항목 생성에 ‘읽기 취소’, 읽기 경과 시간, 언어 잠금을 추가. 창을 닫으면 해당 작업의 컨트롤러만 취소. 전처리 후/응답 후 신호 확인으로 취소된 결과를 적용하지 않음. 컨트롤러 동일성을 확인한 뒤 정리하며 버튼·언어·선택 추가 상태 복구.
- `src/client-source.js`: requestOcr는 이미 취소된 요청을 업로드하지 않으며 JSON 응답 이후에도 신호 확인. Codex 진행 조회에 같은 취소 신호 전달.
- `tests/ocr-draft-lifecycle.test.mjs` 6개 추가. 늦은 응답 무시, 전처리 중 취소, 실패 후 재시작, 중복 읽기 차단, 업로드 전 취소, JSON 응답 중 취소를 검증. **전체 Node 114개 통과, 실패 0개**.
- 일반 화면 **26개 통과**. 모의로 대기시킨 OCR 읽기에 취소와 닫기를 수행해 1.5초 이내 버튼 복구 확인. 이후 모의 새 문구를 읽고 실제 편집 항목으로 추가. 읽기 경과 시간 표시와 언어 잠금·복구도 확인.
- `ui/ocr-draft-proof.png`에서 성공한 재읽기와 버튼 배치를 직접 확인. 모든 AI 응답은 모의이며 외부 계정과 사용자 이미지를 쓰지 않음. 기존 비교 화면 11개·모델 준비 10개 검증 결과 보존.
- 공개 설치파일·푸시는 수행하지 않음. 최신 자동 로그와 UI 보고서는 기존 implementation-20261014 폴더에 있음.

## 7차 구현 결과 · 17:53~17:58

- `src/workspace-state.js`: 이미지 ID 중복, 이미지별 문구/resultTargets ID 중복 또는 빈 ID, OCR 결과/기준 이력 ID 중복을 파일 적용 전에 거부. 일괄 실행 ID 중복과 목록 외 완료 기록도 검증. ID가 없는 구버전 이미지와 동일 문구 ID를 다른 이미지에서 쓰는 정상 템플릿은 지원. 삭제한 이미지가 실행 목록에 남는 현재 앱 동작도 지원.
- 기존 작업 형식 테스트에 4개 추가. 이 검증은 브라우저 불러오기와 서버 저장에서 같은 함수를 사용.
- `src/request-tools.js`: 공통 jsonRequest. 연결 실패 시 앱 서버 실행 여부를 확인하는 한국어 안내. HTML/JSON 파싱 실패에 읽기 안내 또는 요청별 HTTP 상태. 서버의 오류 메시지는 보존하며 status 메타데이터를 전달. 원시 JSON 값 거부. 취소·timeout을 원래 유형으로 전달하고 JSON 해석 후 신호 재확인.
- projectRequest, imageReference, requestOcr가 공통 도구 사용. HTTP 401에서만 로그인 상태 재확인 유지. requestOcr의 timeout 안내 유지. `client-source.js`에 함수 문자열을 포함하여 브라우저와 Node 모의 검사가 같은 코드를 사용.
- 공통 요청 테스트 8개 추가, 기존 OCR 요청 VM에 실제 공통 함수 포함. **전체 Node 126개 통과, 실패 0개**.
- 일반 화면 **29개 통과**, 비교 화면 **11개 통과**. 모의 HTML 502 뒤 재시작, 연결 끊김 한국어 안내, 중복 이미지/문구 ID 파일 거부와 기존 2장 보존을 확인. 비교 업로드·취소·저장도 재검증.
- Linux 셸 파일 3개의 실제 바이트가 LF이며 CRLF 0개임을 확인. 소스 편집·복사만 수행했고 설치파일·공개 릴리스·푸시는 수행하지 않음.

## 8차 구현 결과 · 17:59~18:03

- `linux/launch-options.mjs`: 옵션과 포트 범위·숫자 형식 검증. `--port=N`, `--help`/`-h` 지원. 알 수 없는 옵션과 반복 --port 거부. 사용 중인 포트/EACCES에 자동 포트·다른 포트 안내.
- `linux/launch.mjs`: startLauncher를 내보내어 실제 서버로 생명주기 검사 가능. SIGINT/SIGTERM의 종료 Promise를 공유하고 연결/이벤트 리스너/자기 selftest 임시 폴더 정리. 실패 시 내부 스택 대신 사용자 안내와 종료 코드 1. 실제 Linux GUI 열기는 환경에 따른 기존 xdg-open 방식 유지.
- `tests/linux-launcher.test.mjs` 5개. 잘못된 옵션, loopback headless, EventEmitter로 주입한 SIGTERM, 겹친 stop, 포트 충돌/기존 서버 유지, 자기 임시 폴더 제거, 잘못된 CLI 인수 종료를 확인. **전체 Node 131개 통과, 실패 0개**.
- 실제 Windows 번들 로컬 OCR+정렬 합성 검사 통과: `Start`, `42` 인식, **약 5.248초**. 이 숫자는 Codex/Gemini 실제 계정 속도 측정이 아님. Python 정렬 회귀 **3개 통과**. 사용자 이미지를 사용하지 않음.
- 로그: `.investigation/implementation-20261014/actual-ocr.txt`, `alignment-tests.txt`, `node-tests.txt`. 기존 UI 29개·비교 11개·모델 준비 10개 결과 보존. Linux 셸과 공통 실행 로직을 Windows에서 검사한 것이며 실제 Debian 사용은 미확인.
- README의 Linux 소스 모델 준비 안내와 LINUX의 포트/종료 동작 안내 갱신. 공개 배포/푸시는 수행하지 않음.

## 9차 구현 결과 · 18:09~18:13

- 선택 영역 AI 재확인은 인증 조회부터 작업을 잠그고 전체 try/finally와 취소 신호를 적용. 조회는 10초 제한. 조회 실패·취소에 기존 OCR을 보존하고 컨트롤 복구. 결과 사본에 재인식한 뒤 신호를 확인하고 S.last에 적용해 부분 수정이 취소 후 남지 않음.
- `reviewAuthenticated()` 공통 보조 함수: 자동 AI 재확인 인증 실패·timeout은 기본 OCR 결과를 유지하고 autoReviewNote에 안내. 사용자 취소는 정상 취소 흐름으로 전달. 자동 재확인의 두 인증 조회에 같은 신호와 10초 제한.
- refreshConnection의 선택적 `{signal}`과 공통 JSON 요청 사용. 영역 로그인 미완료 이후 재확인도 취소 가능. onclick에서 받은 MouseEvent는 signal 없는 옵션으로 동작.
- `tests/region-auth-lifecycle.test.mjs` 7개. 인증 실패/중복·취소, 성공 후 사본 적용, 부분 수정 취소, 자동 인증 실패·timeout·미로그인 안내 보존 검사. **전체 Node 138개 통과, 실패 0개**.
- 일반 화면 **33개 통과**. 모의 인증 503/대기 중 취소(1.5초 내 복구)/이후 실제 앱 경로의 모의 Codex 재인식을 확인. 결과가 달라져 수동 판정이 재검수 상태가 되는 것도 확인.
- 첫 화면 검사는 이전 수동 판정이 재인식 후 여전히 현재 문제 판정일 것으로 가정해 실패. 실제 동작은 올바른 재검수 상태여서 stale 필터를 확인하고 새 수동 판정을 설정하도록 테스트를 수정. 이후 33개 전체 통과·pageerror 0개.
- 외부 AI 계정 호출·사용자 작업 삭제·공개 배포·푸시 없음. 비교 11개, 모델 준비 10개, 실제 합성 OCR/정렬 및 Python 정렬 3개 성공 기록 보존.

## 10차 구현 결과 · 18:19~18:29

- 일반 `retryRegion`도 작업별 컨트롤러와 OCR 결과 사본을 사용. 전처리·응답 이후 취소 확인, 원래 결과 보존, 완료 시 반영. 회귀 2개 추가.
- `historyStore()` 공통 IndexedDB 거래 처리. getAll/put/delete/clear는 transaction.oncomplete 이후 완료. request/transaction 오류와 abort를 거부하고 성공/실패 모두 db.close(). 기록 삭제 실패를 무시하지 않고 열린 최근 기록 창에 안내. 중복 삭제 차단·버튼 복구·재시도·저장 실패 상태 제공.
- `tests/history-lifecycle.test.mjs` 5개. 읽기/정렬, abort 즉시 거부, 요청·setup 실패 연결 정리, 실제 commit 이전에는 완료하지 않음, 삭제 실패 뒤 legacy 기록 보존과 재시도 확인. 첫 VM 검사는 한 microtask만 기다려 핸들러 생성 전에 이벤트를 쏘아 4개 실패; 실제 작업 시작 신호를 기다리는 검사로 수정 후 통과.
- 화면 검사로 중요한 오류 재현: 영역을 Stop으로 읽었다가 Start로 다시 읽으면 과거 Stop이 payload.result.lines에 누적. 저장 시 upgradeResults가 같은 위치의 상충 인식을 다시 발견하여 수동 판정이 현재 상태에서 빠졌음. 단순한 테스트 가정 문제로 넘기지 않고 실제 누적 원인을 수정.
- `replaceRegionLines()`는 영역에 50% 이상 겹치는 이전 문구를 새 인식으로 교체하고 영역 밖/위치 없는 문구는 보존. recount는 서버와 같은 reviewMatch로 판정해 화면과 재열기가 일치. `tests/region-reading-replacement.test.mjs` 3개로 반복 인식 후 상충 문구 제거와 수동 판정 유지 확인.
- **전체 Node 148개 통과, 실패 0개**. 일반 화면 **36개 통과**, pageerror 0개. 실제 앱 경로의 모의 미통과 영역 재인식 취소·다시 읽기, 자기 headless 브라우저의 합성 최근 기록 삭제 실패/재시도, 이후 수동 판정 저장/재열기를 확인.
- 첫 추가 UI 검사는 통과 항목에 숨겨지는 retryRegion 버튼을 누르려 해서 실패. 미통과 상태를 만들어 사용자 동선으로 검사하도록 수정. 다음 실패는 위 문구 누적 오류였고 production 수정 후 36개 전체 통과.
- 외부 AI 계정 호출과 사용자 데이터 삭제 없음. 마지막 코드 검증 로그는 기존 implementation-20261014 폴더. 공개 버전 0.4.3 패키지/소스는 변경하지 않음.

## 최종 정리 준비 · 18:32~18:46

- `VALIDATION-2026-10-14.md`에 주요 변경, Node 148·일반 UI 36·비교 UI 11·모델 준비 10·모델 해시 4·정렬 3·실제 합성 OCR 5.248초를 구분해 기록. README에 로컬 미배포 상태와 보고서 링크 추가.
- 읽기 전용 `.investigation/audit-source-20261014.py`: 공개 소스 baseline과 패키지 대상만 비교. 개인 테스트 live 스크립트는 대상에서 제외. 소스/테스트 변경 42개, Linux 패키지 입력 112개에서 누락·중복·금지 경로·README/보고서 문서 링크 누락 없음. Python 구문도 확인. tar.gz·wheel·설치파일을 쓰지 않고 모델 해시와 입력 목록만 검사.
- Linux 패키지에 날짜별 검증 문서를 포함하도록 목록 수정하여 새 README 링크가 패키지에서 깨지지 않음. 소스 helper는 원래 VALIDATION*.md를 포함하므로 새 보고서도 향후 포함됨. 소스 helper의 복사·스테이징·푸시는 실행하지 않음.
- 제한된 Bash 실행은 Windows MSYS 객체 권한 오류로 실패. 일반 권한의 `bash -n linux/install.sh linux/test-headless.sh linux/start.sh`는 종료 코드 0. 실제 Linux 실행 성공으로 취급하지 않음.
- `source-audit.json` 및 검증 문서가 현재 최종 결과를 반영. 테스트 성공 뒤 production 코드를 더 바꾸지 않았으므로 같은 기능 검사를 반복하지 않음. 마감 때 새 시각을 확인하고 위 일시정지/최종 보고를 수행해야 함.

## 마감 · 2026-10-14 18:50 Asia/Seoul

- 새 구현을 멈추고 최종 성공 기록 확인: Node 148개, 일반 UI 36개, 비교 UI 11개, 모델 준비 10개, 모델 해시 4개, Python 정렬 3개, 실제 합성 OCR·정렬 통과.
- 자동화 `language-test-10-14-18-50`는 기존 이름·프롬프트·일정·대상 대화를 보존하여 PAUSED로 변경.
- 보고서: `VALIDATION-2026-10-14.md`. 소스는 로컬 수정 상태. 공개 0.4.3 설치파일과 GitHub 소스에는 아직 반영하지 않음.
- 남은 검증: 실제 Debian 13 실행·GUI·계정 로그인, Codex/Gemini 실제 응답 속도, 새 설치파일을 만들 경우 설치·업데이트 실행. 이번 검사에서는 외부 계정 호출·사용자 데이터 삭제·Git 푸시·공개 배포 없음.
