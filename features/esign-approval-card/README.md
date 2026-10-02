# 전자결재 승인 카드 — 중복 발송·휴가 날짜·링크

**이 키트는 `DemoElectronicApprovalLeave`(전자결재 **앱**)와 승인 카드를 보내는 Power Automate 흐름 것이다.**
2026-10-01 통합 테스트([`../esign-integration-test/`](../esign-integration-test/))에서 결정 대기로 남긴 두 건과,
그 뒤 사용자가 짚은 링크 문제까지 같은 날 고쳤다. 전부 저장·게시·실검증 완료.

| # | 증상 | 원인 | 고친 곳 |
|---|---|---|---|
| 1 | 임시저장 → 상신하면 Teams 승인 카드가 2~3장 | 같은 테이블을 보는 흐름 3개 중 2개가 상신 이벤트에도 발화 | 흐름 2개의 트리거 필터 |
| 2 | 카드의 휴가 날짜가 하루 앞당겨짐 | 휴가 날짜 열은 UTC 저장인데 커넥터가 UTC 날짜만 넘김 | 전용 흐름 카드 식 2곳 |
| 3 | 카드의 링크를 누르면 기안 목록만 보임 | 앱이 링크의 `docNo`를 읽지 않음 | 앱 `StartScreen` + 상세 화면 `OnVisible` |

수식·식 원문: [`01-formulas.txt`](01-formulas.txt)(앱, 게시본) · [`02-flow-expressions.txt`](02-flow-expressions.txt)(흐름)

---

## 1. 카드 중복 — 흐름 3개

`approval_master`를 트리거로 쓰는 흐름이 3개였다.

| 흐름 | 소유 | 트리거 | 상신 때 발화(전) | 조치 |
|---|---|---|---|---|
| 원본 `…결재상신 시 승인 요청하기` | {WORK_ACCOUNT} | 업데이트 | ○ | 필터에 `and cr5f6_draft_no eq null` (사용자가 직접) |
| **휴가 Test** `…_tsk_doc_type eq 0 (휴가) Test` | **{ADMIN_ACCOUNT}** | 만들기 또는 업데이트 | ○ | 필터에 `and cr5f6_draft_no eq null` |
| 전용 `…전자결재 앱 상신 시 승인 요청하기` | {WORK_ACCOUNT} | 만들기 또는 업데이트 | ○ (정상 경로) | 그대로 |

- `기안번호`(`cr5f6_draft_no`)는 이 앱이 **상신할 때만** 채운다 → "비어 있을 때만" 조건이면 상신 이벤트는 걸러진다.
  다른 앱 결재(번호를 안 쓰는)는 영향 없다
- 바로 상신은 행 **생성**이라 원래부터 전용 흐름만 돌았다. 문제는 임시저장(생성) → 상신(**수정**) 경로였다
- 휴가 Test 흐름은 {ADMIN_ACCOUNT} 소유·비공유라 작업 계정에서는 목록·실행 기록이 **아예 안 보였다**.
  임시저장 때는 여전히 한 번 돈다(6초, 카드 없음)

### 범인을 찾은 방법

1. 카드 수는 Dataverse `msdyn_flow_approvals`로 센다 — 제목·생성 시각·결과
2. **소유자(`_ownerid_value`)를 비교**: 원본·전용 흐름 카드는 작업 계정, 남는 카드는 전부 {ADMIN_ACCOUNT} → 다른 계정의 흐름
3. 남는 카드는 **휴가 + 임시저장 → 상신**일 때만 생겼다(일반기안·바로 상신엔 없음) → 휴가 필터 + 수정 트리거
4. 그 계정으로 Power Automate를 열어 `내 흐름`에서 확인

> 비솔루션 흐름은 Dataverse `workflows` 테이블에 안 나온다. 솔루션 밖 흐름은 소유 계정으로 봐야 한다.

## 2. 휴가 날짜 하루 밀림 — 열의 시간대 동작

열 정의(Web API `EntityDefinitions(...)/Attributes/...DateTimeAttributeMetadata`):

| 열 | 형식 | 시간대 동작 | KST 10/12 선택 시 저장 |
|---|---|---|---|
| 휴가시작일·종료일 | DateOnly | **UserLocal** | `10-11T15:00Z` |
| 기안일자·결재기한 | DateOnly | TimeZoneIndependent | `10-12` 그대로 |

- **앱은 정상이다.** 쓸 때 KST→UTC, 읽을 때 UTC→KST로 변환해 화면엔 10/12로 보인다. 앱을 고치면 오히려 화면이 하루 밀린다
- Dataverse 커넥터는 UserLocal DateOnly 값을 **`2026-10-11T00:00:00.0000000`**(시간 잘림, `Z` 없음)으로 준다
  → `convertFromUtc`는 오류, 시간 정보도 없어 정확한 변환 불가
- 이 값은 항상 "KST 날짜 − 1"이므로 `addDays(…, 1)` 후 포맷한다. **사용자가 모두 KST라는 전제**
- 기안일자·결재기한(TZI)은 손대지 않는다. D-1 리마인드도 결재기한(TZI)만 쓰므로 영향 없음

## 3. 카드 링크 → 기안 상세

카드의 항목 링크: `…/play/e/{환경}/a/{앱}?tenantId=…&docNo=doc-###` (흐름이 `tsk_doc_no`를 붙인다)

| 위치 | 변경 |
|---|---|
| `App.StartScreen` | `docNo`가 있으면 `scrElectronicApproval`부터 |
| `scrElectronicApproval.OnVisible` | 열 기안을 `locOpenDocNo`로 정함 — 목록에서 오면 `ctxSelectedApproval.'doc no'`, 링크로 처음 오면 `Param("docNo")`(존재 확인 후) |
| 〃 | `gblDocNoParamUsed`로 링크 값은 **한 번만** 쓴다 → 뒤로가기·`+` 신규는 평소대로 |
| 〃 | `locIsNewMode`·`varApprovalDetail`이 `locOpenDocNo` 기준 |

- 상세 화면이 `ctxSelectedApproval`에서 쓰는 건 `'doc no'` 하나뿐이라 컨텍스트 레코드를 만들 필요가 없었다
- 없는 번호로 열면 `locOpenDocNo`가 비어 신규 작성 화면이 된다

---

## 함정

- **시작 화면 `OnVisible`에서 `Navigate` 불가** — 검사기 오류 "이 화면을 항상 자동으로 벗어나므로 여기에서 탐색을 사용할 수 없습니다". `StartScreen`을 쓴다
- `Param()`은 **게시본 플레이어에서만** 확인된다(Studio 미리보기엔 URL 인수가 없다). 게시 직후엔 "이전 버전 사용 중" 배너 → `새로 고침` 후 확인
- 흐름 식 편집: 긴 `concat`은 칸의 토큰을 지우고 fx 편집기에 **타이핑 → `Escape`**로 커밋. 확인은 `코드 보기`
- 다른 계정 소유 흐름은 공유 목록에도 안 뜬다. 카드 소유자로 계정을 먼저 특정한다

## 확인한 것

| 테스트 | 결과 |
|---|---|
| `YYMMDD-04`~`06` (수정 중) | 전용 흐름 실패(`convertFromUtc`) / 카드 1~2장 / 날짜 밀림 → 원인 추적용 |
| **`YYMMDD-07`** 휴가, 앱 10/12~10/13, 임시저장 → 상신 | **카드 1장**(전용), 카드 날짜 **10-12 ~ 10-13**, 원본·Test 흐름 상신 때 미발화 |
| 링크 `?docNo=doc-###` | 해당 기안 상세가 바로 열림, 뒤로가기 → 목록, `+` → 빈 신규 양식 |
| 게시본 pac diff | `App.StartScreen` 1줄 + `scrElectronicApproval.OnVisible` 3곳뿐 |

## 남은 것

- 결과 메일(완료·반려)을 결재자에게도 참조로 보낼지 — 미정
- 휴가 Test 흐름이 아직 필요한지 — 필요 없으면 끄는 편이 깔끔하다
- 테스트 기안 `YYMMDD-01`~`07` 삭제 — 10/2 D-1 리마인드 확인 뒤
