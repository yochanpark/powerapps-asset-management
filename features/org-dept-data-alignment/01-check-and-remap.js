// 자산 보유부서 ↔ 사업부 이름 점검·재배정 — 브라우저 콘솔용
// 탭을 https://{ORG}.crm.dynamics.com/api/data/v9.2/ 에 두고 실행한다 (로그인 쿠키 사용)
// ① 점검만 먼저 돌리고, ② 재배정은 MAP을 채운 뒤 따로 돌린다. 원래 값은 ①의 출력으로 백업해 둔다

const api = (u, o = {}) => fetch('/api/data/v9.2/' + u, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...o.headers }, ...o });
const get = async u => (await (await api(u)).json()).value;

// ① 점검 — 사업부 이름이 아닌 보유부서 값과 건수
const bu = (await get('businessunits?$select=name')).map(b => b.name);
const allowed = [...bu, '[공용]'];                        // 앱이 저장하는 공용 값
const assets = await get('cr5f6_fnc_assets?$select=cr5f6_fnc_assetcode,tsk_owndept,tsk_status');
const bad = assets.filter(a => !allowed.includes(a.tsk_owndept));
console.table(bad.map(a => ({ id: a.cr5f6_fnc_assetid, code: a.cr5f6_fnc_assetcode, dept: a.tsk_owndept ?? '(빈값)' })));
// → 이 표를 파일로 저장해 둔다(복원용)

// ② 재배정 — 자산코드 → 새 보유부서(사업부 이름 또는 '[공용]')
const MAP = {
  // 'AST-0000-00-0001': '팀A',
};
for (const a of bad) {
  const to = MAP[a.cr5f6_fnc_assetcode];
  if (!to) continue;
  const r = await api(`cr5f6_fnc_assets(${a.cr5f6_fnc_assetid})`, { method: 'PATCH', headers: { 'If-Match': '*' }, body: JSON.stringify({ tsk_owndept: to }) });
  console.log(a.cr5f6_fnc_assetcode, a.tsk_owndept, '->', to, r.status); // 204면 성공
}
