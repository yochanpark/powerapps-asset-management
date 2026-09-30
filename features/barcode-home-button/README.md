# 바코드 출력 화면 — 선택하면 홈 버튼이 움직이는 문제

PPT 장표 5-6 첫 항목. 2026-09-29 수정·**게시 완료**. 수식 변경 없음.

## 원인

`scrBarcodePrint` 제목 줄 `conBcpTitleRow_1`은 가로 오토레이아웃, `LayoutJustifyContent.End`(오른쪽 정렬).
자식 순서가

```
[icoBcpHome] [btnBcpPrint] [btnBcpShowPreview] [btnBcpSearchToggle]
```

였고 가운데 두 버튼은 `Visible: =CountRows(colBarcodeSelected) > 0`. 선택이 생기면 두 버튼이 나타나며
홈이 왼쪽으로 밀렸다.

## 수정

자식 순서만 바꿨다.

```
[btnBcpPrint] [btnBcpShowPreview] [icoBcpHome] [btnBcpSearchToggle]
```

트리 뷰에서 `icoBcpHome` 우클릭 → 순서 바꾸기 → **오른쪽으로 이동** 두 번.
오른쪽 정렬이라 뒤쪽 자식은 고정되고 앞쪽에서만 늘고 준다. 다른 화면(자산출고 등)의 `[홈][접기]` 배치와도 같아진다.

## 확인

미리보기에서 선택 0건 / 1건 모두 홈 아이콘 x 위치 동일. 선택하면 두 버튼이 홈 왼쪽에 나타난다.

## 같은 문제가 또 생기면

오른쪽 정렬 가로 컨테이너에서 **조건부로 보이는 컨트롤은 고정할 컨트롤보다 앞(왼쪽)에** 둔다.
