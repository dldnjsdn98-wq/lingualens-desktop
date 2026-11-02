# Language Test · 과감한 검수 화면 개선

설계는 GPT-6 Astra High, 구현은 GPT-6.1 Sol Extra High로 분담했다. 변경은 이 프로젝트의 로컬 소스·검사·디자인 문서에 적용했다. 공개 버전 0.4.4, 배포본, Git 이력·브랜치, 자동화와 사용자 작업은 변경하지 않았다. 이전 변경 기록은 `IMPLEMENTATION-2026-11-02.md`, 이번 설계 원본은 `BOLD-DESIGN-2026-11-02.md`다.

## 결과

이미지와 결과 목록은 위에서 대조하고 선택 문구의 근거와 수동 판정은 넓은 하단 도크에서 읽는다. 기존 오른쪽 열에 쌓여 있던 상세를 중앙·오른쪽 전체 폭으로 이동하여 목록·근거·메모의 높이 경쟁을 해소했다.

- 새 작업의 기본 폭은 224px / 가변 이미지 / 360px이며 1440px에서 `224 + 848 + 360 + 8 = 1440`이다. 저장된 사용자 폭과 리사이즈는 유지한다. 왼쪽 대기열은 전체 높이를 사용하고 작업 도구 더보기보다 앞에 보인다.
- 하단 도크의 왼쪽은 선택 문구·자동 판정·기대/OCR·diff·사유, 오른쪽 320px(1100px 이하 280px)은 수동 판정·메모·확인 행동이다. 「확인 완료 후 다음」을 주 행동으로 유지한다. 자동 통과와 수동 확인은 별도 사실이다.
- 제목 18px, 실제 기대/OCR 기본 16px 이상으로 위계를 키웠다. 기존 글자 크기 설정은 목록·메모와 큰 검수 문구에 계속 적용한다. 긴 결과 행은 두 줄 미리보기와 전체 title을 가지며 도크 원문은 생략하지 않는다. 분석 정보는 펼쳐서 읽는다.
- 결과 선택이 없거나 설정 탭이면 도크를 숨겨 상단 공간을 돌려준다. 캔버스 집중 보기와 작은 화면의 이미지·작업 목록에서도 숨긴다. 이미지·문구 집중 레이아웃은 도크를 두 열 전체에 배치한다. 수동 확대·이동 보존과 화면 맞춤 재계산을 확인했다.
- 780px 이하에서는 기존 영역 전환을 유지한다. 결과 목록 뒤의 근거·메모·판정은 문서 흐름으로 읽고 근거 내부 스크롤을 제거했다. 430px 이하 기대/OCR은 한 열이다.

짧은 화면 실측에서 상단 400px는 두 번째 결과 행에 27px만 남겼다. 설계 제안의 최소 300px 대신 구현은 상단 420px를 보호하고 720px·700px 높이에서 필요한 20~40px 문서 스크롤을 허용한다. 또 고정 shell의 `auto` 하단 행이 긴 근거를 남은 높이로 축소하는 것을 발견해 `max-content` 행으로 수정했다. 최종 긴 문구 도크는 527px, 내부 본문은 493px로 테두리 안에 포함되며 이미지 공간은 302px를 유지했다. 이 실측은 `long-geometry.json`에 있다.

주요 변경 파일은 `src/review-desk-styles.js`, `src/workbench-client.js`, `src/ux-client.js`, `src/enhancement-tools.js`, `src/client-source.js`, `tests/browser-design.mjs`다. 새 검사 파일이나 패키지 스크립트는 추가하지 않아 Linux 검사 파일 목록 변경은 필요 없다. Linux 소스 패키지는 기존의 src 자동 수집 방식을 따른다.

## 검증

모든 작업 저장소·캐시는 임시 폴더다. 실제 외부 AI 계정이나 AI 호출을 사용하지 않았다. 초기 추가 검사에서 기본 자동 재확인 옵션이 합성 이미지를 로컬 OCR로 재인식하는 것을 발견했다. 최종 디자인 검사는 이를 명시적으로 끄고 로컬 OCR 요청을 차단·검사하여 순수 모의 extractor만 사용한다. 초기 로컬 OCR은 합성 그림만 읽었으며 사용자 자료를 읽지 않았다.

기본 실행 권한에서는 loopback 연결과 임시 파일 rename이 EACCES·EPERM으로 실패했다. 동일한 임시 자료 검사를 권한 있는 실행으로 재수행했다. 앱 오류를 고치기 위해 검사 강도를 낮추거나 실패를 통과로 계산하지 않았다.

| 검사 | 결과 |
| --- | --- |
| 전체 Node | 193 / 193 통과 |
| 기존 일반 화면 | 42 / 42 통과 — 마지막 UI 수정 후 재실행 |
| 기존 화면 비교 | 18 / 18 통과 |
| 기존 로그인·일괄 수명 주기 | 7 / 7 통과 |
| 디자인·도크·추가 스트레스 | 33 / 33 통과 |
| 브라우저 예외 | 각 앱 검사 pageerror 0 |

브라우저 총 100개는 기존 67개와 디자인 33개다. 디자인 검사는 1440×900, 1280×720, 1024×700, 768×844, 390×844에서 실행했다. 800×150 fixture 외에 1280×720의 16:9 합성 게임 화면을 직접 그려 이미지 viewport와 읽을 수 있는 결과 두 행을 확인했다. 긴 한국어·일본어 기대 문구, 여러 줄 모의 OCR, 결과 열 개, 빈 검색, 설정 복귀, 집중 모드, 메모·확대·이동 보존도 확인했다.

실제 200% 브라우저 확대는 headless 브라우저에서 키 입력이 적용되지 않았다(`innerWidth` 1440 유지). 따라서 1440×900의 200%에 해당하는 **720×450 CSS viewport**로 재배치와 긴 근거·메모 접근을 검사했다. 실제 200% 브라우저 확대를 실행했다고 주장하지 않는다. Debian 데스크톱과 설치파일은 이번에 실행·생성하지 않았다. 별도 빌드·타입 검사·lint 스크립트는 정의되지 않아 해당 없음이다.

## 디자인 도구와 검토

Impeccable Operate·bolder·craft-floor와 taste-skill app-screens 지침을 적용했다. Impeccable 엔진 다운로드는 앞서 승인된 문서 직접 읽기 fallback으로 대체했고 UI 수정 직전 craft-floor를 다시 읽었다. detector·자동 훅·전역 설정은 설치하거나 실행하지 않았다.

taste의 기존 `framed-sheet`와 seed `297982069`를 유지했다. `draw.mjs --app --show`로 저장된 방향을 확인했으며 랜덤 재추첨은 없다. 팔레트·시스템 글꼴·L-frame을 유지하고 기존 좁은 상세 패널 blueprint를 사용자 요청과 Astra의 검수 도크 설계로 대체한 것이 의도적인 구조 override다. 새 세계나 외부 폰트·이미지를 추가하지 않았다.

최종 lint 범위는 새 workbench 스타일·workbench client·ux client 세 파일이다. **0 FAIL / 7 WARN**이며 선택 underline 세 곳·실제 overlay 그림자 두 곳, 비노출 기존 eyebrow 크기 보정 selector 한 곳, 함수명 `unlock`을 마케팅 문구로 오인한 한 곳이다. 최종 렌더 검사는 **1 FAIL / 1 WARN**이다. `no-title`은 DOM 첫 h1인 숨겨진 모바일 제목을 읽는 오탐이며 앱 검사는 실제 표시 h1이 하나임을 확인한다. `tiny-text`는 파일·언어·도구·상태 보조 글자가 11~12px인 조밀한 검수 UI의 제한으로 남긴다. 중간에 지적된 모바일 요약의 14px 가장자리 여백은 16px로 수정했고 최종 렌더에서 해당 지적이 사라졌다. 결과는 같은 폴더의 `taste-inspect.txt`와 `taste-inspect/report.json`에 보존한다. 도구 전체 PASS를 주장하지 않는다.

Astra는 기본 데스크톱·태블릿·모바일·설정·저장 작업·비교와 후속 16:9·긴 근거 캡처를 검토했다. 모바일 기대/OCR 한 열과 긴 도크 테두리 포함을 보완한 뒤 최종 disposition은 **ship — 지적된 수정 목록 잔여 0**이다. 이는 이번 변경의 검토 범위이며 제품 전체 인증을 뜻하지 않는다.

## 실제 UI 시안과 증거

증거 폴더는 `.investigation/design-bold-20261102/`다.

- `desktop-game-review.png`: 실제 앱의 16:9 합성 게임 검수 화면. 외부 게임 캡처가 아니다.
- `desktop-review.png`, `tablet-review.png`, `mobile-review.png`, `settings.png`, `library.png`, `comparison.png`: 실제 UI 기본 시나리오.
- `game-review-1440.png`, `game-review-1280.png`, `game-review-1024.png`: 16:9 화면과 결과 두 행의 표시 공간.
- `long-evidence-desktop.png`, `long-evidence-mobile.png`, `zoom-equivalent-review.png`: 긴 CJK 근거와 문서 스크롤·모바일 한 열·등가 확대 시안.
- `synthetic-game-frame.png`: 검증용 합성 1280×720 화면. `Start`, `42%`, 튜토리얼 이름·메모·판정은 검증용 자료다.
- `before-bold-*.png`: 앞선 검수 데스크 캡처를 복사해 보존한 이전 모습.
- `node-tests.txt`, `browser-smoke.txt`, `browser-comparison.txt`, `browser-lifecycle.txt`, `design-tests.txt`, `design-result.json`: 검사 결과.
- `long-geometry.json`, `browser-zoom.json`, `review-snapshot.html`, `taste-direction.txt`, `taste-lint.txt`, `taste-inspect.txt`: 실측과 도구 판독 자료.
