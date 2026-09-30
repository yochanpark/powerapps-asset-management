# 부서 재고검사 — CSV 규칙·미확인 제거·출고 자동사유·미보유사유 기타

PPT 장표 9, `scrStockTakeDept`. 2026-09-29 구현·**게시 완료**(추가 요청분 포함).
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt), 컨트롤 YAML은 [02-controls.yaml](02-controls.yaml).

## 결정 사항

| 항목 | 결정 |
|---|---|
| CSV | **자산코드 열만 필수**(보유여부 열은 무시). 업로드 즉시 부서 목록 전체를 판정 — CSV에 있으면 보유, 없으면 미보유(스캔으로 보유였던 것도 CSV에 없으면 미보유) |
| 필터 | "미확인" 제거 → 전체 / 보유 / 미보유. 미확인 자산의 상태칸은 빈칸 |
| 미보유사유 자동 | 미보유로 확정될 때 자산상태가 **출고면 사유 = 출고**, 그 밖은 수동 |
| KPI "확인 완료" | 보유만 센다 |
| 미보유사유 수작업 (추가 요청) | 목록 + **기타**를 고르면 옆에 상세 입력칸 |

## Dataverse

- `tsk_missingreason`(로컬 선택지): 1 = 자산 미확인, 2 = 출고, **3 = 기타** 추가
- 텍스트 열 `tsk_missingreasondetail` — "미보유사유 상세", 200자
- 변경 뒤 "모든 사용자 지정 항목 게시" → 데이터 원본 새로 고침

## 앱 변경

| 대상 | 내용 |
|---|---|
| `btnSdUploadRun.OnSelect` | 자산코드 열만 읽어 `colSdList` 전체를 CSV 유무로 보유/미보유 upsert. 미보유 + 출고 → 사유 출고, 아니면 기존 사유 유지. 결과 메시지 "보유 N / 미보유 M / 부서 목록에 없는 코드 K" |
| `btnSdSubmit.OnSelect` | 미확인 → 미보유 확정 시 출고면 사유 출고 |
| `drpSdStatusFilter.Items` | `["전체", "보유", "미보유"]` |
| "미확인" 분기 4곳 | `galSdScanResult.Items` · `lblSdListTitle.Text` · `lblSdPageInfo.Text` · `icoSdPageNext.DisplayMode`에서 제거 |
| `lblSdGalHold.Text` | 미확인 → `""` |
| `lblSdKpiScannedValue.Text` | 보유만 |
| `lblSdUploadGuide.Text` | 새 규칙 안내 문구 |
| `drpSdGalReason.Default` | **원래부터 있던 버그 수정** — 아래 |
| `drpSdGalReason.OnChange` | 사유를 바꾸면 `'미보유사유 상세'`를 비운다 |
| `drpSdGalReason.Width` | 기타면 0.08W(옆에 상세 칸), 아니면 0.18W |
| `txtSdGalReasonDetail` | 새 컨트롤(02 YAML). 기타일 때만 보이고, FocusOut 때 상세를 Patch |

## 함정

- **저장된 미보유사유가 늘 빈칸으로 보이던 버그**: `drpSdGalReason.Default`가 `Value = Text(ThisItem.미보유사유)`로
  선택지와 텍스트를 비교하고 있었다 → `LookUp(Choices(fnc_stocktake_detail.미보유사유), Value = ThisItem.미보유사유)`
- 이날 클립보드가 막혀 `txtSdGalReasonDetail`은 삽입 메뉴로 넣고 속성을 타이핑했다. 02 YAML은 게시본에서 옮긴 것이라 그대로 붙여넣어도 된다

## 확인한 것

- CSV 실테스트(미리보기): 자산코드 2개만 든 CSV → "보유 2건 / 미보유 1건 / 부서 목록에 없는 코드 0건", 목록·DB 일치, 필터 3개. 테스트 행 삭제로 원상복구
- 기타 상세: 저장된 사유 "출고" 표시 / 기타 → 상세 칸 열림 → 입력 저장 / 다른 사유로 바꾸면 칸 닫히고 상세 비움

## 남은 것

- 출고 자동 사유는 테스트 부서에 출고 상태 자산이 없어 **실데이터 미검증**
- 보유 행에서 사유 칸을 잠글지 — 결정 대기
