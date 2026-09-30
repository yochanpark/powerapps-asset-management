# 신규자산등록 화면 — 필수 입력·자산관리자·보유부서·등록담당자

PPT 장표 3, `scrAssetDetail`. 2026-09-28 구현, 2026-09-29 결정 반영·**게시 완료**.
정확한 수식은 게시본에서 옮긴 [01-formulas.txt](01-formulas.txt), 컨트롤 YAML은 [02-controls.yaml](02-controls.yaml).

## 결정 사항

| 항목 | 결정 |
|---|---|
| 필수 | 핵심 6개: 자산명·분류·취득가액·감가상각기간·자산상태·자산취득일 |
| 소모품 | 분류가 소모품이면 감가상각기간 자동 = 소모품. **잔존감가는 손대지 않는다**(9/29) |
| 자산관리자 | 사용자 조회 열 신설 |
| 보유부서 | Dataverse 사업부 목록 + `[공용]` |
| 등록담당자 | 보안 역할 대신 **팀**("{REGISTRAR_TEAM}") 구성원. 구성원은 **일단 {ADMIN_ACCOUNT}만**(9/29 추가) |

## Dataverse (Web API로 변경)

- 전역 선택지 `tsk_depreciation`에 **소모품 = 0** 추가 (기존 1/3/5/10/영구=99)
- `fnc_asset.tsk_assetmanager` 신설 — 자산관리자, systemuser 조회
- 보안 역할 **{REGISTRAR_TEAM}** — {APP_USER_ROLE} 권한 복사
- 소유 팀 **{REGISTRAR_TEAM}** — 루트 사업부, 위 역할 부여, 구성원 {ADMIN_ACCOUNT} 1명 (`AddMembersTeam`)
- 역할이 아니라 팀을 쓴 이유: 역할은 사업부마다 복사본이 생겨 캔버스에서 "역할 → 사용자 목록"을 모을 수 없다
  (ForAll/Filter 안의 다대다 탐색 불가)
- 함정: 메타데이터 POST는 45초 넘게 걸려 JS 호출이 타임아웃 난다 → 20초 뒤 GET으로 생성 여부 확인

## 앱 변경

| 대상 | 내용 |
|---|---|
| 데이터카드 5개 | `Required = true` (자산명·분류·취득가액·감가상각기간·자산상태). 잠긴 카드는 고급 탭에서 잠금 해제 |
| `btnDetailSave.DisplayMode` | 자산취득일 카드에 Required 속성이 없어서 `frmAsset.Valid && Not(IsBlank(DataCardValue13.SelectedDate))` 조건으로 막는다 |
| `DataCardValue8.DefaultSelectedItems` | 분류(`DataCardValue4`)가 소모품이면 감가상각 = 소모품 |
| 자산관리자 카드 | 필드 편집으로 추가 → 클래식 컨트롤로 들어와서 모던(`ModernText` + `ModernCombobox`)으로 교체 |
| 보유부서 `cmbOwnDept` | Items = `[공용]` + `'사업부 '` 이름, 기본값 = 본인 사업부, 카드 Update = `cmbOwnDept.Selected.Value`. 원래 텍스트 입력은 숨김. 값은 기존처럼 텍스트로 저장 |
| 등록담당자 `DataCardValue9.Items` | `LookUp('팀 ', '팀 이름' = "{REGISTRAR_TEAM}").'사용자 '` |
| `scrAssetDetail.OnVisible` | `If(gblAssetMode = "New", ResetForm(frmAsset))` — 신규에서 고르고 취소 → 다시 신규 시 이전 선택이 남던 버그 |
| 데이터 원본 | `'팀 '` 추가 |

## 함정 (다시 만질 때)

- 이 앱의 Dataverse 원본 이름은 **뒤에 공백**이 붙는다: `'사용자 '`, `'사업부 '`, `'팀 '`
- **모던 콤보박스에 "형식 있는 빈 값"을 기본값으로 주면 목록 첫 항목이 선택된다.** 빈 **표**를 넘긴다:
  `If(IsBlank(Parent.Default), FirstN(Choices([@fnc_asset].tsk_AssetManager), 0), [Parent.Default])`
  (`Filter(…, false)`도 되지만 리터럴 경고가 뜬다)
- Studio가 `ItemDisplayText`의 `'전체 이름'`을 `'구/군/시'`로 바꿔 놓는다 → 논리 이름 `ThisItem.fullname`으로 쓴다(등록담당자 콤보도 동일)
- 폼 안 컨트롤은 화면 `OnVisible`에서 `Reset()` 하면 실행 오류 → `ResetForm(frmAsset)`
- 데이터카드 자체는 Ctrl+C로 복사되지 않는다(자식만 복사됨)

## 확인한 것 (미리보기)

별표 5개, 6개 다 채우기 전 저장 비활성, 소모품 자동, 부서 목록 `[공용]`+7개, 자산관리자 저장→조회·수정 화면 표시,
관리자 없는 자산은 빈칸, 저장 후 신규는 빈칸, 취소→재신규 시 초기화, 편집 모드 값 표시 회귀 없음.
테스트 자산은 삭제 완료.

## 남은 것

- 게시 후 등록담당자 목록에 {ADMIN_ACCOUNT} 1명이 보이는지
- 다른 사업부 사용자의 저장 → [asset-appendto-permission](../asset-appendto-permission/README.md)
- 팀 구성원 추가(누구를 넣을지 미정)
