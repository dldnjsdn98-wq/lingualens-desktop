# Language Test · 2026-11-02 구현 및 검증

설계는 GPT-6 Astra Medium, 구현은 Sol High로 분담했다. 상위 저장소와 다른 프로젝트는 변경하지 않았다. 공개 push·릴리스·설치파일 생성·자동화 재시작 없이 이 프로젝트의 로컬 소스와 문서만 수정했다.

## 적용한 화면

Impeccable의 Operate 모드와 craft-floor, taste-skill의 app-screen 지침을 함께 적용했다. taste draw는 builder 기준 두 후보를 제시했으며, 장시간 이미지·문구 대조에 맞는 `framed-sheet`를 선택했다. seed는 `297982069`, palette/type은 기존 제품과 오프라인 시스템 글꼴을 유지하는 옵션을 사용했다. 추가 redraw는 없다.

- 밝은 stone 상단·작업 목록의 L-frame, 8px inset의 white sheet, 평평한 neutral gray 캔버스로 시각 체계를 교체했다. 그라데이션과 체커보드 대신 선과 밝기 차이를 사용한다.
- 현재 선택은 muted blue, 자동·수동 판정은 green/red/amber와 명시적 텍스트로 구분한다. 결과 화면의 주 행동은 「확인 완료 후 다음」, 「현재 이미지 검증」은 보조 행동이다.
- 데스크톱에서 메모와 판정 버튼을 OCR 근거 스크롤 밖에 둔다. 불일치 상세에는 기대 문구·OCR 결과·실제 수정 문자·사유를 표시한다. 중복 diff 설명은 접근성 이름으로 옮겨 좁은 세로 공간을 확보했다.
- 780px 이하에서는 이미지·검수·작업 목록을 전환한다. 검수는 자연 페이지 스크롤로 읽고 결과 행과 OCR 근거에 최소 공간을 둔다. 이미지로 돌아갈 때 수동 확대를 유지한다. 화면 맞춤 모드에서만 새 영역에 맞춘다.
- 기존 세 열 크기 조절, 이미지 집중 보기, 필터·메모·판정·취소·저장 동작을 보존했다. 설정·저장 작업·화면 비교에도 같은 토큰을 적용했다. 긴 대화상자는 제목과 닫기를 고정하며, 최근 기록 버튼은 제목 뒤에 놓아 겹침을 방지했다.
- 눈에 보이는 현재 작업 제목, 제품 영역 마크, 16px 가장자리 여백, 최소 11px 보조 글자와 명시적인 focus/hover 상태를 정리했다. 외부 폰트·이미지·장식 애니메이션을 추가하지 않았다.

주요 소스는 `src/review-desk-styles.js`, `src/styles.js`, `src/workbench-client.js`, `src/ux-client.js`다. 마지막 전용 스타일 layer를 사용해 기존 독립형 화면 스타일과 데이터 동작을 분리했다. `PRODUCT.md`, 토큰을 포함한 `DESIGN.md`, 확장 정보인 `.impeccable/design.json`을 작성했다.

## 보안 보강

백업의 결과 메타데이터가 요약·최근 기록에 전달되는 경로를 정적 검토했다. 입력 형식 검사가 수치 필드를 제한하지 않던 부분을 보강했다.

- `foundCount`, `totalCount`, `reviewCount`는 선택적 0~80 정수, confidence는 0~1 유한수, 알려진 OCR 시간 필드는 음수가 아닌 유한수만 허용한다. 메타데이터를 생략한 기존 백업은 계속 허용한다.
- 요약의 reviewCount와 최근 기록의 foundCount/totalCount를 HTML에 삽입할 때도 escape한다.
- 새 Node 검사는 문자열·범위 밖 값·NaN·Infinity를 거부하고 정상 현재·기존 형식은 허용하는지 확인한다. 공격성 스크립트나 외부 계정을 브라우저에서 실행하지 않았다. 이 기록은 동적 취약점 재현을 주장하지 않는다.

관련 파일은 `src/workspace-state.js`, `src/client-source.js`, `tests/workspace-state.test.mjs`다. 단일 사용자 로컬 앱 경계를 넘어선 다른 OS 계정의 loopback 접근은 이번에 환경 검증하지 않았으며 인증·IPC 구조를 변경하지 않았다.

## 검증과 실제 시안

Node 24 및 설치된 Playwright/Edge를 사용했다. 모든 앱 검사는 임시 프로젝트·캐시 폴더와 `tests/fixtures/local-ocr.png`의 합성 이미지, 모의 로그인·OCR 응답을 사용한다. 브라우저 검사는 로컬 테스트 서버 이외의 요청을 차단했다. 실제 사용자 작업, 외부 AI 계정·실제 AI 호출은 사용하지 않았다.

| 검사 | 결과 |
| --- | --- |
| 전체 Node | 193 / 193 통과 — 기존 192 + 백업 수치 검사 1 |
| 기존 일반 화면 | 42 / 42 통과 |
| 기존 비교 화면 | 18 / 18 통과 |
| 기존 로그인·일괄 수명 주기 | 7 / 7 통과 |
| 신규 디자인·작업 영역 검사 | 21개 통과 |
| 브라우저 예외 | 모든 앱 검사 pageerror 0 |

신규 검사는 1440×900, 1280×720, 1024×700에서 메모·판정·실행 버튼의 위치와 결과 행의 실제 표시 교집합을 확인한다. 768px·390px에서 문서 가로 넘침, 결과 행과 근거 공간, 빈 상태의 문구 설정 접근, 영역 전환과 수동 확대 유지도 확인한다. 원래 200% 브라우저 확대나 실제 Debian 데스크톱 환경은 이번에 실행하지 않았다.

빌드·타입 검사·일반 lint 명령은 이 프로젝트에 별도로 정의되어 있지 않아 N/A다. 설치파일과 Linux 패키지는 생성하지 않았다. `npm run test:design`과 README 실행 설명, Linux 소스 패키지의 검사 파일 목록만 추가했다.

증거는 `.investigation/design-20261102/`에 있다.

- `desktop-review.png`, `tablet-review.png`, `mobile-review.png`: 합성 데이터로 실행한 실제 UI 시안. 마지막 데스크톱 캡처는 명시적으로 화면 맞춤을 누른 상태다.
- `settings.png`, `library.png`, `comparison.png`: 실제 대화상자 화면.
- `before-desktop.png`, `before-settings.png`, `before-library.png`, `before-comparison.png`, `before-tablet-review.png`, `before-mobile-review.png`: 변경 전 같은 합성 시나리오.
- `node-tests.txt`, `browser-tests.txt`, `comparison-tests.txt`, `lifecycle-tests.txt`, `design-result.json`: 검사 결과.
- `review-snapshot.html`: 격리된 실제 UI DOM과 로컬 스타일을 직렬화한 taste 검사 자료. 이미지도 합성 fixture로 포함하며 실행 코드는 제거했다.

## 도구 검사와 검토 범위

Impeccable launcher는 첫 실행에 별도 binary를 내려받을 수 있으므로 실행하지 않았다. SKILL.md의 launcher-unavailable fallback을 고지하고 프로젝트 코드 및 reference/new-work, craft-floor, operate, document 지침을 직접 읽었다. Impeccable detector·자동 훅이 실행되었다고 주장하지 않는다. 전역 훅과 설정도 설치하지 않았다.

taste-skill은 설치 스크립트를 실행하지 않고 로컬 draw·lint·inspect만 실행했다. 최종 lint는 **0 FAIL / 7 WARN**이다. 경고 5개는 선택 underline 3곳과 실제 overlay 그림자 2곳, 1개는 비노출 기존 `.eyebrow` 글자 크기 보정 selector, 1개는 함수명 `unlock`을 마케팅 문구로 오인한 것이다. 전체 기존 소스를 lint한 결과라는 뜻은 아니다.

렌더 검사의 최종 결과는 **1 FAIL / 1 WARN**이며 `taste-inspect.txt`와 `taste-inspect/report.json`에 기록했다. 이 검사기는 직렬화 화면의 첫 h1만 조사하므로 데스크톱에서 숨겨진 모바일 제목을 먼저 만나 no-title을 보고한다. 앱 검사에서는 데스크톱의 실제 표시 h1이 정확히 하나임을 확인했으며, 모바일·태블릿의 현재 작업 제목은 캡처에서 직접 확인했다. 11~12px 파일·언어·수치·도구 보조 글자 비중에 관한 tiny-text 경고는 조밀한 검수 UI의 제한으로 남긴다. 도구 전체 PASS를 주장하지 않는다.

Astra의 실제 화면 검토 후 모바일 목록·근거 높이, 비교창 제목 고정, 데스크톱 실제 diff·사유 가시성을 수정했다. 최종 판정은 **ship — 지적된 수정 목록에 한정, 잔여 0**이다. 제품 전체 보안 인증이나 모든 환경의 사용성 승인을 의미하지 않는다.

스킬 원본 고정 ref·파일 해시·라이선스 및 설치 범위는 `SKILLS-SETUP-2026-11-02.md`와 `skill-install-manifest.json`을 따른다. 기존 자동화 상태와 공개 버전 0.4.4는 변경하지 않았다.
