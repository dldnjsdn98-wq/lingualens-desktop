# Gemini 연결과 Codex 속도 개선 조사

조사일: 2026-09-29. 제품 코드와 배포 버전은 변경하지 않았습니다.

## 현재 측정값

- 0.2.3 설치본에서 합성 이미지 `Start 42`의 OCR 및 비교가 약 13초에 완료됐습니다. 단일 작은 이미지 결과이므로 실제 게임 화면의 평균으로 볼 수 없습니다.
- Codex 버전 확인 3회: 83/81/81ms. 로그인 상태 확인 3회: 94/93/101ms.
- 현재 요청은 인증 확인에서 버전 확인·로그인 상태 확인을 수행하고, 추출에서 다시 버전을 확인합니다. 약 0.25초 규모의 반복 확인은 개선 대상이지만 전체 대기의 주원인으로 보기는 어렵습니다.

## Gemini 연결 선택지

1. Google 계정 로그인을 유지하려면 Antigravity 공식 CLI를 검증합니다. 기존 Gemini CLI의 개인 계정 사용은 현재 계정에서 Google 서버의 UNSUPPORTED_CLIENT 응답으로 막혔습니다. 인증 파일 변경만으로 서비스 이용 자격을 해결할 수 없습니다.
2. Windows 이미지 전달 문제와 백그라운드 실행 문제는 공식 저장소에도 보고돼 있습니다. 이는 이전 버전의 보고이며, 다운로드한 1.2.13에 같은 문제가 있다는 증거는 아닙니다. 현재 버전에서 브라우저 로그인, 합성 이미지, 한글 경로, 연속 요청, 취소를 시험해야 합니다.
3. API 키를 사용할 수 있다면 현재 Node 앱에는 Google 공식 JavaScript SDK로 Gemini API를 직접 호출하는 구조가 단순합니다. 이미지 바이트를 직접 전달하고 구조화된 응답을 받도록 설계합니다. 별도 API 인증 및 사용량 확인이 필요합니다.
4. Antigravity Python SDK에도 types.Image.from_file을 쓰는 공식 이미지 입력 예제가 있습니다. 하지만 기본 빠른 시작은 GEMINI_API_KEY를 요구합니다. Google 계정 구독 인증을 대체하는 방법으로 단정할 수 없으며, 단순 OCR 앱에 Python 실행 환경을 추가할 필요성도 낮습니다.

## Codex 개선 우선순위

1. 동일 이미지 OCR 결과 캐시: 기대 문구는 현재 OCR 입력에 포함되지 않으므로 이미지가 같고 문구만 바뀌면 모델을 다시 호출할 필요가 없습니다. 이미지 해시·모델·추론 설정·프롬프트 및 스키마 버전을 캐시 키에 포함하고 강제 재분석을 제공합니다.
2. 출력 중복 제거: 현재 extractedText와 lines[].text가 같은 글자를 반복 생성합니다. 모델은 lines만 반환하고 앱이 extractedText를 조합하게 합니다. 좌표와 문자 보존 조건은 유지합니다.
3. 빠른 분석 모드: 같은 모델의 지원되는 낮은 추론 수준을 비교 시험합니다. 효과와 오인식 증가량을 측정한 후 기본값을 정합니다. 사용자 계정의 전역 설정은 바꾸지 않습니다.
4. 영역 재분석: 최대 3개 순차 실행을 제한된 병렬 실행 또는 수동 선택으로 바꿉니다. 첫 결과는 먼저 표시합니다. 서버 사용량 제한과 취소 전파를 함께 검증합니다.
5. 실행 재사용: Codex App Server를 한 번 실행하고 요청별 독립 스레드로 이미지·출력 스키마를 전달하는 방식을 비교합니다. 프로세스 초기화 비용을 줄일 수 있지만 모델 응답 시간이 줄어드는지는 별도 측정이 필요합니다.
6. 반복 실행 확인 캐시: 실행 경로와 짧은 로그인 상태 캐시를 사용하고 실행 오류 시 재탐색합니다. 이번 측정에서 기대 가능한 절감은 수백 ms 수준입니다.

화면 전체를 더 작게 축소하는 방법은 작은 글자 정확도를 떨어뜨릴 수 있어 우선순위에서 제외합니다. RapidOCR 등 로컬 OCR을 먼저 실행하는 혼합 구조는 별도 후보이며, 지원 언어와 게임 폰트 정확도 검증 전에는 자동 통과 판정에 사용하지 않습니다.

## 검증 기준

한글·영문·일문, 작은 글자, 기호, 비슷한 글자, 여러 줄의 시험 화면으로 현재 방식과 후보를 비교합니다. 전체 시간의 중앙값·상위 95% 시간, 문자 오류, 잘못된 통과 판정을 기록합니다. 기대 문구는 OCR 모델에 주지 않고 기존 비교 로직으로 판정합니다. 현재 13초 한 건에서 개선 배율을 추정하지 않습니다.

## 확인한 공개 자료

- [Google Gemini JavaScript SDK](https://github.com/googleapis/js-genai)
- [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Antigravity 공식 CLI](https://github.com/google-antigravity/antigravity-cli)
- [Windows 이미지 전달 이슈 #755](https://github.com/google-antigravity/antigravity-cli/issues/755)
- [Windows 백그라운드 실행 이슈 #508](https://github.com/google-antigravity/antigravity-cli/issues/508)
- [Antigravity SDK 이미지 예제](https://github.com/google-antigravity/antigravity-sdk-python/blob/main/examples/getting_started/multimodal.py)
- [Antigravity SDK 인증 안내](https://github.com/google-antigravity/antigravity-sdk-python)
- [Codex App Server 공식 문서](https://learn.chatgpt.com/docs/app-server)
- [Codex 오픈소스](https://github.com/openai/codex)
- [RapidOCR](https://github.com/RapidAI/RapidOCR)

## 2026-09-30 추가 조사: 오픈소스 비교와 실제 게임 화면 시험

이번 추가 조사는 외부 저장소의 공식 README·라이선스·문서와 현재 앱 코드를 비교했습니다. 조사용 OCR 실행 환경만 `.investigation/ocr-research`에 설치했으며, 제품 기능과 배포 버전은 바꾸지 않았습니다. 아래 적용 방식은 구현 제안입니다.

### 가장 우선할 개선: 로컬 OCR과 선택 영역 AI 재검증

전체 이미지를 매번 Codex·Gemini에 전달하는 대신 로컬 OCR로 글자와 위치를 먼저 추출하는 방식을 권합니다. 사용자는 빠른 결과를 확인하고, 작은 글자·장식 글자·불일치 영역만 기존 Google 계정 또는 Codex 연결로 다시 분석할 수 있습니다. 로컬 분석에는 API 키나 계정 로그인이 필요하지 않습니다.

현재 비교 로직에 전달할 문구를 OCR 입력에 주지 않는 원칙은 유지합니다. 인식 신뢰도가 높아도 실제 문자가 틀릴 수 있으므로, 신뢰도만으로 자동 통과시키지 않습니다. 로컬 결과와 AI 재검증 결과에는 분석 방식과 시간을 각각 표시하는 것이 좋습니다.

#### 제공된 게임 이미지의 실제 측정

사용자가 이전에 제공한 LINE CHEF JPG를 외부로 전송하지 않고 현재 Windows PC에서 분석했습니다. RapidOCR 3.9.2, ONNX Runtime 1.30.0, CPU 내부 스레드 4개로 한 엔진을 재사용했습니다. 제공 모델은 PP-OCRv6 det/rec small과 문자 방향 분류 모델입니다.

| 입력 | 1회 | 2회 | 3회 | 중앙값 |
| --- | ---: | ---: | ---: | ---: |
| 전체 2340×1080 | 2.008초 | 1.672초 | 1.671초 | 1.672초 |
| 말풍선 영역 320×270 | 0.589초 | 0.488초 | 0.482초 | 0.488초 |

엔진 초기화는 별도 0.371초였습니다. 위 시간은 엔진 호출 구간이며 Python·모듈 시작, 앱 화면 표시, 검증 비교, AI 추가 호출은 포함하지 않습니다. 전체 이미지 다음에 영역을 분석했으므로 영역 측정은 이미 준비된 엔진의 결과입니다. 기본 전처리에서 이미지가 내부적으로 조정될 수 있습니다.

말풍선의 다음 5줄은 원본 표시와 일치했습니다: `得讚模式`, `高級技能`, `完成所有客人的點單`, `並幫助玩家快速地`, `準備下一道料理`. 팝업 제목 `德古拉詹姆尼`, `夥伴組合包`, 가격 `JP¥1,900`도 읽었습니다. 전체 화면의 어두운 배경 글자에는 오인식과 누락이 있어 전체 정확도가 검증된 것은 아닙니다. 동일 이미지 3회는 성능의 작은 표본이며 한글·일본어·다른 게임 폰트의 품질이나 상위 95% 시간을 보장하지 않습니다.

사용자가 보고한 Codex 74초·Gemini 107초는 당시 앱의 전체 흐름 측정입니다. 실행 환경과 측정 구간이 다르므로 이번 결과와 개선 배율을 계산하지 않습니다. 결과 원문과 좌표는 `.investigation/ocr-research/rapidocr-benchmark.json`에 보관했습니다.

### 확인한 후보와 적용 판단

| 후보 | 저장소 라이선스 | 현재 앱에 적용할 내용 | 판단 |
| --- | --- | --- | --- |
| [RapidOCR](https://github.com/RapidAI/RapidOCR) | Apache-2.0 | 오프라인 글자·좌표 추출, 엔진 재사용 | 실제 게임 이미지 시험을 거친 1순위. 배포용 실행 환경과 한글·일문 모델 검증 필요 |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 | Node/브라우저에서 OCR 실행, 언어별 워커 재사용 | 대안. 이 이미지에서는 속도·정확도를 측정하지 않았음 |
| [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) | MIT | 여러 이미지 작업 목록, 결과 내보내기, 불필요한 영역 제외 | 전체 프로그램 도입보다 작업 흐름을 참고하는 편이 적합 |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | MIT | Windows 실행 파일을 유지하고 JSON 입력·출력으로 반복 분석 | Python 없이 연결할 후보. 공개 README의 v0.2.0은 오래된 PP-OCRv3 모델이므로 이번 PP-OCRv6 측정치를 그대로 적용할 수 없음 |
| [PaddleOCR-json](https://github.com/hiroi-sora/PaddleOCR-json) | Apache-2.0 | Windows에서 실행 가능한 OCR 구성 요소 | 대안. CPU의 AVX 지원과 배포 크기 확인 필요 |
| [SortableJS](https://github.com/SortableJS/Sortable) | MIT | 이미지 순서 드래그 변경, 목록 사이 이동, 여러 항목 선택 | 지금 앱 구조에 적용하기 쉬운 UI 개선 후보 |
| [Uppy](https://github.com/transloadit/uppy) | MIT | 여러 이미지 가져오기, 미리보기, 파일 정보 표시 | 참고 후보. 현재 20장 규모에는 전체 기능 도입의 비용도 비교해야 함 |
| [sharp](https://github.com/lovell/sharp) | Apache-2.0 | 서버에서 썸네일·영역 이미지 생성, 포맷 정규화 | 전처리용. 자체적으로 AI 응답 시간을 해결하지 않음 |
| [Scribe.js](https://github.com/scribeocr/scribe.js) | AGPL-3.0 | 문서 OCR과 교정 작업 | 이번 앱의 우선 도입 후보에서 제외. 채택 시 별도 소스 제공 조건 검토 필요 |

RapidOCR는 PaddleOCR 모델을 변환해 사용하므로 두 프로젝트를 서로 완전히 독립적인 인식 엔진으로 비교하지 않습니다. MIT·Apache 코드 재배포 시 라이선스와 저작권 고지를 포함합니다. 실행 파일 패키지에는 모델과 하위 라이브러리가 함께 들어가므로 각 구성 요소도 확인해야 합니다. RapidOCR README는 모델의 Apache-2.0 배포를 안내하지만 링크된 `MODEL_LICENSES.md`는 이번 조사에서 열리지 않았습니다. 배포 전에 실제 포함 모델의 출처·해시·고지를 별도로 확보해야 합니다. sharp의 libvips 등 하위 구성 요소 역시 별도 라이선스를 따릅니다.

### 현재 코드에서 찾은 구체적인 개선점

1. **분석 속도:** `src/cli.js`는 이미지마다 CLI 프로세스를 새로 실행합니다. 먼저 로컬 OCR 경로를 추가하고 AI 재검증은 선택 영역으로 제한합니다. 기존 Codex·Gemini 선택도 유지합니다.
2. **작업 폴더와 이미지 정리:** `src/workspace-client.js`의 폴더는 작업에 붙인 문자열이며, 이미지 목록에는 선택·삭제만 있습니다. 폴더 목록에서 작업을 이동하고 이름을 바꾸는 기능, 이미지 순서 드래그 변경, 여러 이미지 선택, 선택한 이미지에 문구·영역 설정을 복사하는 기능을 추가할 수 있습니다. 이미지 순서와 설정은 저장 후에도 유지해야 합니다.
3. **전체 검증:** 현재 최대 20장을 순서대로 실행합니다. 이미지별 대기·분석·완료·오류와 소요 시간을 보여주고, 실패하거나 설정이 바뀐 이미지만 다시 실행할 수 있게 합니다. 모든 AI 요청을 한꺼번에 보내는 방식은 사용량 제한과 취소 처리를 확인한 뒤 고려합니다.
4. **저장 크기:** `src/workspace-client.js`는 이미지 바이트를 Base64로 바꿔 작업 JSON에 포함합니다. 저장할 때 이미지를 다시 인코딩하고 전체 데이터를 전송합니다. 저장 이미지 파일과 문구·영역·결과 정보를 분리하면 폴더 이동·이름 변경 시 큰 이미지 데이터를 다시 저장하지 않아도 됩니다. 기존 JSON 백업은 읽을 수 있도록 유지하고 새 저장 형식은 복사 후 검증하는 방식으로 전환해야 합니다.
5. **분석 캐시:** `src/ocr-cache.js`의 결과 캐시는 프로세스 메모리에서 5분·최대 12건을 유지합니다. 앱을 다시 켜면 같은 이미지가 새 분석 대상이 됩니다. 이미지 내용·분석 엔진·모델·옵션·출력 형식을 키로 하는 디스크 캐시와 강제 재분석 기능을 검토합니다. 저장된 검증 결과와 OCR 원문 캐시는 따로 취급합니다.
6. **Codex 진행 상태와 취소:** 공식 [Codex App Server 문서](https://learn.chatgpt.com/docs/app-server)는 유지되는 서버 연결, 이미지 입력, 요청별 출력 스키마, 진행 알림과 `turn/interrupt`를 안내합니다. 이를 이용해 새 작업별 독립 스레드를 만들면 실행 초기화 반복을 줄이고 진행·취소 상태를 정확히 표시할 수 있습니다. 모델 응답 시간의 실제 절감량은 아직 측정하지 않았습니다.

### 적용 순서와 완료 기준

1. 로컬 OCR을 사용자가 선택할 수 있게 추가하고, 현재 검증 결과 형태로 글자·좌표를 변환합니다. 한글·영문·일문·번체 중국어와 작은 글자·가격을 비교한 후 기본 방식 변경을 결정합니다.
2. 이미지 순서 변경·선택 설정 복사·실패 항목 재검증을 추가합니다. 저장 후 다시 열어 순서·문구·영역·결과가 유지되는지 확인합니다.
3. 저장 이미지와 작업 정보를 분리하고 기존 저장 작업을 안전하게 전환합니다. 중간 종료와 잘못된 파일에서도 기존 작업을 복구할 수 있어야 합니다.
4. Codex App Server는 현재 CLI 방식과 같은 이미지·같은 출력으로 비교합니다. 시작부터 화면 표시까지의 시간, 문자 오류, 취소 후 남는 프로세스를 함께 확인합니다.

### 추가 공식 자료

- [Tesseract.js 성능 안내](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md): 언어 워커 재사용과 제한된 워커 수
- [Umi-OCR README](https://github.com/hiroi-sora/Umi-OCR/blob/main/README.md): 배치 작업·영역 제외·내보내기
- [RapidOCR-json README](https://github.com/hiroi-sora/RapidOCR-json/blob/main/README.md): 유지되는 실행 파일에 JSON 요청 전달
- [SortableJS README](https://github.com/SortableJS/Sortable/blob/master/README.md): 여러 목록 간 이동과 MultiDrag
