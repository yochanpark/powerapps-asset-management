# 자산출고 — 인수부서 콤보·관리담당자·상태 "출고"·처리 필수조건

PPT 장표 7-8, `scrAssetOut`. 2026-09-29 구현·**게시 완료**.
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt), 컨트롤 YAML은 [02-controls.yaml](02-controls.yaml).

## 결정 사항

| 항목 | 결정 |
|---|---|
| 인수부서 | 장표 3과 같다 — `[공용]` + Dataverse 사업부 콤보, 값은 텍스트로 저장 |
| 인수담당자 | 명칭을 **관리담당자**로 — 화면 라벨 + `fnc_assetout` 열 표시이름 |
| 자산상태 "출고" | 선택지 추가 + 전 화면 반영. **부서 간 이관은 이관중 유지**, 그 밖의 출고 유형은 보관 → 출고 |
| 보관위치 | 마스터 `fnc_location`에 "기타" 행 추가 |
| 전체선택 체크 | `chkAoSelectAll.Label` 비우기 (헤더와 겹쳤다. `chkBcpSelectAll`은 이미 빈칸) |
| 처리 버튼 | 출고유형·인수부서·보관위치 **셋 다 골라야** 활성 (9/29 추가 요청) |

## Dataverse

- 전역 선택지 `tsk_assetstatus`에 **출고 = 9** 추가 (`InsertOptionValue`). 기존 1 사용 / 2 보관 / 3 수리 / 4 이관중 / 5 파기예정 / 6 파기신청 / 7 파기완료 / 8 손망실
- `fnc_location`에 "기타" 행 (위치구분 4 = 기타, 사용 true)
- `fnc_assetout.tsk_receiver` 표시이름 → **관리담당자**
  - Lookup 열 메타데이터 PUT은 `Targets`를 빼고 `@odata.type`을 넣어야 204가 난다
- 메타데이터 변경 뒤 **"모든 사용자 지정 항목 게시"** → 앱에서 데이터 원본 `fnc_asset`·`fnc_assetout` 새로 고침

## 앱 변경

| 대상 | 전 | 후 |
|---|---|---|
| `txtAoReceiveDept` (텍스트 입력) | 인수부서 자유 입력 | **삭제** → `cmbAoReceiveDept` (02 YAML) |
| `btnAoProcess.OnSelect` | 비이관 상태 = `[@자산상태].보관`, 필드 `인수담당자:` | 인수부서·자산보유부서 = `cmbAoReceiveDept.Selected.Value`, 비이관 = `[@자산상태].출고`, 필드 `관리담당자:` |
| `btnAoProcess.DisplayMode` | — | 출고유형·인수부서·보관위치 중 하나라도 비면 Disabled |
| `lblFldReceiver.Text` | 인수담당자 | 관리담당자 |
| `chkAoSelectAll.Label` | 전체선택 | `""` |
| 상태 색 Switch 3곳 | 출고 없음 | `[@자산상태].출고 → StatusReview` 추가 — `scrAssetOut.lblAoGalStatus`, `scrAsset.lblGalStatus`, `scrBarcodePrint.lblGalStatus_1` |

나머지 화면은 "파기완료·손망실 제외" 필터라 출고 상태가 자동으로 포함된다 — 고칠 곳 없음.

## 함정

- 콤보 YAML의 `Items`는 **`|-` 블록**으로 둔다. `{G: …}`를 한 줄로 쓰면 `YamlInvalidSyntax`
- 선택지를 추가한 뒤 Dataverse 게시 + 데이터 원본 새로 고침을 안 하면 `[@자산상태].출고`가 오류

## 확인한 것

- 미리보기: 헤더 겹침 해소, "관리담당자" 라벨, 부서 목록 `[공용]` + 사업부 7개, 보관위치 "기타"
- 버튼 필수조건: 유형만 → 비활성, + 부서 → 비활성, + 위치 → 활성
- 실데이터 출고 1건: 상태 = 출고 저장, 목록에 보라색 표시. 테스트 자산은 원래 값으로 되돌리고 테스트 출고 이력은 삭제
  (이 테스트가 인수부서·위치 없이 처리돼 값이 빈칸으로 덮인 것이 필수조건 추가의 계기)
