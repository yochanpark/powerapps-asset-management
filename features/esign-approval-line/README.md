# 결재라인 표시 + 기안자 부서 키트

**이 키트는 `DemoElectronicApprovalLeave`(전자결재 **앱**) 것이다.**
자산관리 앱 안의 전자결재 **기능**(`scrDisposalApprove`)은 [`../esign/`](../esign/)이다.
같은 앱의 폰 대응은 [`../esign-app-mobile/`](../esign-app-mobile/)에 있다.

2026-09-22 작업. 요청은 두 줄이었다.

> ① 기안 올릴 때 기안 **작성자의 부서** 정보도 필요하다
> ② 결재라인 UI가 안 이쁘다 — **승인자 1인지 2인지 구별이 안 된다**

**결재선이 어떻게 구성되는지(고정 결재자·역할 버튼·순번 재계산·최대 5명·임시저장 JSON·상신 시
`approval_route` 생성)는 한 줄도 건드리지 않았다.** 바꾼 것은 전부 표시 속성이다.
예외는 아래 "④ route 복원 순번" 하나뿐이고, 그건 별도로 승인을 받고 고쳤다.

---

## 먼저 — 부서는 이미 데이터에 있다

이 앱에서 **부서 = 사업부(business unit)**다. 사용자 선택 갤러리부터가 `User.사업부.이름`으로 거른다.

```
galElectronicApprovalUserList.Items =
    Filter('사용자 ' As User, ... User.사업부.이름 = galElectronicApprovalTeamList.Selected.이름 ...)
```

그리고 결재선 컬렉션 `colApprovalLine`은 **승인자의 `DeptName`을 원래부터 담고 있었다.**
역할 버튼 5개(`결재`/`합의`/`확인`/`참조`/`열람`)가 전부 이렇게 `Collect`한다.

```
Collect(colApprovalLine, {
    Sequence: CountRows(colApprovalLine) + 1,
    ID:       galElectronicApprovalUserList.Selected.사용자,
    Name:     galElectronicApprovalUserList.Selected.'전체 이름',
    DeptName: galElectronicApprovalUserList.Selected.사업부.이름,   // ← 이미 있다
    Role:     "결재"
})
```

**빠져 있던 건 두 가지뿐이다.** ⓐ `DeptName`을 아무 데도 안 그리고 있었다
ⓑ **기안자 본인**의 부서는 어디에도 없다. `approval_master`에 부서 열이 없다.

`approval_master`에 열을 새로 만들면 Teams 승인 카드·메일에도 쓸 수 있지만
스키마 변경 + 승인 플로우 수정이 따라온다. **이번엔 화면 표시만** 하기로 했다.

---

## 파일

| 파일 | 용도 |
|---|---|
| `01-formulas.txt` | 바꾼 수식 원문. 수식 바에 그대로 붙여넣는다 |

`AppTheme.*`는 앱이 쓰는 테마 컴포넌트 참조다. 자기 앱 이름으로 바꾸거나 `RGBA(...)` 리터럴로 바꾼다.
`'사용자 '`는 Dataverse `systemuser`의 이 환경 표시명이다. **뒤에 공백이 하나 있다.**

---

## ① 기안자 + 부서 한 줄

기안자 줄은 `conDrafterRow` > `txtDrafterValue`(ModernText)다. 폼 필드가 아니라
제목과 폼 사이에 끼워 넣은 라벨이라 `Form.Updates`에 안 실린다(`만든 사람`은 읽기 전용 열이라
폼에 카드로 넣으면 Patch가 거부될 수 있다).

```
txtDrafterValue.Text =
With(
    {u: If(locIsNewMode,
           LookUp('사용자 ', '기본 메일 주소' = User().Email),
           LookUp('사용자 ', 사용자 = varApprovalDetail.'만든 사람'.사용자))},
    Coalesce(u.'전체 이름', User().FullName)
    & If(IsBlank(u.사업부.이름), "", " / " & u.사업부.이름)
)
```

→ `홍 길동 / 연구소`

**요령은 두 분기를 모두 `'사용자 '` 레코드로 맞추는 것이다.**
`varApprovalDetail.'만든 사람'.사업부.이름`은 `approval_master` → `systemuser` → `businessunit`으로
**2단계 홉**이라 기대지 않는 편이 낫다. `LookUp`으로 한 번 더 내려받으면 각 단계가 1홉이 되어 확실하다.

- 신규(`locIsNewMode`)는 로그인 사용자, 기존 건은 `만든 사람`을 본다
- `만든 사람`이 비면 `LookUp`이 Blank를 돌려주고 `Coalesce`가 `User().FullName`으로 떨어진다
- 부서가 비면 `/` 구분자까지 통째로 빠진다

---

## ② 사이드바 스테퍼 `galElectronicApprovalReviewers`

기안 폼 오른쪽에 세로로 그려지는 진행 스테퍼다. 폰(`ScreenSize.Small`)에서는 사이드바째 숨는다.

### ⚠ 배지가 순번이 아니라 **상태 첫 글자**를 찍고 있었다

"1인지 2인지 구별이 안 된다"의 진짜 원인. 이것 하나가 전부였다.

```
BadgeStatus1.Content = Left(ThisItem.Status, 1)     // → 전부 'P' / 'N'
```

`Items`가 `Status: If(Sequence = 1, "Pending", "Not Started")`라 **P 아니면 N**이고,
순번은 화면 어디에도 없었다.

| 컨트롤 | 속성 | 새 값 | 원래 값 |
|---|---|---|---|
| `BadgeStatus1` | `Content` | `Text(ThisItem.Step)` | `Left(ThisItem.Status, 1)` |
| " | `BasePaletteColor` | `If(ThisItem.Current, AppTheme.Color.HeaderBg, AppTheme.Color.TextDisabled)` | `Switch(Status, "Pending", …, "Approved", …, "Rejected", …)` |
| `ReviewTypeText1` | `Y` | `26` | `65` |
| " | `Height` | `20` | `Parent.TemplateHeight / 2 - 5` |
| " | `Size` / `Color` | `11` / `AppTheme.Color.TextSecondary` | `14` / 기본 |
| `ReviewerNameText1` | `Wrap` | `false` | `true` |
| 갤러리 | `TemplateSize` | `If(Small, 70, 80)` | `If(Small, 70, 120)` |

- 원래 `BasePaletteColor`의 `Switch`에 **`"Not Started"` 분기가 없어** 대기 단계가 기본색이었다.
  실제로 쓰이는 값은 `Pending`/`Not Started` 둘뿐이라 `Current` 하나로 가르는 편이 단순하다
- `ReviewTypeText1.Y`가 `65`라 이름(`Y: 0`, `Height: 26`)과 한참 떨어져 한 덩어리로 안 보였다
- **`Wrap: false`가 중요하다.** 긴 이름은 두 줄로 넘쳐 아래 역할·부서 줄과 **겹쳤다.**
  ModernText는 넘친 줄을 안 잘라낸다. 끄면 말줄임(`…`)이 된다

연결선 `RectangleShape1`은 `Parent.TemplateHeight`·`BadgeStatus1.Height`/`.Y` 기준이라
배지·행 높이를 바꿔도 따라온다. 손댈 필요 없다.

---

## ③ 결재라인 지정 팝업 `galElectronicApprovalApprovalLine`

### 템플릿 잔재로 왼쪽 143px가 통째로 비어 있었다

Variant가 `BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0`인데 이미지를 안 쓴다.
그래서 `Title2`(이름)가 `X: 143`, `Subtitle2`(순번·역할)가 `X: 21 / Y: 13 / 12pt 회색`으로
따로 놀고 있었다. **그 빈 자리에 순번 배지를 넣으면 모양과 구별이 동시에 해결된다.**

```
[1] 홍 길동  ·  결재        ✕      ← 배지는 역할별 색
    연구소
[2] 김 철수  ·  합의        ✕
    개발1팀
```

| 컨트롤 | 속성 | 새 값 | 원래 값 |
|---|---|---|---|
| 갤러리 | `TemplateSize` | `64` | `104` |
| `Subtitle2` → **순번 배지** | `Text` | `ThisItem.Sequence` | `ThisItem.Sequence & ". " & ThisItem.Role` |
| " | `X` / `Y` / `Width` / `Height` | `16` / `14` / `28` / `28` | `21` / `13` / `73` / `25` |
| " | `Fill` | 아래 `Switch` | `RGBA(0,0,0,0)` |
| " | `Color` | `AppTheme.Color.TextOnColor` | `RGBA(50,49,48,1)` |
| " | `Align` / `VerticalAlign` | `Center` / `Middle` | `Left` / `Top` |
| " | `FontWeight` / `PaddingLeft` | `Semibold` / `0` | `If(IsSelected, …)` / `12` |
| `Title2` → **이름·역할** | `Text` | `ThisItem.Name & "  ·  " & ThisItem.Role` | `ThisItem.Name` |
| " | `X` / `Y` | `56` / `10` | `143` / `38` |
| " | `Width` | `Parent.TemplateWidth - 122` | `Parent.TemplateWidth - 173` |
| " | `FontWeight` | `Semibold` | `If(IsSelected, …)` |
| `Title2_1` (신규) → **부서** | `Y` / `Size` / `FontWeight` | `34` / `11` / 기본 | — |
| " | `Color` / `Text` | `AppTheme.Color.TextSecondary` / `ThisItem.DeptName` | — |

```
Subtitle2.Fill =
Switch(ThisItem.Role,
    "결재", AppTheme.Color.HeaderBg,
    "합의", AppTheme.Color.StatusInfo,
    "확인", AppTheme.Color.StatusReview,
    AppTheme.Color.TextDisabled)        // 참조 · 열람
```

### 부서 라벨은 만들지 말고 **`Title2`를 복제**한다

트리에서 `Title2` 선택 → `Ctrl+C` → `Ctrl+V` → `Title2_1`이 갤러리 안에 생긴다.
`X`·`Width`·`PaddingLeft`·글꼴이 그대로 따라오므로 **정렬이 저절로 맞고 속성 5개만 바꾸면 끝난다.**
새 라벨을 삽입해 좌표를 손으로 맞추는 것보다 훨씬 빠르고 어긋나지 않는다.

### 치수 근거

- `TemplateSize 64` = 콘텐츠 56 + `Separator4` 8
- 배지 `Y: 14` = (56 − 28) / 2 → 세로 가운데
- `Title2.Y: 10` + `Height: Self.Size * 1.8`(≈25) / `Title2_1.Y: 34` + `Height`(≈20) → 54, 56 안에 들어간다
- `Width: Parent.TemplateWidth - 122` = 왼쪽 56 + 오른쪽 66.
  오른쪽은 삭제 아이콘 `NextArrow2`가 `TemplateWidth - 62 … − 12`를 쓴다

---

## ④ 덤으로 드러난 기존 버그 — route 복원 시 순번 하드코딩

배지에 순번을 찍기 시작하자 **이미 상신된 기안 상세에서 배지가 전부 `1`**로 나왔다.
전에는 `P`/`N`이라 안 보였을 뿐, 데이터가 처음부터 틀려 있었다.

`scrElectronicApproval.OnVisible`은 상태에 따라 `colApprovalLine`을 세 갈래로 채운다.

| 분기 | 출처 | 순번 |
|---|---|---|
| 신규 (`locIsNewMode`) | 고정 결재자 1명 `LookUp('사용자 ', 사용자 = GUID("{FIXED_APPROVER_ID}"))` | `1` — **맞다** |
| 임시저장 | `ParseJSON(varApprovalDetail.결재라인임시)` | `Value(ThisRecord.Sequence)` — 맞다 |
| 상신됨 | `Filter(approval_route, 'approval master id' = varApprovalDetail.'doc no')` | **`1` 하드코딩 — 틀렸다** |

```diff
 ForAll(
     Filter(approval_route, 'approval master id' = varApprovalDetail.'doc no'),
     {
-        Sequence: 1,
+        Sequence: 결재순번,
         ID: 승인자.사용자,
         Name: 승인자.'전체 이름',
         DeptName: 승인자.사업부.이름,
         Role: "결재"
     }
 )
```

`approval_route.결재순번`에 값이 이미 들어 있으므로 읽기만 하면 된다.
이 분기는 **상신된 기안 조회에서만** 돌고 그 화면은 읽기 전용(버튼이 `뒤로가기`뿐)이라
상신·임시저장 동작에는 영향이 없다.

### ⚠ `OnVisible`에 `Sequence: 1,`이 **두 군데** 있다

신규 모드의 고정 결재자 쪽은 **1이 맞다.** 뒤쪽만 고쳐야 한다.
수식 바를 펼치면 아래에 **`찾기 및 바꾸기`**가 있고, **정규식 버튼(`.*`)**을 켜면 하나만 정확히 잡힌다.

```
찾기 :  Sequence: 1,\n(\s+)ID: 승인자
바꾸기:  Sequence: 결재순번,\n$1ID: 승인자
```

`1/1`로 뜨는 것을 확인하고 **단일 바꾸기** 버튼을 누른다. `$1`로 들여쓰기가 보존된다.
**패턴에 `\n`을 넣어야 여러 줄 검색이 켜진다** — `\s+`만으로는 안 된다.

---

## 함정 — 속성 패널 숫자칸이 수식을 담고 있으면 덮어쓰기가 안 된다

오른쪽 속성 패널의 `위치`/`크기`/`안쪽 여백` 칸은 **평가된 값**을 보여주지만
속성이 수식이면 안에 든 것은 수식 원문이다. `ReviewTypeText1.Height`가
`Parent.TemplateHeight / 2 - 5`(표시는 `55`)인데 triple-click 후 `20`을 쳤더니
**선택이 안 되고 뒤에 붙어** `Parent.TemplateHeight / 2 - 520`이 됐다.

- 상수인 칸(`X: 21`, `Width: 73`)은 triple-click → 타이핑이 잘 먹는다. 빠르니 그대로 써도 된다
- 소수점이 보이거나(`25.2`) 부모에 따라 변할 값이면 수식이다 → **속성 드롭다운 + 수식 바**로 간다

---

## 검증 (Studio 미리보기)

| 확인 | 결과 |
|---|---|
| 신규 기안 기안자 | `홍 길동 / 연구소` |
| 신규 기안 사이드바 | 배지 `1` |
| 팝업에서 2번째(합의) 추가 | 배지 `1`(녹색) · `2`(파랑), 이름·역할 한 줄, 부서 아랫줄 |
| 긴 이름 | 말줄임 처리, 아랫줄과 겹치지 않음 |
| 상신된 기안 열기 | 기안자 부서 표시, 배지 `1` · `2` |
| 앱 검사기 | 오류 0 / 경고 2 (둘 다 기존 위임 경고) |

기존 경고 2건은 `btnSubmitConfirmOk.OnSelect`와 `galElectronicApprovalUserList.Items`로
이 작업 전부터 있던 것이다.

---

## 남은 것

- **승인 카드·메일에는 기안자 부서가 안 나온다.** 화면 표시만 했기 때문이다.
  필요해지면 `approval_master`에 부서 열을 만들고 상신 `Patch`에 넣은 뒤 승인 플로우를 고쳐야 한다
- 사이드바의 `Status`/`Current`는 여전히 **`Sequence = 1`을 진행 중으로 가정**한다.
  상신된 기안에서도 1번이 늘 노란색/녹색으로 보인다. 실제 진행 상태를 그리려면
  `approval_route.결재상태`를 같이 읽어야 한다
