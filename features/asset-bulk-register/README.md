# 자산등록 CSV 일괄등록 — 게시본 스냅샷 (2026-09-15)

`DemoAssetManagement` 앱 `scrAsset` 화면의 **CSV 일괄등록** 기능을 **게시된 그대로** 떼어 둔 것이다.
나중에 고치거나 되돌릴 때 Studio를 클릭해 뒤지지 말고 여기서 꺼내 쓴다.

- 게시 시각: **2026-09-15 15:07:20**
- 출처: `pac canvas download --name DemoAssetManagement` → `unpack --layout SourceCode` → `Src/scrAsset.pa.yaml`
- 이 폴더의 YAML은 **`{{PFX}}` 치환 없이 그대로 붙여넣으면 되는 원문**이다.
  새 화면에 처음부터 만들 때는 이 폴더가 아니라 `../csv-upload/`(일반 템플릿)을 쓴다.
- 색상은 `AppTheme.*` 테마 컴포넌트를 참조한다. 자기 앱의 테마 컴포넌트 이름으로 바꿔 붙여넣는다.

## 파일

| 파일 | 내용 | 앱에서의 위치 |
|---|---|---|
| `01-btnAuCsvUpload.yaml` | 대화상자를 여는 버튼 | `scrAsset` › `conTitleRight` ("+ 신규자산 등록" 옆) |
| `02-conAuUploadDialog.yaml` | 대화상자 한 벌(제목·안내·양식·첨부·메시지·버튼행). `btnAuUploadRun.OnSelect` 포함 | `scrAsset` 최상위 |
| `03-btnAuUploadRun-OnSelect.txt` | 등록 버튼 수식만 (수식 바 붙여넣기용, 143줄) | `btnAuUploadRun.OnSelect` |
| `template-자산등록.csv` | 사용자 배포용 템플릿 (UTF-8 BOM) | — |

`03`은 `02` 안에 든 수식과 같은 내용이다. 수식만 고칠 때 `02`를 통째로 다시 붙이지 않으려고 따로 뒀다.
(`03`은 `../csv-upload/03-onselect-신규등록형.txt`와 바이트 단위로 동일하다.)

## 이 기능이 의존하는 것

앱 밖에 있는 것들이다. **지우면 기능이 죽는다.**

| 종류 | 이름 | 하는 일 |
|---|---|---|
| 클라우드 흐름 | `자산관리-재고실사CSV업로드` | 첨부 파일 → UTF-8 텍스트. 이름만 재고실사지 **용도 무관**이고 재고실사 기능과 공유한다 |
| SharePoint 목록 | `CSV업로드` (`/Lists/CSV/`) | 빈 목록. 캔버스 **첨부 컨트롤을 띄우기 위한 용도**뿐이다. Dataverse로는 첨부 컨트롤이 안 나온다 |
| Dataverse 테이블 | `cr5f6_fnc_asset` | 등록 대상 |

전역 변수: `gblAuUploadShow` / `gblAuUploadMsg` / `gblAuCsvText`, 컬렉션 `colAuHead` / `colAuValid` / `colAuTerm`.

## 되돌리는 법

1. Studio에서 `scrAsset`을 연다
2. 트리에서 대상 부모(`conTitleRight` 또는 화면 최상위)를 고른다
3. 해당 YAML 파일 내용을 **클립보드로** 복사해 붙여넣는다 (수동 타이핑 금지 — `../csv-upload/README.md`의 붙여넣기 절차 참고)
4. 저장 → 게시
5. 게시 확인은 다시 `pac`으로 받아 `btnAuCsvUpload` grep

## 고칠 때 밟기 쉬운 지뢰

- **날짜**: `DateAdd(DateValue(x), 12, TimeUnit.Hours)`로 정오 보정한다. 빼면 하루 전으로 저장된다
- **Choice 비교**: `Text()`로 감싸야 한다. 안 감싸면 검사기 오류 없이 "0건 등록"만 나온다
- **Choice Patch**: `LookUp(...).Value`를 넣는다. 레코드를 그대로 넣으면 형식 오류
- **자산코드**: Dataverse 자동 채번(`AST-YYYY-MM-NNNN`)이라 Patch에서 **뺀다**
- **열 찾기**: 위치가 아니라 **헤더 이름**으로 찾는다 (내보내기 CSV가 가나다순이라)
- **.xlsx 가드**: `EndsWith(..., ".csv")`로 막고 있다. 엑셀은 "CSV UTF-8로 저장"해야 한다

## 검증 상태 (2026-09-15)

- 정상 2건 → `등록 2건 / 실패 0건`
- 오류 5행 → `등록 1건 / 실패 4건` + 행별 사유 표시
- 앱 검사기 오류 0
- 테스트로 만들어진 자산 `{ASSET_CODE}` 5건는 **삭제 완료**
