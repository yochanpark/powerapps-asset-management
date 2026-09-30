# 결재 테이블과 승인 플로우

상신·반영 수식을 읽기 전에 알아야 하는 배경.

---

## 테이블 두 개

같은 환경에 전자결재 앱이 따로 있고, 결재 데이터는 그 앱의 테이블에 들어간다.
**스키마 변경 없이 연동된다** — 기안유형에 `자산관리`가 이미 있었고,
업무 테이블에도 문서번호를 담을 열이 원래 있었다.

### `approval_master` — 기안 1건

기본 열 `tsk_doc_no`(= `doc no`, 자동 번호). 값은 `doc-97` 같은 문자열이다.

| 열 | 내용 |
|---|---|
| `tsk_name` | 기안제목 |
| `tsk_description` | 기안내용 (서식 있는 텍스트) |
| `tsk_doc_type` | 기안유형 (Choice) |
| `tsk_draft_date` / `tsk_due_date` | 기안일자 / 결재기한 |
| `tsk_current_status` | 현재결재상태 (텍스트) |
| `tsk_cc_users` | 참조자 |
| `tsk_hold_comment` | 보류·반려 사유 |
| `임시저장유무` | Boolean |

**기안유형 전역 Choice**: `0` 휴가 / `1` 일반기안·기타 / **`2` 자산관리** / `3` 경비 / `4` 주문 / `5` 출장

### `approval_route` — 결재선 1행 = 1단계

기본 열 `tsk_approval_masterid`(= `approval master id`). **조회가 아니라 `"doc-N"` 텍스트**로 master를 가리킨다.

| 열 | 내용 |
|---|---|
| `tsk_sequence` | 결재순번 (정수) |
| `tsk_status` | 결재상태 (Choice) |
| `tsk_approver` | 승인자 (systemuser 조회) |
| `tsk_role` | 역할 (텍스트) |
| `tsk_approvecomment` | 결재코멘트 |
| `tsk_action_date` | 서명·승인일시 |

**결재상태 전역 Choice**: `0` 대기 / `1` 진행중 / `2` 승인 / `3` 반려

### 업무 테이블 쪽 연결 고리

`fnc_assetdisposal.tsk_approvaldocno`(전자결재문서번호, 한 줄 텍스트)에 `doc-N`을 적어 기안과 잇는다.
원래 있던 열이라 스키마 변경이 필요 없었다.

---

## `현재결재상태`를 믿지 말 것

`approval_master.현재결재상태`는 텍스트 열이고 **표시용이 아니다.**
승인 플로우는 이 열을 갱신하지 않으므로 상신 시 넣은 `"결재대기"`가 그대로 남는다.

기안 상태는 **항상 `approval_route` 행들로 계산한다.** 전자결재 앱의 판정식을 그대로 따른다:

1. `임시저장유무`가 참 → **임시저장**
2. route에 `반려` 행이 1건 이상 → **반려**
3. route에 `진행중` 행이 1건 이상 → **진행**
4. route 행 수 > 0 이고 **행 수 == 승인 행 수** → **승인완료**
5. 그 외 → **대기**

`03-reflect-onvisible.txt`의 `wAll` / `wOk` / `wNo`가 이 규칙을 옮긴 것이다.

---

## 승인은 앱이 아니라 플로우가 한다

**캔버스 앱만 뒤지면 안 보인다.** `approval_route.결재상태`를 승인/반려로 바꾸는 주체는
Power Automate 플로우이고, 결재자는 **Teams 승인 카드**로 처리한다.

> 앱 3개를 grep하고 "이 환경엔 승인 기능이 없다"고 단정한 적이 있다. 플로우를 안 봤던 것이다.

상신 버튼이 플로우를 `.Run()`으로 호출하지 않으면 **Teams 승인 요청 자체가 나가지 않는다.**
데이터만 Patch하면 결재자가 승인할 방법이 없다.

### 자산관리용 승인 플로우

사내에 이미 있던 승인 플로우를 **복사본으로 저장한 뒤 차이나는 부분만 고쳐서** 만들었다.
액션 20개를 새로 만들지 않는다.

| 액션 | 하는 일 |
|---|---|
| 트리거 (PowerApps V2) | `text`=DocGUID, `text_1`=ApplicantUser |
| master 내용 가져오기 | `tsk_approval_masters` GetItem |
| 기안 신청자 계정 조회 | `systemusers` GetItem |
| route 행 나열 | `$filter: tsk_approval_masterid eq '<doc no>'`<br>`$expand: tsk_approver($select=internalemailaddress)` → 결재자 메일 |
| 파기대상 행 나열 | `cr5f6_fnc_assetdisposals`, `$filter: tsk_approvaldocno eq '<doc no>'` |
| 자산 정보 가져오기 | `cr5f6_fnc_assets`, recordId `@item()?['_tsk_assetid_value']` |
| 상세내용 생성 | 자산코드·자산명·파기사유 마크다운 표 |
| For each (순번 정렬) | route를 `진행중`으로 → **승인 만들기(V2)** → **승인 대기(V2)** → 결과를 route에 기록 |
| 결과 알림 | 승인/반려 Adaptive Card를 Teams로 게시 |

**업무 테이블 후처리는 플로우에 넣지 않는다.** 자산 상태 반영은 앱 `OnVisible`이 한다
(`03-reflect-onvisible.txt`). 플로우는 `approval_route`까지만 책임진다.

기준 플로우와 다른 곳은 네 군데다:
1. 트리거 인자 3개 → **2개** (업무 레코드는 문서번호로 찾으므로 세 번째 인자가 필요 없다)
2. 주문 전용 조회 액션 삭제
3. 품목 나열 → **파기대상 나열**로 교체
4. 업무 상태 갱신 액션 삭제, 카드의 기안유형 표기 변경

### 결재자 계정

작업자 본인 계정은 Teams 권한이 없어 **승인 카드를 받지 못한다.**
Teams 권한이 있는 별도 계정을 결재자로 지정해야 종단 테스트가 된다.

---

## 새 디자이너 편집 함정

- **`코드 보기` 탭은 읽기 전용이다.** 매개 변수 UI로만 편집된다
- **긴 식의 중간 단어만 고치면 저장되지 않는다.** 더블클릭해 바꾸고 `업데이트`를 눌러도
  화면은 멀쩡한데 실제 값은 원본 그대로다 → **전체 교체**할 것.
  클립보드로 새 식을 넣고 필드를 비운 뒤 fx 편집기에서 붙여넣고 `추가`가 확실하다
- **`추가` 첫 클릭이 "이 식에 문제가 있습니다"로 실패해도 한 번 더 누르면 적용된다.**
  카드의 `잘못된 매개 변수` 경고도 대개 일시적이다
- `item()?[...]`을 식 검증기가 거부하면 `items('Apply_to_each')?[...]`로 쓴다.
  저장 시 디자이너가 `item()`으로 정규화한다
- **켜기(활성화)는 흐름 세부 정보 페이지에 없다.**
  솔루션 → 기본 솔루션 → 클라우드 흐름 → 행 `⋮` → 켜기
- 저장 결과는 `workflow.clientdata`를 다시 받아 검증한다 (아래)

---

## 플로우 정의를 읽는 법

플로우 JSON은 Dataverse `workflow` 테이블에 있다. `category = 5`가 최신 흐름, `statecode = 1`이 활성.

```xml
<fetch><entity name="workflow">
  <attribute name="name" /><attribute name="clientdata" />
  <filter><condition attribute="category" operator="eq" value="5" />
          <condition attribute="statecode" operator="eq" value="1" /></filter>
</entity></fetch>
```

`clientdata`가 플로우 전체다. 파일로 받아 `tsk_approval_route`, `shared_approvals`,
`"operationId"` 등을 grep하면 구조가 다 보인다. 디자이너를 클릭해 뒤지는 것보다 빠르다.
