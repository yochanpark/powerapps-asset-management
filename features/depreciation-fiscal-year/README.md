# 잔존감가 계산 통일 — 4/1 회계연도·영구 99년

자산 조회·출고·바코드 출력·통계·부서 실사·홈 KPI. 2026-09-30 수정·**게시 완료**.
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt).

## 왜

자산파기 신청·승인 화면은 이미 **4/1 회계연도** 기준으로 경과 연수를 계산했다
([disposal-search-panel](../disposal-search-panel/README.md), [disposal-approve-paging](../disposal-approve-paging/README.md)).
나머지 화면은 옛 식이 남아 있어, 같은 자산의 잔존감가가 화면마다 달랐다.

| 옛 식 | 쓰던 곳 | 문제 |
|---|---|---|
| `RoundDown(DateDiff(취득일, Today(), Months) / 12, 0)` | 검색 3화면·통계·부서 실사 | 만 개월 기준이라 회계연도 경계에서 1년 어긋남 |
| `DateDiff(취득일, Today(), Years)` | 홈 KPI | 달력 연도 차이 — 또 다른 기준 |
| 영구 = 총기간 0 | 부서 실사 목록 | 영구 자산이 **"0년"·파기 "대상"**으로 나옴 |

## 새 규칙

- 경과 연수 = FY(오늘) − FY(취득일), FY = 연도 − (1~3월이면 1)
- 영구 = 99년 → 잔존금액 = 취득가액, 파기 대상 아님
- 소모품(총기간 0)은 파기 화면과 같게 둔다(검색은 취득가액 그대로)

## 앱 변경

| 대상 | 변경 |
|---|---|
| `scrAsset.btnSearch.OnSelect` | 잔존감가 이상/이하 필터 2곳 옛 식 → 새 식 |
| `scrAssetOut.btnSearch_2.OnSelect` | 〃 |
| `scrBarcodePrint.btnSearch_1.OnSelect` | 〃 |
| `scrReport.btnRpApply.OnSelect` | 감가상각 집계 `wPassed` 옛 식 → 새 식 |
| `scrStockTakeDept.lblSdGalDepr.Text` | 새 식 + 영구면 **"영구"** |
| `scrStockTakeDept.lblSdGalDisposal.Text` | 새 식 + 영구면 **"비대상"** |
| `scrHome.OnVisible` `colKpiAsset.잔존가액` | 달력 연도 차 → 새 식, 취득일 없으면 경과 0(옛 동작 유지) |

검색 3화면은 `wTotal <= 0 → 취득가액` 분기가 이미 있어 영구·소모품은 원래도 취득가액이었다 — 경과 연수 식만 바꿨다.

## 확인한 것

- 게시본을 `pac`으로 받아 `RoundDown(DateDiff` · `TimeUnit.Years` **0건**, 게시 전후 diff가 위 6개 화면뿐
- 미리보기 검색: 2023년 2월 취득·5년·820만 원 자산이 잔존 **1,640,000**으로 검색됨(옛 식이면 3,280,000 — 경과 3년 → 4년)
- 미리보기 검색: 영구 자산(100억)이 잔존 = 취득가액으로 검색됨
- 부서 실사 목록: 영구 자산이 "영구 / 비대상"
- 홈 KPI 합계는 100.14억 → 100.13억으로 줄지만 표시(억 단위 소수 1자리)는 같다

## 함정

### 1. 수식 바 `Ctrl+A`가 안 먹으면 붙여넣기가 앞에 끼워진다

긴 수식을 통째로 바꿀 때 클릭 직후 `Ctrl+A → Ctrl+V`를 하면, 선택이 안 된 채 새 수식이
옛 수식 **앞에** 붙어 "지원되지 않는 평가" 오류가 난다. `Ctrl+A → Delete`로 비운 것을
눈으로 확인한 뒤 붙여넣는다.

### 2. 한 곳만 바꿀 때는 수식 바 `찾기 및 바꾸기`

컨트롤 선택 → 수식 바 클릭 → `Ctrl+H` → 찾기/바꾸기 칸 입력 → 일치 개수(`1/2` 등) 확인 →
`Ctrl+Alt+Enter`(모두 바꾸기) → "결과 없음"으로 확인. 검색 3화면은 필터가 2곳이라 모두 바꾸기를 쓴다.
