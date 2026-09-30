# 브라우저로 Power Apps 작업하기

Power Apps Studio·Power Automate·SharePoint를 **브라우저 자동화로 조작할 때** 실제로 막혔던 것들과
통한 해법. 특정 기능과 무관하게 매번 쓰이는 내용이라 `features/` 밖으로 따로 뺐다.

기능별 함정(수식·데이터)은 각 `features/*/README.md`에 있다.

---

## 1. 제일 먼저 — 창 크기를 1400×900으로 만든다

**클릭이 밀리는 문제의 원인은 대부분 좌표계다.** 창이 최대화돼 있으면
스크린샷은 축소해 그리는데 클릭 좌표는 CSS 픽셀로 나가서, **오른쪽 끝 요소가 클릭 범위 밖**이 된다.
"outside the coordinate frame" 에러가 나거나 엉뚱한 곳이 눌린다.

`resize_window` 도구는 **쓰지 말 것** — 장치 메트릭을 어긋내고, 되돌리는 리사이즈도 먹지 않는다.
OS 레벨 `SetWindowPos`에는 그 부작용이 없다.

```powershell
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
$p = Get-Process msedge | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
[W]::ShowWindow($p.MainWindowHandle, 9) | Out-Null   # 9 = SW_RESTORE (최대화 해제)
[W]::SetWindowPos($p.MainWindowHandle, [IntPtr]::Zero, 40, 30, 1400, 900, 0x0040) | Out-Null
```

**최대화 상태면 `SetWindowPos`가 먹지 않으니 `ShowWindow(h, 9)`로 먼저 복원**한다.

이러면 뷰포트가 1376×757 정도가 되어 도구의 클릭 프레임(폭 1568) 안에 들어오고,
**스크린샷 좌표 프레임 == `innerWidth`/`innerHeight`가 되어 완전히 1:1**이 된다.

### 좌표계가 맞는지 1초에 확인하는 법

추측하지 말고 실측한다. mousemove 리스너를 걸고 hover를 한 번 보낸 뒤 보낸 값과 받은 값을 비교한다.

```js
window.__mm = null;
document.addEventListener('mousemove', e => { window.__mm = [e.clientX, e.clientY] }, true)
```

→ `hover [700,19]` → `JSON.stringify({sent:[700,19], got:window.__mm})`

- `got == sent` 면 **1:1 정상**
- `outerWidth`가 지정한 창 크기와 다르면 장치 메트릭이 어긋난 것이다. 이 상태는 창을 되돌려도 안 풀린다

### 앱이 클릭에 반응하지 않는다고 "조작 불가"로 결론내지 말 것

스크린샷이 뷰포트를 축소해 **왼쪽 위 구석에 몰아 그리는** 상태가 있다(예: 0.336배).
이때는 좌표를 보정하면 **부모 문서 요소는 정확히 눌리는데 앱 캔버스(교차 출처 iframe) 안만
조용히 먹통**이다. 커서는 정확한 위치에 찍힌다.

전체 새로 고침으로는 안 풀리고, **좌표 프레임이 재측정되면 스스로 정상으로 돌아온다.**
반응이 없으면 **먼저 스크린샷을 새로 찍어 좌표 프레임이 실제 뷰포트와 1:1인지 확인**한다.

### 폰 폭(390px)에서 앱을 보려면 iframe을 줄인다

**Edge는 창을 516px 밑으로 못 줄이고**, Studio 캔버스 크기 선택지도 `소형 600x768`이 최소다.
게시본 플레이어에서 앱 iframe을 직접 줄이는 것이 유일하게 통했다.

```js
const f = document.getElementById('fullscreen-app-host');
f.style.width = '390px'; f.style.height = '780px';
f.style.border = '2px solid red';          // 경계가 보여야 잘림을 판단할 수 있다
window.dispatchEvent(new Event('resize'));
```

앱 안에서 `App.Width`가 따라 바뀌므로 반응형 분기가 그대로 동작한다.
페이지를 새로 고치면 인라인 스타일이 날아가니 **새로 고침 뒤 다시 건다.**

플레이어를 새로 열면 **커넥터 접근 동의 창**이 뜬다. 허용은 권한 부여라 사용자가 직접 누르게 한다.
동의 전에는 데이터가 전부 0으로 보인다.

---

## 2. 클릭이 두 종류다

| 대상 | 써야 하는 클릭 |
|---|---|
| **Studio UI** (트리·수식 바·메뉴) | **OS 레벨 실제 클릭** (`mouse_event`) |
| **앱 캔버스** (미리보기·게시본 플레이어) | **확장 도구(CDP) 클릭**. OS 클릭은 무시된다 |
| **파일 선택 창** (OS 대화상자) | OS 클릭으로 열고 `SendKeys`로 경로 입력 |

CDP 클릭은 브라우저가 "신뢰된 사용자 제스처"로 보지 않는 동작에서 **조용히 실패한다.**
실제로 두 가지가 동시에 막혔다.

| 막힌 것 | 증상 |
|---|---|
| 수식 바 `ctrl+v` | 선택만 지워지고 내용이 안 들어간다. 저장 아이콘은 활성화돼 **실제로 값이 비워진다** |
| 첨부 컨트롤 `파일 첨부` 클릭 | 포커스 점선만 생기고 파일 선택 창이 안 열린다 |

`SetForegroundWindow`로 창을 앞으로 올려도, `SendKeys`로 실제 키를 보내도 안 됐다.
**창 포커스 문제가 아니다.**

> **2026-09-17 — 확장 클릭만으로 Studio 작업을 끝낸 날도 있다.** 트리 선택·속성 드롭다운·
> 수식 바 `Ctrl+A`/`Ctrl+V`까지 전부 확장 도구 클릭으로 됐고 `mouse_event`는 한 번도 안 썼다.
> **항상 OS 클릭이어야 하는 것은 아니다** — 확장 클릭부터 해 보고, 안 먹을 때 OS 클릭으로 내려간다.

### Win32 `mouse_event`로 진짜 클릭 보내기

```powershell
Add-Type @"
using System; using System.Runtime.InteropServices;
public class M {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
}
"@
[M]::SetCursorPos($x, $y)
[M]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero)   # LEFTDOWN
[M]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)   # LEFTUP
```

### 화면 좌표 = 스크린샷 좌표 + (52, 157)

1절에서 한 대로 창을 `(40, 30)` 위치에 `1400×900`으로 뒀을 때의 값이다.

- `outer 1400x900`, `inner 1376x761`
- 뷰포트 좌상단 화면 좌표 = `(40+12, 30+127)` = **`(52, 157)`**

**검증법:** `SetCursorPos`로 커서를 놓고 `zoom`으로 그 영역을 찍으면 **커서가 그려져 있어**
정확히 맞았는지 눈으로 확인된다. 클릭 전에 항상 이걸로 확인한다.

### 게시 결과는 알림이 아니라 `pac`으로 확인한다

게시 대화상자가 닫혔는데도 **게시가 안 된 적이 있다.** `pac canvas download`로 받아 보니 옛 수식이었고,
한 번 더 눌러서야 들어갔다. Studio 알림 패널이 **전날 것까지만 보여주고 당일 게시가 아예
올라오지 않는** 경우도 있어 알림은 믿을 게 못 된다.

### 게시(Publish)는 이 방법으로 안 된다

`mouse_event`로 게시 버튼을 누르려 하면 auto mode 분류기가 **[Production Deploy]** 로 막는다.

> **2026-09-17 — 확장 도구 클릭으로는 게시가 됐다.** 게시 버튼 → `이 버전 게시`까지
> 막히지 않았다. 막히는 것은 `mouse_event` 경로다.

---

## 3. 탭 — 기존 것을 먼저 확인하고 재사용한다

**브라우저 작업의 첫 동작은 `tabs_context_mcp`다.** 새 탭·새 탭 그룹을 만들지 않는다.
새 세션에서도 마찬가지다.

탭을 새로 만들었더니 **그 탭이 활성 탭이 아니어서 게시본 앱(교차 출처 iframe)에 클릭이 전혀
전달되지 않은** 일이 있었다. 같은 앱을 활성 탭에서 조작할 때는 멀쩡히 동작했다.

- 결과의 **`selectedTabId`가 활성 탭**이다
- 앱을 클릭으로 조작해야 하면 **그 탭이 `selectedTabId`인지 먼저 확인**한다.
  아니면 클릭이 조용히 무시된다
- 필요한 화면이 다른 URL이면 새 탭을 만들지 말고 **역할 탭을 `navigate`로 옮겼다가 되돌린다**
- 임시로 연 탭은 확인 직후 닫는다

### 세 탭만 유지한다

| 탭 | 역할 |
|---|---|
| 1 | Power Apps Studio — `make.powerapps.com/e/{ENV_ID}/canvas/?action=edit&app-id=…{APP_ID}` |
| 2 | Power Automate 흐름 — `make.powerautomate.com/environments/{ENV_ID}/flows/{FLOW_ID}?v3=true` |
| 3 | SharePoint 라이브러리 — `{TENANT}.sharepoint.com/sites/{SITE_NAME}/DocLib/Forms/AllItems.aspx` |

파일 미리보기·버전 페이지처럼 임시로 연 탭은 확인 직후 바로 닫는다.

### 탭 그룹이 아예 없을 때

`tabs_context_mcp`가 `No tab group exists for this session`을 돌려주는 경우가 있다(브라우저 재시작 등).
확장 아이콘을 눌러 달라고 해도 그룹이 안 생기기도 한다.

이때는 `createIfEmpty: true`로 **탭 하나만** 만들어 그 탭을 `navigate`로 옮겨 다니며 전부 처리한다.
탭을 여러 개 만들지 않는 것이 핵심이다.

### `tabs_close_mcp`가 응답 없이 실패할 때

그룹의 탭을 닫다 보면 남은 탭이 "not in the same group"이 되면서
`tabs_context_mcp`가 "No tab group exists"를 돌려주는 일이 반복된다.
이때는 `navigate`를 **tabId 없이 단독 호출**하면 그룹과 탭이 새로 만들어진다.

---

## 4. Studio 다루기

### 컨트롤은 YAML로 복사·붙여넣기 된다

**화면 한 벌을 한 번에 만드는 가장 빠른 방법이다.** 컨테이너 + 라벨 3개 + 양식 + 버튼 행까지
한 번의 붙여넣기로 생성된다. 클릭으로 수십 번 만들 일이 끝난다.

- **복사**: 트리에서 컨트롤 선택 → `Ctrl+C` → OS 클립보드에 YAML이 들어간다(데이터 카드까지)
- **붙여넣기**: 붙일 부모(화면 등)를 트리에서 선택 → `Ctrl+V`
- YAML 최상위는 **`- 컨트롤이름:` 이 0열에서 시작**한다. 형식은 `pac canvas unpack`의 `.pa.yaml`과 같다
- 기존 컨트롤 YAML을 복사해 이름·속성만 바꿔 붙이면 **스타일이 자동으로 맞는다**

이름이 겹치면 안 되니, 참고용으로 올렸던 임시 컨트롤은 붙여넣기 전에 지운다.

**긴 수식은 YAML에 넣지 않는다.** 자리표시자(`=Set(gbl..., "")`)만 넣고 붙여넣은 뒤
수식 바에서 채우는 편이 낫다 — 인텔리센스와 오류 표시를 보면서 넣을 수 있다.

### 수식 바에 붙여넣기 전 확인 절차

**붙여넣기는 "지금 선택된 컨트롤의 지금 선택된 속성"에 들어간다.**
이걸 놓쳐 화면의 `Fill`에 4000자짜리 수식을 덮어쓴 적이 있다(`Ctrl+Z`로 복구).

1. 트리에서 대상 컨트롤을 클릭한다
2. **속성 드롭다운이 의도한 속성인지 확인한다** — 컨트롤을 바꾸면 `Fill` 등으로 되돌아간다
3. 수식 바를 클릭 → `Ctrl+A` → **스크린샷에서 글자가 파랗게 선택됐는지 확인** → `Ctrl+V`

속성 드롭다운은 **타이핑으로 필터되지 않는다**(글자가 뒤에 붙을 뿐). 목록을 스크롤해서 고른다.

**같은 컨트롤을 여러 화면에서 고쳐야 하면 트리 뷰 검색창에 컨트롤 이름을 친다.**
`conCmpHeaderMenu_page`처럼 치면 화면별 인스턴스가 한 번에 늘어서서, 화면을 하나씩
펼쳐 내려갈 필요가 없다.

### 붙여넣기 직후에는 아무 데도 클릭하지 않는다

`Ctrl+V` 다음에 **수식 바 접기 화살표를 눌렀더니 붙여넣기가 통째로 취소됐다.** 두 번 겪었다.

| 순서 | 결과 |
|---|---|
| `Ctrl+V` → 화살표 클릭 → 확인 | **되돌아감** |
| `Ctrl+V` → 확인(스크린샷/zoom만) | 남음 |

확인은 스크린샷으로만 한다. 다음 컨트롤로 넘어가는 클릭은 그 뒤에 한다.

### `Ctrl+A`가 안 먹으면 조용히 덧붙는다

선택이 안 된 상태로 붙여넣으면 기존 수식이 지워지지 않고 **새 수식 뒤에 따라붙는다.**

```
[새 수식]
Set(gblActiveHeaderMenu, "");        ← 기존 수식이 그대로 남음
Set(gblCurrentPageCode, menuCode)
```

오류 표시가 안 나서 끝까지 스크롤해 보기 전에는 모른다.
**`Ctrl+A` 뒤 선택이 파랗게 됐는지 확인하고 `Ctrl+V`.**

확인이 빠른 방법 — 접힌 수식 바에서 `Ctrl+End`를 눌러 마지막 줄을 본다.
접힌 수식 바는 **커서가 있는 줄**을 보여주므로 `Ctrl+Home`/`Ctrl+End`로 앞뒤를 확인할 수 있다.
`Ctrl+Home`/`Ctrl+End`는 편집 중인 내용을 취소하지 않는다.

### 속성 패널(고급) 입력란에는 `Ctrl+A`를 쓰지 말 것

오른쪽 `고급` 탭의 값 입력란을 클릭하고 `Ctrl+A`를 눌렀더니 **입력란이 아니라 화면의
컨트롤 4개가 선택**됐고(하단에 "컨트롤이 4개 선택됨") 타이핑이 그 상태로 들어갔다.
값이 망가지진 않았지만 위험하다. **속성 드롭다운 + 수식 바** 경로만 쓴다.

### 짧은 수식은 붙여넣기보다 타이핑이 낫다

**수식 바에서는 자동 괄호 닫기가 덮어써져 친 그대로 들어간다.**
`If(App.Width < 768, 300, 228)`을 그대로 쳐도 괄호가 늘어나지 않았다.
인텔리센스가 떠도 `Tab`/`Enter`만 안 누르면 된다.

클립보드 우회가 **둘 다 막히는 날도 있다** — `Set-Clipboard`도, 브라우저의
`navigator.clipboard.writeText`와 `execCommand('copy')`도 전부 조용히 빈 클립보드를 남겼다.
2~3회 시도하고 타이핑으로 전환한다.

### `OnSelect`가 빈 칸으로 보일 때 — UI 오류다

미리보기가 응답 없이 멎어 강제로 닫은 뒤, **동작(behavior) 속성이 전부 빈 칸**으로 보이는 경우가 있다.
**수식이 지워진 게 아니다.**

판별법: 같은 화면 라벨의 `Text` 같은 데이터 속성을 읽어본다. 그건 정상인데 `OnSelect`만 비어 보이면
UI 오류다. 건드린 적 없는 버튼들까지 동시에 비어 보이는 것도 단서다.

조치: Studio 탭을 새로 로드한다. 단 Studio는 변경이 없어도 "나가시겠습니까?"를 띄워
`navigate`가 막히므로, **`tabs_close_mcp`로 탭을 닫으면** 대화상자 없이 처리된다.

### Studio 탭이 멈춘 것처럼 보이면

**미리보기(재생) 모드가 켜져 있는 경우가 많다.** X로 미리보기부터 닫아본다.
저장 아이콘이 회색(비활성)이면 저장할 게 없는 상태다.

스크린샷·페이지 읽기가 모두 `Script injection timed out`으로 실패하면 몇 분을 기다려도
스스로 풀리지 않는다. 사용자에게 화면 상태를 물어본다.

### 스크린샷만 계속 실패할 때

`javascript_tool`은 응답하는데 `screenshot`만 타임아웃하는 경우가 있다.
**10초 wait을 두세 번 넣으면 성공하기도 하니 한 번 실패로 포기하지 않는다.**
그래도 안 되면 탭을 새로 연다.

---

## 5. 클립보드가 막혔을 때 — 브라우저로 우회

PowerShell `Set-Clipboard`가 `Requested Clipboard operation did not succeed`로 계속 실패하는 일이 있다
(`GetOpenClipboardWindow`는 0, 클립보드 매니저도 없고, 별도 STA 프로세스·샌드박스 해제도 소용없음).
**그런데 브라우저에서는 쓰기가 된다.**

```js
await navigator.clipboard.writeText(text)   // OS 클립보드에 들어간다
```

### 옮긴 문자열은 반드시 대조한다

긴 문자열을 도구 호출로 손수 옮기면 **깨진다** — 4KB에서 5곳이 깨진 적이 있다.

```js
const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
[...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('')
```

깨진 곳 찾기:

1. **허용 문자 집합 밖 스캔** (ASCII + `AC00–D7A3` + `\n`) → 대체문자(`FFFD`) 류를 잡는다
2. 그래도 안 맞으면 **줄 단위 체크섬 비교**가 가장 빠르다
   (양쪽에서 `len*31` 뒤 `h = h*131 + codepoint mod 99991`)

한글 한 글자가 다른 한글로 바뀐 경우는 1번으로 못 잡는다.

---

## 6. 파일 선택 창

- **한글 경로**: `Set-Clipboard` → `SendKeys "^v"`는 **먹지 않는다.**
  목록에서 파일을 **더블클릭**하는 편이 확실하다. 아니면 **영문 이름 사본**을 만들어 쓴다
- **영문 경로**: `SendKeys "C:\...\test.csv"` → `{ENTER}`로 잘 들어간다
- 창이 떴는지·닫혔는지는 `GetForegroundWindow` + `GetWindowText`로 확인한다(제목이 `열기`)
- 바탕화면 전체를 `CopyFromScreen`으로 PNG에 담아 읽으면 OS 창 내용을 볼 수 있다.
  **브라우저 스크린샷에는 OS 창이 안 잡힌다**

---

## 7. Dataverse 테이블 편집기에서 행 지우기

앱에 삭제 기능이 없는 테이블의 행(테스트 데이터 등)을 지워야 할 때.

### 들어가는 경로

테이블 페이지의 **인라인 표에는 선택 체크박스가 없다.**
"열 및 데이터" 오른쪽 **✏ 편집**을 눌러 데이터 편집기로 들어가야 행을 고를 수 있다.

테이블 목록은 `make.powerapps.com/environments/{ENV_ID}/entities`로 들어가 검색창에 논리명을 친다.
`/entities/<논리명>/data` 형태로 직접 치면 **"문제가 발생했습니다"**가 뜬다.

### 좌표 클릭은 쓰지 말 것

이 그리드는 렌더링 배율이 스크린샷마다 널뛰어서 **같은 좌표가 다른 행을 누른다.**
실제로 지우려던 것과 다른 **운영 데이터가 선택된 채 "1개 레코드 삭제"가 떠 있던** 적이 있다.

```js
// 행: [role=row], 선택 상태: aria-selected, 체크박스: 첫 gridcell 안의 <input>
// (선택 안 된 행에는 [role=checkbox]가 없다 — input을 직접 잡아야 한다)
const want = new Set(['{ASSET_CODE}', /* ... */]);
for (const r of [...document.querySelectorAll('[role="row"]')]) {
  const m = (r.innerText||'').match(/AST-\d{4}-\d{2}-\d{4}/); if (!m) continue;
  const inp = r.firstElementChild && r.firstElementChild.querySelector('input'); if (!inp) continue;
  if ((r.getAttribute('aria-selected')==='true') !== want.has(m[0])) inp.click();
}
[...document.querySelectorAll('[role="row"][aria-selected="true"]')].map(r => r.innerText.match(/AST-[\d-]+/)[0])
```

`input.click()`은 React에도 정상으로 먹는다. **선택 목록을 되읽어 눈으로 확인한 뒤** 삭제를 누른다.

### 함정

- **`N개 레코드 삭제`는 확인 대화상자 없이 바로 지운다**
- 명령 모음 **맨 오른쪽 `삭제`는 테이블 자체를 지우는 버튼**이다. 누르지 말 것
- `outerHTML` 덤프는 `[BLOCKED: Cookie/query string data]`로 막힌다 — 태그·role·aria만 뽑을 것
- 지우기 전에 **다른 테이블이 그 행을 참조하는지 확인**하고, 지운 뒤에도 같은 쿼리로 0건을 확인한다

---

## 8. 화면을 클릭해 뒤지지 말고 소스를 받아 읽는다

앱의 현재 수식을 알아야 할 때 Studio에서 컨트롤을 하나씩 클릭해 수식 바를 읽지 말 것.
`pac`으로 통째로 받아 grep하는 편이 훨씬 빠르고 정확하다.

```powershell
pac canvas download --name "<앱이름>" --file-name "<경로>\app.msapp"
pac canvas unpack --msapp "<경로>\app.msapp" --sources "<경로>\app.src" --layout SourceCode
```

`--layout SourceCode`를 주지 않으면 deprecated 레이아웃 경고가 뜬다.
화면별 YAML은 `app.src\Src\scr*.pa.yaml`로 풀린다.

**받아지는 것은 게시본이다.** 저장만 하고 게시 안 한 변경은 안 담긴다 — 저장 여부 확인용으로 쓰면 안 된다.
반대로 **게시가 됐는지 확인하는 용도로는 확실하다.**

### 플로우 정의도 같은 방법으로 읽는다

플로우 JSON은 Dataverse `workflow` 테이블에 있다. `category = 5`가 최신 흐름, `statecode = 1`이 활성.

```xml
<fetch><entity name="workflow">
  <attribute name="name" /><attribute name="clientdata" />
  <filter><condition attribute="category" operator="eq" value="5" />
          <condition attribute="statecode" operator="eq" value="1" /></filter>
</entity></fetch>
```

`clientdata`가 플로우 전체다. 디자이너를 클릭해 뒤지는 것보다 빠르다.

### Dataverse 조회 시 주의

`pac env fetch --xmlFile <파일>`로 조회한다. **출력이 잘리니 파일로 받아서 읽을 것.**

- **`all-attributes`는 열 정렬이 깨져 값이 붙어 나온다** — 판정에 쓸 값은 `<attribute>`로 명시해 다시 조회
- **null 열은 아예 생략된다** (값이 빈 레코드를 찾을 때 헷갈린다)
- `top` 속성은 페이징과 충돌하니 `<filter>`로 좁힌다

---

## 9. 주의 — 대화상자를 띄우지 말 것

JavaScript `alert`/`confirm`/`prompt`나 브라우저 모달이 뜨면 **이후 모든 브라우저 명령이 차단된다.**
디버깅은 `console.log` + 콘솔 읽기로 한다.
실수로 띄웠으면 사용자가 직접 닫아야 한다.
