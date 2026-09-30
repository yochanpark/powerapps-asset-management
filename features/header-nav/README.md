# 헤더 메뉴에서 화면 이동

헤더의 **페이지 서브 리스트**를 눌렀을 때 실제로 그 화면으로 넘어가게 하는 부분이다.

메뉴 자체(헤더 바, 드롭다운, 항목 목록)는 공용 컴포넌트 라이브러리가 이미 그려 준다.
비어 있던 것은 **선택 결과를 화면 전환으로 옮기는 한 조각**뿐이었다.

## 전제

| 항목 | 값 |
|---|---|
| 헤더 컴포넌트 | `conCmpHeader` (컴포넌트 라이브러리) |
| 메뉴 컴포넌트 | `conCmpHeaderMenu` (같은 라이브러리) |
| 메뉴 원본 | Dataverse `tsk_app_list`(포털) / `tsk_page_list`(페이지) |
| 전역 변수 | `gblActiveHeaderMenu` `gblCurrentPortalCode` `gblCurrentPageCode` (`App.OnStart`에서 초기화) |

화면마다 컨트롤이 이렇게 들어 있다.

```
scr*                                  화면
├── con*                              본문 컨테이너
│   └── con*CmpHeader                 헤더 (conCmpHeader 인스턴스)
└── con*Overlay                       메뉴가 열릴 때 덮이는 반투명 판
    ├── conCmpHeaderMenu_page_N       페이지 서브 리스트   ← 여기를 고친다
    └── conCmpHeaderMenu_portal_N     포털 서브 리스트
```

`con*Overlay.Visible`이 `gblActiveHeaderMenu`를 보고 있고, 헤더의 `OnTogglePageMenu`가
그 값을 `"page"`로 토글한다. **여는 것까지는 원래 다 돼 있다.**

## 무엇이 비어 있었나

`conCmpHeaderMenu_page_*.OnSelectMenu`가 이것뿐이었다.

```
Set(gblActiveHeaderMenu, "");
Set(gblCurrentPageCode, menuCode)
```

메뉴를 닫고 헤더에 찍히는 이름만 바꾼다. **`Navigate`가 없으니 화면은 그대로 있는다.**

## 붙이는 순서

1. 트리 뷰 검색창에 `conCmpHeaderMenu_page`를 친다 → 화면별 인스턴스가 한 번에 나온다
2. 인스턴스를 고르고 속성 드롭다운에서 `OnSelectMenu`를 고른다
3. 수식 바에 [`01-onselectmenu.txt`](01-onselectmenu.txt)를 붙여넣는다
4. **헤더가 있는 화면 전부**에 같은 수식을 넣는다 (한 화면만 고치면 그 화면에서 나갈 때만 동작한다)

`menuCode`는 컴포넌트가 넘겨주는 인자다. 선언할 것이 없다.

## `page_code` ↔ 화면

`tsk_page_list`에 화면 이름을 담는 열이 없어서 `Switch`로 매핑한다.
새 화면을 추가하면 이 표와 수식 양쪽을 고쳐야 한다.

| `tsk_page_code` | 메뉴 이름 | 화면 |
|---|---|---|
| `asset_main` | 메인 | `scrHome` |
| `asset_registration` | 자산관리/등록 | `scrAsset` |
| `print_barcode` | 바코드 출력 | `scrBarcodePrint` |
| `asset_release` | 자산출고 | `scrAssetOut` |
| `asset_inventory_check` | 자산재고검사 | `scrStockTakeDept` |
| `corporate_asset_management` | 총무자산관리 | `scrStockTakeAdmin` |
| `asset_disposal` | 자산파기 | `scrDisposalRequest` |
| `asset_disposal_approval` | 자산파기승인 | `scrDisposalApprove` |
| `statistical_report` | 통계 레포트 | `scrReport` |

`scrAssetDetail`과 `scrLabelPrint`는 메뉴 항목이 아닌 하위 화면이다.
`scrAssetDetail`에는 헤더가 있으므로 **수식은 넣되 이동 대상은 아니다.**
`scrLabelPrint`에는 헤더 자체가 없다.

## 함정

### 현재 화면으로도 이동하게 둔다

지금 보고 있는 화면을 메뉴에서 다시 고르면 자기 자신으로 `Navigate`한다.
막을 수도 있지만 그대로 뒀다 — 화면 전환은 없고 `OnVisible`만 다시 도는데,
목록 새로 고침이라 오히려 자연스럽다. 화면마다 분기를 넣으면 수식이 열 벌로 갈라진다.

### 포털 서브 리스트는 건드리지 않았다

`conCmpHeaderMenu_portal_*`에는 템플릿에서 따라온 잔재가 남아 있다.

```
Switch(
    menuCode,
    "approval", Navigate(<그 화면 자신>, ScreenTransition.None)
)
```

화면마다 `Navigate` 대상이 **자기 자신**이라 사실상 아무것도 하지 않는다.
포털 목록에 있는 근태관리·주문관리 따위는 **별개의 캔버스 앱**이라
`Navigate`가 아니라 `Launch(앱 URL)`이 필요하다. 이 저장소의 범위 밖이다.

### 모바일 메뉴는 인스턴스가 없다

헤더의 `OnToggleMobileMenu`는 `gblActiveHeaderMenu`를 `"mobile"`로 만들고
오버레이도 그 값에 반응하는데, **`conCmpMobileHeaderMenu`를 올려놓은 화면이 하나도 없다.**
좁은 폭에서 햄버거를 누르면 빈 오버레이만 덮인다. 이번 작업에서 손대지 않았다.

### `tsk_sort`가 비어 있다

`colPageItems`는 `SortByColumns(..., "tsk_sort", Ascending)`으로 만드는데
자산관리 포털의 페이지 행들은 `tsk_sort`가 전부 비어 있다.
**메뉴에 찍히는 순서가 보장되지 않는다.** 순서를 고정하려면 행에 값을 채워야 한다.

포털을 바꿀 때 `gblCurrentPageCode`를 `First(SortByColumns(...))`로 정하는 수식도
같은 이유로 "첫 페이지"가 뒤바뀔 수 있다.

## Studio에서 넣을 때

같은 수식을 열 번 붙여넣는 작업이라 `docs/automation-notes.md`의
"수식 바에 붙여넣기" 절차를 그대로 따른다. 특히 이 두 가지를 지킨다.

- **붙여넣기 직후에는 아무 데도 클릭하지 않는다.** 수식 바 접기 화살표를 눌렀더니
  붙여넣기가 통째로 취소됐다
- **`Ctrl+A` 뒤 선택이 파랗게 됐는지 눈으로 확인하고 `Ctrl+V`.** 선택이 안 된 상태로
  붙이면 기존 수식이 남아 새 수식 **뒤에 따라붙는다** — 오류가 안 나서 눈치채기 어렵다
