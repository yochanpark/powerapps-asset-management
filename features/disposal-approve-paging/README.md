# 자산파기 승인 — 잔존연수 통일·페이지 겹침·부서 목록 높이

PPT 장표 12, `scrDisposalApprove`. 2026-09-30 수정·**게시 완료**.
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt).

## 장표 12 — 리뷰 코멘트 "이전 프로세스(자산파기)가 구현되지 않아 판단할 수 없음"

신청 화면이 검토 계정에서 0건이라 신청이 없었던 것이 원인 — 신청 쪽은 장표 10에서 조직 범위로 바꿨다
([disposal-search-panel](../disposal-search-panel/README.md)). 승인 화면에서는 두 화면의 계산을 맞췄다.

| 항목 | 전 | 후 |
|---|---|---|
| 잔존연수 | `RoundDown(개월차 / 12)` | **4/1 회계연도**: FY(오늘) − FY(취득일) — 신청 화면과 같은 식 |
| 영구 자산 | 총기간 0 → 잔존 0년 → **감가상각 만료로 분류** | 잔존 99 → 만료 아님, 잔존금액 = 취득가액 |

같은 자산이 신청 화면과 승인 화면에서 다른 잔존연수로 나오던 것이 없어진다.

## 페이지 겹침·부서 목록 높이 (장표 범위 밖, 사용자 요청)

| 증상 | 원인 |
|---|---|
| 신청부서·신청 목록의 마지막 페이지에 앞 페이지 행이 섞인다 | `LastN(FirstN(col, page*5), 5)` — 마지막 페이지가 모자라면 `LastN`이 앞 행을 끌어온다 |
| 신청부서가 4개 이상이면 4·5번째가 칸 안 스크롤로만 보인다 | `galDaDeptList.Height = 100`, 행 높이 36 → 2.8줄. 한 페이지는 5개 |

여러 팀 신청이 들어오기 전에는 한 부서뿐이라 드러나지 않았다. 테스트 데이터로 신청부서 4개를 만들어 확인했다.

## 앱 변경

| 대상 | 전 | 후 |
|---|---|---|
| `scrDisposalApprove.OnVisible` `wUsed` | `RoundDown(DateDiff(…, Months) / 12, 0)` | `(Year(Today()) - If(Month(Today()) < 4, 1, 0)) - (Year(취득일) - If(Month(취득일) < 4, 1, 0))` |
| `scrDisposalApprove.OnVisible` `wLeft` | `Max(0, wTotal - wUsed)` | `If(영구, 99, Max(0, wTotal - wUsed))` |
| `btnDaApproveExpired.OnSelect`·`btnDaEsignRun.OnSelect` `wUsed`·`wLeft` | 위와 같은 옛 식 | 위와 같은 새 식 (9/30 오후 추가 — 아래 함정) |
| `galDaDeptList.Items` | `LastN(FirstN(colDaDepts, page*5), 5)` | `FirstN(LastN(colDaDepts, n - page*5 + 5), 5)` |
| `galDaAssetList.Items` | `LastN(FirstN(Filter(…), page*5), 5)` | `With({wL: Filter(…)}, FirstN(LastN(wL, …), 5))` — 필터는 그대로 |
| `galDaDeptList.Height` | `100` | `184` (36 × 5 + 4) |

신청부서 묶음은 원래부터 `R.신청부서` 기준이다. 장표 10에서 신청부서를 자산 보유부서로 기록하게 바꿔서 실제 팀별로 묶인다.

## 함정

- **잔존연수 식은 이 화면에 세 벌 있다** — `OnVisible`과, 처리 뒤 `colDaRequests`를 다시 만드는 버튼 2개
  (`btnDaApproveExpired`·`btnDaEsignRun`). 처음엔 `OnVisible`만 고쳐서, 버튼을 누른 직후 목록이 옛 계산으로 돌아갔다.
  영구 자산이 0년 = 만료로 보여 **[만료 파기 승인]으로 전자결재 없이 파기완료될 수 있었다.** 식을 바꿀 땐 `wUsed:`로 grep해 세 곳 다
- **갤러리 Height에서 자기 `Self.TemplateSize`를 참조하면 오류가 나며 높이가 0이 된다.** 상수로 넣는다
- 같은 페이지 버그는 자산 목록 세 화면([asset-list-paging-sort](../asset-list-paging-sort/README.md))과
  총무 목록([stocktake-admin-org-panel](../stocktake-admin-org-panel/README.md))에서도 고쳤다.
  **`LastN(FirstN(` 가 보이면 전부 같은 버그다**
- 이 화면 `OnVisible`은 전자결재 결과를 반영하는 Patch를 먼저 돈다 — 미리보기로 열기만 해도 실행된다

## 확인한 것 (미리보기, 테스트 데이터)

- 신청부서 4개 / 7건 — 스크롤 없이 한 화면, 부서를 누르면 아래 목록이 그 부서 신청으로 바뀐다
- 잔존연수 변경 전후를 데이터로 미리 계산 → 미리보기 값과 일치:
  영구 자산이 있는 팀의 "감가상각 만료" 2 → 1, 회계연도 기준으로 잔존 2년 → 1년이 된 자산의 잔여비용이 절반
- 게시 후 pac diff: 바뀐 곳은 위 표의 속성뿐
- 버튼 2개 수정(9/30 오후) 게시 후 pac diff: 두 OnSelect의 4줄뿐. 버튼은 실데이터를 처리하므로 눌러 보지 않았다 —
  현재 신청 7건으로 계산하면 영구 자산 1건이 버튼 뒤 0년 → 99년, 회계연도 경계 1건이 2년 → 1년으로 OnVisible과 같아진다
