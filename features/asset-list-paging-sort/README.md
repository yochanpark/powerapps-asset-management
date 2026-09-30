# 자산 목록 — 페이지 번호·헤더 정렬·반응형 열 폭·잔존감가 숫자 검사·양식 다운로드

PPT 장표 2(+ 2026-09-28 사용자 요청), `scrAsset`. 2026-09-28 구현·**게시 완료**.
같은 페이징 버그를 `scrAssetOut`·`scrBarcodePrint`에도 고쳤다(9/28 게시 완료).
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt), 페이지 번호 갤러리 YAML은 [02-controls.yaml](02-controls.yaml).

## 요청과 결정

| 요청 | 결정 |
|---|---|
| 페이징이 제대로 안 된다 — 10개씩 1, 2 … 페이지 | `FirstN(LastN(...))`로 고치고 페이지 번호 가로 갤러리(최대 10개 창) |
| 헤더 정렬 | 헤더 라벨 OnSelect로 ▲▼ 토글 (전자결재 앱 목록 헤더 방식) |
| 자산 리스트 간격 조절 "능동적으로" | **반응형 열 폭** — 헤더 FillPortions + 행 라벨이 헤더 X·Width 참조. 드래그 조절은 사용자가 거절 |
| 잔존감가 검색: 한쪽만 입력해도 검색, 숫자만 / "영구" 금지 | AND·한쪽 입력은 이미 동작. **숫자 아니면 Notify**만 추가 |
| CSV 일괄등록 양식 다운로드 | **SharePoint 고정 CSV + `Download()`** |

## 원인 — 페이징

원래 `LastN(FirstN(col, locPage * size), size)`. 마지막 페이지가 모자라면 `LastN`이 **앞 페이지 행을 끌어와** 겹쳐 보였고,
페이지 번호 없이 ◀▶만 있었다.
→ `FirstN(LastN(col, CountRows(col) - locPage * size + size), size)` — 뒤에서 잘라 앞에서 취하니 마지막 페이지는 남은 행만 나온다.

## 앱 변경 (scrAsset)

| 대상 | 내용 |
|---|---|
| `scrAsset.OnVisible` | `locSortCol: "", locSortAsc: true` 추가 |
| `galAsset.Items` | `Switch(locSortCol, …)`로 정렬한 뒤 위 페이징 |
| `lblHdrCode/Name/Category/Date/Status` | Text에 ▲▼, OnSelect로 정렬 토글 + `locPage: 1`. FillPortions 3:5:2:2:2, PaddingLeft 5 |
| `lblGal*` 5개 | `X = lblHdr*.X`, `Width = lblHdr*.Width` |
| `galPageNum` + `btnPageNum` | `conPaging`에 붙여넣기(02 YAML). `conPaging` Height 36 → 48, `icoPageNext`는 끝으로 이동 |
| `icoPageNext.OnSelect` | 전체 페이지 수 상한 |
| `btnSearch.OnSelect` | 잔존감가 이상/이하 중 하나라도 `^[0-9,]+$`가 아니면 Notify, 아니면 원래 검색 |
| `btnAuTemplateDownload` | 업로드 팝업 버튼 줄에 추가, `Download(".../DocLib/자산등록_양식.csv")` |

양식 파일은 SharePoint REST로 올렸다 — UTF-8 BOM + 헤더 1줄.

## 다른 두 화면 (페이징만)

| 화면 | 갤러리 | 페이지 번호 |
|---|---|---|
| `scrAssetOut` | `galAoAsset.Items` | `galAoPageNum` / `btnAoPageNum` |
| `scrBarcodePrint` | `galBcpAsset.Items` | `galBcpPageNum` |

YAML에 `FillPortions: =0`을 넣어 붙여넣으면 너비 토글을 따로 끌 필요가 없다. 페이저 Height 48.

## 함정

- **갤러리 `Items`를 비우면 Studio가 행 라벨 Text를 기본 필드로 재바인딩한다.** 빈 붙여넣기로 `galAsset.Items`가 비었을 때
  `lblGalCategory/Date/Status`가 `ThisItem.자산보유부서`로 바뀌어 게시본 수식으로 복구했다
- **붙여넣은 갤러리 안 ModernButton Height를 Studio가 12~16으로 바꿔 놓는다** → 매번 32로 다시 넣는다
  (32는 기본값이라 YAML에서는 Height 줄이 사라진 것으로 보인다)
- 붙여넣은 갤러리는 "너비 조정 가능"이 켜져 있어 Width가 안 먹는다 → 토글로 끄거나 `FillPortions: =0`
- 헤더 폭(고정값)과 행 오프셋(`W-600` 등)이 따로 놀던 것이 간격 문제의 원인이었다 — 행은 헤더를 참조하게 둔다

## 확인한 것

- 미리보기: 13건 → 1·2 페이지, 정렬 ▲▼, 날짜 정렬, "영구" 차단, 이상만 입력 → 4건
- 게시 후 pac diff: 의도한 변경 전부 들어감, 행 라벨 Text 원본과 동일(복구 확인). 양식 다운로드는 사용자가 게시본에서 확인
- `scrAssetOut`·`scrBarcodePrint`: 미리보기 1·2 페이지 이동
