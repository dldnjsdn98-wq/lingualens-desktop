# Language Test 0.4.3

## 검수와 UI/UX

- 간결한 결과 목록과 고정 상세 패널. 자동 판정·수동 판정을 따로 표시합니다.
- 미해결·미검수·수동 문제·재검수·확인 완료 필터, 문구·OCR·메모 검색, 인식 점수 정렬.
- A 확인 완료, I 문제 있음, N 다음 검수, P 이전 문구, Space 이미지 이동. 입력 중에는 검수 단축키를 사용하지 않습니다.
- 글자 크기 12~18px, 목록 간격, 확대 미니맵. 패널 너비와 보기 설정을 앱 파일에 저장해 실행 포트가 달라져도 복원합니다.
- 이미지별 확대·이동 위치를 저장합니다. 작은 화면의 메모·판정 버튼 겹침을 수정했습니다.

## 영역과 작업 프로필

- 영역 잠금·숨김·다중 선택, 선택 영역 이동·삭제·잠금, 이동과 크기 변경 실행 취소.
- 분석 도구·분석 모드·재확인 도구·OCR 읽기 순서·무시 영역을 자주 쓰는 설정에 저장합니다. 적용 전 미리보기를 제공합니다.
- OCR 원래 순서·가로 줄·여러 열·세로쓰기 표시. 자동 문구 판정은 원래 인식 결과를 사용합니다.

## 화면 비교

- 취소 가능한 Worker에서 픽셀 차이와 변경 위치를 계산합니다.
- 겹쳐 보기 슬라이더, 기준·현재 번갈아 보기, 변경 위치 목록과 다음 변경 이동.
- 현재 이미지 기준 지정, 이름으로 여러 기준 이미지 연결, 언어·해상도·버전 이름이 포함된 기준 이력 최대 10개 및 복원.
- 기준 이력도 작업·백업에 저장하고 원본 정리에서 보호합니다.
- 동일 이미지를 축소 비교할 때 반올림 차이로 잘못 표시하던 픽셀 차이를 수정했습니다.

## 오류 수정과 유지보수

- 판정 버튼을 누르지 않은 메모도 임시 작업·저장 작업·보고서에 보관합니다.
- 선택 영역을 다시 읽어도 다른 문구의 수동 검수 기록이 유지됩니다. 바뀐 문구만 재검수로 표시합니다.
- 미해결 일괄 검증은 기존 결과를 바탕으로 필요한 영역을 재확인합니다. 영역 없는 항목은 전체 검증으로 처리합니다.
- 이모지·결합 문자·긴 문구 차이를 표시할 때 글자가 깨지거나 잘리는 문제를 수정했습니다.
- 이전 버전 작업과 수동 검수 기록의 호환 처리를 추가했습니다.

## 참고한 공개 프로젝트

- [CVAT](https://docs.cvat.ai/docs/annotation/annotation-editor/objects-sidebar/): 영역 잠금·숨김·선택 흐름.
- [Label Studio](https://github.com/HumanSignal/label-studio): 검수 목록과 다음 대상 이동.
- [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR), [GapTree](https://github.com/hiroi-sora/GapTree_Sort_Algorithm): 읽기 순서와 화면 설정.
- [BackstopJS](https://github.com/garris/BackstopJS), [Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker): 비교 보기와 기준 이력.
- [OpenSeadragon](https://openseadragon.github.io/): 확대 위치 미니맵.
- [ODiff](https://github.com/dmtrKovalenko/odiff): 4.5.0 Windows 배포를 별도로 측정했습니다. 이번 배포는 기존 pixelmatch를 Worker에서 실행합니다.

새 기능은 현재 앱 구조에 맞춰 구현했습니다. 참고 프로젝트의 코드를 새로 복사하거나 의존성으로 추가하지 않았습니다. 기존 배포 라이브러리의 라이선스는 THIRD_PARTY_NOTICES.md에 있습니다.
