# 통계 — 조직 범위 드롭다운 (사업부 위치 = 권한)

PPT 장표 13, `scrReport`. 2026-09-29 구현, 2026-09-30 **게시 완료**.
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt), 드롭다운 YAML은 [02-controls.yaml](02-controls.yaml).

## 장표 요구와 결정

| 요구 | 결정 |
|---|---|
| 권한 관리자는 자기 조직 안에서만 부서 선택, 조직도 인사연동 | **사업부 위치가 권한이다** — 아래 표 |
| 팀 1개를 고르면 부서별 보유현황 비활성 | 팀 선택 시 부서별 체크·카드 비활성 |
| 부서장은 팀 단위로 본다 | 부서장이 보는 부서별 차트 = 하위 팀별 |

사업부 구조: 루트 → 부서 BU 2개 → 각 부서 아래 팀 BU 2개. 사용자 매니저 지정은 쓰지 않는다.

| 내 사업부 위치 | `gblRpLevel` | 드롭다운 |
|---|---|---|
| 루트 | 전사 | 전체 + 부서 + `└ 팀` |
| 부서 BU | 부서 | 자기 부서 + `└ 하위 팀` |
| 팀 BU | 팀 | 자기 팀 1개 (드롭다운 비활성) |

## 앱 변경

| 대상 | 내용 |
|---|---|
| `txtRpDept` (텍스트 입력) | **삭제** → `drpRpDept` (ModernDropdown, Items = `colRpDeptOpt`, 표시 = `ThisItem.표시`, 1개면 Disabled) |
| `scrReport.OnVisible` | `colRpBU`(사업부 이름·상위 이름) → `gblRpLevel` → `colRpDeptOpt` → `Reset(drpRpDept); Select(btnRpApply)` |
| `btnRpApply.OnSelect` | `gblRpSelKind`, `colRpScope`(선택 조직 + 하위). 필터 `gblRpSelKind = "전체" \|\| 자산보유부서 in colRpScope.이름`. 전체일 때 부서 차트는 팀 → 상위 부서로 묶는다 |
| `btnRpReset.OnSelect` | `Reset(drpRpDept)` 추가 |
| `chkRpCh3.DisplayMode` · `conRpCard3.Visible` | 팀을 고르면(`gblRpSelKind = "팀"`) 부서별 보유현황 체크 비활성·카드 숨김 |

## 확인한 것 (미리보기)

- 내 계정(팀 BU): 드롭다운 고정·부서별 체크 비활성
- `OnVisible`의 내 사업부를 **잠시** 부서 BU·루트 이름으로 바꿔서 부서장·전사 화면 확인 후 **원복·저장**
- 예전 자유 텍스트 부서명(조직도에 없는 이름)은 이름 그대로 표시된다
- 게시본 `OnVisible`에 테스트용 사업부 이름 문자열 없음(`gblCurrentUser.사업부.이름` 2곳) — 9/30 pac 확인

## 함정

- **자산의 보유부서 텍스트가 사업부 이름과 정확히 같아야 잡힌다.** 조직도 밖 자유 텍스트 부서명은 부서를 고르면 빠지고
  "전체"에서만 이름 그대로 나온다. 9/30에 테스트 자산 12건을 사업부 이름으로 재배정해서 해결했다
