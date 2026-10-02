# 휴가 사용연차를 평일(월~금)만 세기

**이 키트는 `DemoElectronicApprovalLeave`(전자결재 **앱**) 것이다.**

> 2026-10-01 게시 완료. `01-formulas.txt`는 `pac canvas download`로 받은 게시본과 같다.

## 원인

`사용연차` 칸은 휴가 시작일~종료일의 **달력일 수**(`DateDiff + 1`)였다.
금요일~월요일 휴가가 4일로 잡혀 잔여연차가 주말만큼 더 깎였다.
2026-10-01 통합 테스트에서 발견했다([`../esign-integration-test/`](../esign-integration-test/)).

## 변경

| 화면 | 컨트롤.속성 | 바꾼 것 |
|---|---|---|
| `scrElectronicApproval` | `DataCardValue11.Default` | 날짜를 `Sequence`로 하루씩 펼쳐서 `Weekday(…, StartOfWeek.Monday) <= 5`인 날만 센다 |

- 반차 `예`는 그대로 0.5
- 종료일이 시작일보다 앞이면 `Max(0, …)` 덕분에 0 (원래 식은 음수가 나왔다)
- **공휴일은 빼지 않는다** — 공휴일 데이터가 없다. 필요해지면 공휴일 테이블을 만들어 `Filter` 조건에 `Not(Value in 공휴일.날짜)`를 더한다
- 이미 상신된 기안의 저장값은 바뀌지 않는다(새로 쓰는 기안부터)
- 잔여연차(`DataCardValue14`)는 저장된 `사용연차` 값을 합산하므로 따로 고칠 것이 없다

## 함정

- `ForAll(Sequence(n, 0), DateAdd(시작, Value, Days))`의 결과는 열 이름이 `Value`인 단일 열 표다. 바깥 `Filter`에서도 `Value`로 읽는다
- 이 칸은 `DisplayMode.View`라 사용자가 고칠 수 없다. 계산식이 곧 규칙이다

## 확인한 것 (Studio 미리보기)

| 입력 | 결과 |
|---|---|
| 10/2(금) ~ 10/5(월) | **2** (예전 식 4) |
| 앱 검사기 | 오류 0 / 경고 10 (기존 위임 경고, `DataCardValue14.Default`) |

## 남은 것

- 게시 → 게시본 pac diff → 이 파일 교체
- 공휴일 반영 여부는 미정
