# 자산 등록 시 `AppendToAccess` 권한 오류

PPT 장표 4. 앱 문제가 아니라 Dataverse 보안 역할 문제. 2026-09-29 역할 수정 완료, **실계정 저장 검증 대기**.

## 원인

자산 테이블(`fnc_asset`)에는 사용자(`systemuser`)를 고르는 조회 열이 셋 있다.

| 열 | 화면 표시 |
|---|---|
| `tsk_registrant` | 등록담당자 |
| `tsk_requester` | 요청자 |
| `tsk_assetmanager` | 자산관리자 (2026-09-28 추가) |

레코드에 사용자를 연결하려면 **사용자 테이블의 AppendTo 권한**(`prvAppendToUser`)이 필요하다.
역할별로 조회한 결과(`RetrieveRolePrivilegesRole`):

| 역할 | `prvAppendToUser` | 자산 Create/Write/Append |
|---|---|---|
| Basic User | 사업부(Local) | 없음 |
| System Customizer | 사업부(Local) | 조직 |
| {APP_USER_ROLE} | **없음** | 조직 |
| {REGISTRAR_TEAM} | 없음 | 조직 |

앱 사용자는 {APP_USER_ROLE} + Basic User 조합이라 **자기 사업부 사용자만** 연결할 수 있다.
다른 사업부 사람(예: 다른 사업부에 속한 {ADMIN_ACCOUNT})을 등록담당자·요청자·자산관리자로 고르고 저장하면 오류가 난다.
시스템 관리자 역할을 가진 팀 구성원은 해당 없다.

장표 3에서 등록담당자 목록을 "{REGISTRAR_TEAM}" 팀으로 바꾸고 팀에 {ADMIN_ACCOUNT}만 넣었기 때문에, 이 수정 없이 게시하면
다른 사업부 사용자는 신규 등록 때마다 오류가 난다.

## 수정

`{APP_USER_ROLE}`(루트 사업부 역할)에 `prvAppendToUser` = **Global(조직)** 추가. 사용자 결정으로 이 역할만 바꿨다.

```js
// Dataverse Web API, 브라우저 탭을 https://{ORG}.crm.dynamics.com/api/data/v9.2/ 에 두고
POST roles({ROLE_ID})/Microsoft.Dynamics.CRM.AddPrivilegesRole
{ "Privileges": [ { "PrivilegeId": "<prvAppendToUser id>", "Depth": "Global", "BusinessUnitId": "<루트 BU>" } ] }
```

- 루트 역할만 바꾸면 사업부별 복사본(6개)에도 반영된다 — 전부 Global 확인
- 권한 함수는 `roles(id)/Microsoft.Dynamics.CRM.RetrieveRolePrivilegesRole()`가 아니라
  **`RetrieveRolePrivilegesRole(RoleId=@p)?@p=<id>`**(비바운드)로 불러야 한다
- 이 권한은 "다른 레코드에 사용자를 연결"만 허용한다. 사용자 정보 수정 권한이 아니다

## 확인할 것

앱 게시 후 **다른 사업부 계정**으로 신규 자산을 만들고 등록담당자를 {ADMIN_ACCOUNT}으로 골라 저장 → 오류 없으면 끝.
만든 테스트 자산은 지운다.
