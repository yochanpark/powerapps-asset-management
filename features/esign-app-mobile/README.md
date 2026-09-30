# 전자결재 앱 폰 대응

**이 키트는 `DemoElectronicApprovalLeave`(전자결재 **앱**) 것이다.**
자산관리 앱 안의 전자결재 **기능**(`scrDisposalApprove`)은 [`../esign/`](../esign/)이다.
이름이 비슷해 한 번 엉뚱한 쪽을 먼저 고친 적이 있으니 **어느 쪽인지 먼저 확인한다.**

## 전제 — 이 앱은 `ScreenSize.Small`을 쓴다

자산관리 앱은 `App.Width < 768`로 가르는데, 이 앱은 **이미 `ScreenSize.Small` 관례**가 있다.
새 브레이크포인트를 만들지 말고 맞춘다.

```
conElectronicApprovalSidebar.Visible = If(scrElectronicApproval.Size = ScreenSize.Small, false, true)
```

레이아웃 설정은 자산관리 앱과 같다 — `1366x768 landscape`, `ScaleToFit: false`.
**폰에서는 진짜 390px로 그려지고 고정 폭은 그대로 잘린다.**

| 화면 | 내용 |
|---|---|
| `scrElectronicApproval` | 기안 상신·작성 폼 + 사이드바 + 팝업 |
| `scrApproval` | 기안 목록·조회 |

## 넣은 것

### 1. 기안 폼 — DataCard 고정 폭 16개

`frmElectronicApprovalContent`는 `NumberOfColumns: 1` / `WidthFit: true`로 유연한데
**자식 DataCard마다 폭이 박혀 있었다.** `Min(<원래값>, Parent.Width)`로 감싸면
데스크톱은 그대로고 폰에서만 줄어든다.

| 원래 폭 | DataCard |
|---|---|
| 992 (6개) | 기안제목 · 기안일자 · 결재기한 · 보류/반려_사유 · 기안내용 · 참조자 |
| 1083 (10개) | 기안유형 · 연차유형 · 고객명 · 휴가시작일 · 휴가종료일 · 오전오후 · 사용연차 · 반차여부 · 잔여연차 · 첨부파일 |

**트리에서 다중 선택하면 두 번으로 끝난다.** 검색창에 `_DataCard1`을 치면 16개가 늘어선다.

### 2. 본문 폭 — 사이드바가 숨는데 본문은 83%였다

Small에서 사이드바는 숨는데 본문은 계속 `Width * 0.83`이라 **17%를 버리고 있었다.**

```
conElectronicApprovalContent.Width =
    If(scrElectronicApproval.Size = ScreenSize.Small,
       scrElectronicApproval.Width - 30,
       (scrElectronicApproval.Width * 0.83) - 15)
```

### 3. 팝업 — `X`·`Y`를 **먼저** 바꾼다

| 속성 | 값 |
|---|---|
| `X` | `Max(16, (Parent.Width - 1200) / 2)` |
| `Y` | `Max(16, (Parent.Height - 700) / 2)` |
| `Width` | `Min(1200, Parent.Width - 32)` |
| `Height` | `Min(700, Parent.Height - 32)` |

지금 `X`가 `(Parent.Width - Self.Width) / 2`인데 `Width`가 상수라 동작한다.
**`Width`를 수식으로 바꾸는 순간 순환 참조 오류**가 나므로 `X`·`Y`부터 상수 기준으로 바꾼다.

### 4. 나머지

| 컨트롤 | 속성 | 값 |
|---|---|---|
| `DataCardValue5` (첨부) | `Width` / `X` | `Min(544, Parent.Width - 60)` |
| `DataCardValue2` (기안내용) | `X` / `Width` | Small에서 `8` / `Parent.Width - 16` |
| `conApprovalButtonList` | `Height` | `If(Small, 100, 50)` |
| `conApprovalSearchHeader` | `Width` / `LayoutDirection` / `Height` | `Min(1078, Parent.Width - 32)` / Small에서 `Vertical` / `If(Small, 360, 100)` |
| `conApprovalSearchDate` | `Height` | `If(Small, 76, 72)` |
| `conApprovalPageList` | `LayoutOverflowY` | `If(Small, Scroll, Hide)` |
| `conApprovalTable` | `FillPortions` | `If(Small, 0, 1)` |

## 함정

### `LayoutWrap: true`인데 `Height`가 한 줄치면 나머지 줄이 사라진다

`conApprovalButtonList`는 **이미 `LayoutWrap: true`**였는데 `Height: 50`이 한 줄 높이라
폰에서 버튼 4개가 2줄로 접힌 뒤 **한 줄만 보였다.** `LayoutJustifyContent`/`LayoutAlignItems`가
둘 다 `End`여서 아래 줄만 남고 위 줄(요청 제출·결재라인)이 잘렸다.

**잘린 줄은 스크롤로도 못 간다.** `LayoutWrap`을 발견하면 `Height`가 몇 줄치인지 같이 본다.

### `FillPortions` 기본값 1이 `Height`를 먹는다 — 스크롤이 안 생기는 원인

`conApprovalTable`은 `Height: 500`인데 폰에서 표가 2줄만 보이고 **휠도 안 먹었다.**
`LayoutOverflowY: Scroll`을 켰는데도 그랬다.

세로 컨테이너에서는 **`FillPortions`(기본 1)가 `Height`보다 우선**한다.
표가 남는 공간으로 눌리니 **페이지가 넘치지 않아 스크롤 자체가 생기지 않았다.**
Small에서 `FillPortions: 0`으로 만들어 `Height 500`을 살리자 그제서야 스크롤이 생겼다.

> 스크롤을 켰는데 안 움직이면 **넘칠 내용이 실제로 있는지부터** 본다. `Height`만 보지 말고 `FillPortions`를 본다.

### 라벨은 `LayoutMinWidth`만으로 안 된다

줄바꿈은 `LayoutMinWidth`가 만들지만 **표시 폭은 `Width`가 정한다.**
`Width` 기본값 150이 남아 `기안일자 (시작 ~ 종`으로 잘렸다. 둘 다 준다.

### 형제와 다른 값 하나를 찾는 게 빠르다

폰에서 깨진 세 곳이 전부 **형제 컨트롤과 값이 어긋난 자리**였다.

| 증상 | 원인 |
|---|---|
| 버튼이 2개만 보임 | `Height`가 한 줄치 |
| 기안내용 편집기 잘림 | `X: 48` (형제는 전부 `24`) |
| 라벨 잘림 | `Width` 기본값 150 |

`pac`으로 받아 같은 레벨의 `X`·`Width`를 훑으면 눈에 띈다.

## 390px로 보는 법

Studio 캔버스는 **최소가 `소형 600x768`이라 `ScreenSize.Small` 구간에 못 들어간다.**
게시본 플레이어에서 iframe을 직접 줄이는 것이 유일하다.

```js
const f = document.getElementById('fullscreen-app-host');
f.style.width = '390px'; f.style.height = '780px';
window.dispatchEvent(new Event('resize'));
```

게시 직후에는 플레이어가 **이전 버전을 물고 있다.** 노란 배너가 사라질 때까지
URL로 새로 로드한 뒤 측정한다.

## 남긴 것

- **헤더 로고 잘림** — 컴포넌트 라이브러리가 그리는 헤더라 자산관리 앱과 공유한다. 기존 문제
- **기안 목록 표 가로 잘림** — `conApprovalTableColumnHeader.Width = Max(800, Parent.Width-24)`로
  **일부러** 최소 800을 잡아 가로 스크롤을 쓰는 설계다. 그대로 뒀다
- **리치텍스트 툴바 2줄 접힘** — 컨트롤 자체 동작이고 `…` 오버플로로 다 닿는다
