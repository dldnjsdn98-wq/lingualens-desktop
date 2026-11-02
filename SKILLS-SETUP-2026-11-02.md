# 프로젝트 도구 적용 기록

사용자가 추천 도구와 디자인 변경을 승인했고, 설계는 GPT-6 Astra Medium, 구현은 GPT-6.1 Sol High로 지정했다. 설치 위치는 이 앱의 `.agents/skills/`이며 상위 프로젝트와 전역 Codex 설정은 변경하지 않았다.

## 설치한 소스

| 스킬 | 저장소 | 고정 커밋 | 선택 경로 |
|---|---|---|---|
| impeccable | https://github.com/pbakaus/impeccable | e89e3ada3e875a89ac2c5d33d11e65ebef6fe285 | .agents/skills/impeccable |
| taste-skill | https://github.com/Leonxlnx/taste-skill | 12af471f627f866411b4bd785b19646d3672784c | skills/taste-skill |
| security-audit | https://github.com/cloudflare/security-audit-skill | c1c8a8c1471069fb0e188eeaff69b8e8db6564a8 | skills/security-audit |
| ponytail-review | https://github.com/DietrichGebert/ponytail | 96608e078b2d5ea607c5c3b8b5a54d1c1fba6846 | skills/ponytail-review |
| verification-loop | https://github.com/affaan-m/ECC | b38be6a7f6350964d59328b52f0624e1d1d552d1 | skills/verification-loop |

공식 skill-installer helper로 검토 폴더에 내려받고, 파일을 확인한 후 프로젝트 폴더에 복사했다. 각 스킬에 고정 커밋의 UPSTREAM-LICENSE.txt를 포함했다. 설치 파일별 SHA-256은 `skill-install-manifest.json`에 기록한다.

## 적용 범위

- Impeccable: Operate 모드와 craft-floor/설계 지침. 실행 엔진은 다운로드하거나 실행하지 않았으며 허용된 직접 문서 읽기 fallback을 사용한다. 자동 detector를 통과했다고 주장하지 않는다.
- taste-skill: 앱 전용 방향 선택과 framed-sheet 디자인. 로컬 draw/lint/inspect 스크립트는 별도로 읽고 필요한 범위에서 실행한다. 외부 이미지·폰트·계정은 필요하지 않다.
- Security Audit: 로컬 HTTP, CLI, 백업 경계의 읽기 전용 guidance 검토. 전체 6단계 감사나 동적 침투 테스트가 아니다.
- Ponytail review: 변경 코드와 연결된 호출부의 정확성·불필요한 복잡성 검토. 자동 세션 훅을 설치하지 않았다.
- ECC: verification-loop 한 항목만 설치. 이 앱의 실제 빌드·검사 체계에 해당하는 단계만 실행하고 나머지는 해당 없음으로 기록한다.

## 변경하지 않은 항목

전역 설정, 자동 실행 훅, MCP 연결, 모델 공급자 설정, 로그인 정보, 예약 자동화, 공개 릴리스, Windows/Linux 설치파일은 이번 도구 설치로 변경하지 않는다. 설치된 스크립트는 코드 파일이며 설치만으로 실행되지 않는다. Impeccable launcher를 나중에 실행하면 엔진 다운로드/사용자 캐시 쓰기가 발생할 수 있으므로 이번 작업에서는 제외했다.

이전 자동화는 사용자의 중지 요청에 따라 일시 중지된 상태를 유지한다. 스킬은 해당 프로젝트 작업에서 사용하며 이번 작업에서는 직접 문서를 읽어 적용했다.
