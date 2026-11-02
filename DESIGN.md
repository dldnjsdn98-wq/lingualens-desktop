---
name: Language Test · 대조 작업면과 검수 도크
description: 이미지 근거와 사람의 판정을 함께 읽는 로컬 문구 검수 화면
colors:
  primary: "#263d47"
  frame: "#eceeea"
  sheet: "#ffffff"
  raised: "#f4f5f1"
  canvas: "#dce1e2"
  muted: "#59686c"
  faint: "#657175"
  border: "#e0e4e0"
  control: "#bfc8c7"
  hover: "#e4e8e4"
  selection: "#e8f0f3"
  accent: "#2f6685"
  positive: "#226b50"
  positive-bg: "#e6f2eb"
  negative: "#a23545"
  negative-bg: "#faecee"
  warning: "#865d18"
  warning-bg: "#faf1dc"
typography:
  title:
    fontFamily: "Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "12px"
  metadata:
    fontFamily: "Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "11px"
rounded:
  control: "6px"
  chip: "4px"
  sheet: "16px"
spacing:
  tight: "4px"
  related: "8px"
  gutter: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
---

## Overview

「대조 작업면과 검수 도크」는 오래 읽는 검수 화면이다. taste-skill의 `framed-sheet` 방향(seed `297982069`)을 유지한다. 밝은 stone 상단과 작업 목록이 L자 프레임을 만들고, 이미지와 결과 목록은 위에서 대조하며 선택 문구의 근거·메모·판정은 넓은 하단 도크에서 읽는다. 스크린샷의 OCR 영역과 기대·인식 문구 쌍이 이 제품의 표정이다. 새 랜덤 방향을 뽑지 않고 기존 builder의 상세 패널 구성을 업무에 맞게 확장했다.

Impeccable의 Operate 지침을 적용한다. 시스템 글꼴, 익숙한 컨트롤과 작업 밀도를 유지하고, 장식보다 현재 선택·판정·다음 행동이 먼저 읽히게 한다. 기존의 푸른 카드·체커보드 캔버스·그라데이션을 최종 workbench layer에서 교체했다. 외부 폰트와 이미지는 로드하지 않는다.

## Colors

위 토큰은 `src/review-desk-styles.js`의 `--desk-*` 값에 대응한다. 프레임은 stone, 근거 영역은 white, 이미지 작업면은 평평한 neutral gray다. ink가 기본 행동을 담당하고 muted blue는 현재 선택과 키보드 초점을 나타낸다. 판정 green/red/amber는 자동·수동 상태의 텍스트와 함께 사용한다. 선택과 상태를 같은 의미로 쓰지 않는다.

## Typography

한 시스템 sans 계열을 사용한다. 화면 및 선택 문구 제목 18px, 대화상자 제목 20px, 실제 기대·OCR 문자열 기본 16px, 목록 14px, 레이블 12px, 짧은 수치·버전 보조 정보 11px다. 검수 글자 크기 설정은 목록·메모에 적용하며 기대·OCR은 16px 이상으로 크게 읽힌다. 수치에는 tabular figures를 사용하고 긴 문자열은 생략하지 않고 줄 바꿈한다.

## Layout

데스크톱 상단은 60px, 오른쪽과 아래 sheet inset은 8px다. 새 작업 기본 열 너비는 224px / 가변 이미지 / 360px로, 1440px에서는 `224 + 848 + 360 + 8 = 1440`이다. 저장된 열 너비와 집중 모드는 보존한다. 이미지 대기열은 작업 도구 더보기보다 앞에 놓는다.

선택 결과가 있으면 왼쪽 작업 목록은 전체 높이를 쓰고 중앙 이미지·오른쪽 결과 목록 아래에 검수 도크를 둔다. 도크는 중앙과 오른쪽 두 열 전체를 가로지르며 기본 높이는 약 252px다. 왼쪽은 선택 문구·자동 판정·기대/OCR·diff·사유, 오른쪽 320px(1100px 이하 280px)은 수동 판정·메모·확인 행동이다. 상단 최소 높이 420px를 보호해 짧은 화면에도 결과 두 행과 이미지 공간을 남긴다. 도크 행은 `max-content`로 계산하므로 긴 근거가 도크와 문서 높이를 늘리고 테두리 밖으로 넘치거나 내부 근거 스크롤에 숨지 않는다. 설정 탭·빈 결과 선택에서는 도크를 숨겨 상단 높이를 돌려준다. 캔버스 집중 보기에서도 도크를 숨긴다. 실행·취소는 상단 오른쪽에 유지한다.

780px 이하에서는 이미지·검수·작업 목록 전환을 사용한다. 검수 영역에서 결과 목록 뒤에 도크가 이어지며 근거·메모·판정을 자연스러운 페이지 스크롤로 읽는다. 다른 영역에서는 도크를 숨긴다. 430px 이하에서는 기대/OCR도 한 열로 쌓는다. 결과 목록에만 독립 스크롤을 허용하고 근거의 max-height 제한은 제거한다. 긴 목록 항목은 두 줄 미리보기와 전체 문자열의 title을 제공하며, 선택 문구의 전체 원문은 도크에서 읽는다. 이미지로 돌아갈 때 수동 확대를 유지하고, 화면 맞춤 상태일 때만 새 영역에 맞춘다. 제목은 현재 표시한 작업 영역에 하나만 노출한다.

## Elevation & Depth

프레임과 sheet의 밝기 차이 및 1px 선으로 구분한다. 작업 카드에는 그림자가 없다. 대화상자와 메뉴만 부드러운 그림자를 가진다. 탭의 inset 선은 선택 표시다. 긴 대화상자의 제목과 닫기는 내부 스크롤 중에도 위에 남는다.

## Shapes

컨트롤·행은 6px, 상태 표시는 4px, sheet·대화상자는 16px 모서리를 사용한다. 제품 마크는 스크린샷 영역의 모서리와 L을 기하학적 선으로 그린다. 정보마다 색이 다른 아이콘 박스를 만들지 않는다.

## Components

결과 화면의 주 행동은 「확인 완료 후 다음」이다. 「현재 이미지 검증」은 재실행 보조 행동으로 보인다. 설정 화면에서는 검증 실행이 주 행동이다. 자동 통과와 수동 확인·문제를 별도 문구로 표시한다. 불일치 상세는 기대 문구, OCR 결과, 실제 수정 문자, 불일치 사유와 메모를 제공한다. 중복된 diff 설명은 접근성 이름으로 전달한다.

폼에는 보이는 레이블, 명확한 disabled 상태와 2px focus ring을 제공한다. 오류·취소·저장 실패 안내와 재시도 동작을 유지한다. reduced-motion에서는 전환을 제거한다. 변화는 hover·focus·선택 피드백으로 제한한다.

## Do's and Don'ts

- 실제 이미지와 검증 결과에서 수치·상태를 계산한다. 시안의 합성 데이터는 실제 검수 이력으로 주장하지 않는다.
- 새 화면도 `review-desk-styles.js`의 역할 토큰과 행동 위계를 따른다.
- 결과 목록·근거·메모·판정을 모두 읽을 수 있게 확보한다. 높이 제한으로 목록을 0행으로 만들지 않는다.
- 기본 화면에 그라데이션, 체커보드, 글로우, 큰 헤더, 장식용 입장 애니메이션을 추가하지 않는다.
- 기존 독립형 스타일은 호환용이다. workbench 변경은 마지막 전용 layer에서 관리한다.
