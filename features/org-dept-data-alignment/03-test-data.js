// 여러 팀 확인용 테스트 데이터 — 만들기 / 지우기. 브라우저 콘솔용 (탭: https://{ORG}.crm.dynamics.com/api/data/v9.2/)
// 파기 신청은 번호를 'TEST-DSP-'로 시작해 표시한다. 만든 ID와 바꾼 자산 상태는 출력(LOG)을 파일로 저장해 두고 지울 때 쓴다
// 선택지 값: 신청상태 1 신청 / 파기사유 1 감가상각종료 2 고장 3 파손 4 불용 / 파기방법 1 총무팀반납 2 자체파기
//            보유여부 1 보유 2 미보유 / 미보유사유 1 자산 미확인 2 출고 3 기타 / 자산상태 6 파기신청

const api = (u, o = {}) => fetch('/api/data/v9.2/' + u, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', Prefer: 'return=representation', ...o.headers }, ...o });
const get = async u => (await (await api(u)).json()).value;

// 자산코드 → { id, dept, status }
const A = {}; (await get('cr5f6_fnc_assets?$select=cr5f6_fnc_assetcode,tsk_owndept,tsk_status')).forEach(a => A[a.cr5f6_fnc_assetcode] = { id: a.cr5f6_fnc_assetid, dept: a.tsk_owndept, st: a.tsk_status });
// 보유부서 → 올해 실사 헤더 id
const HD = {}; (await get(`cr5f6_fnc_stocktakes?$select=tsk_dept&$filter=tsk_stockyear eq '${new Date().getFullYear()}'`)).forEach(h => HD[h.tsk_dept] = h.cr5f6_fnc_stocktakeid);

// ── 만들기: 채워서 쓴다
const REQUESTS = [ /* [자산코드, 파기사유, 파기방법] */ ];
const DETAILS  = [ /* [자산코드, 보유여부, 미보유사유?, 상세?] */ ];
const SET_ASSET_STATUS = true;   // 앱처럼 신청 자산의 상태를 파기신청으로 바꿀지

const LOG = { statusBefore: {}, disposal: [], detail: [] };
for (const [c, reason, method] of REQUESTS) {
  const a = A[c];
  const r = await api('cr5f6_fnc_assetdisposals', { method: 'POST', body: JSON.stringify({ cr5f6_fnc_disposalno: 'TEST-DSP-' + c, 'tsk_assetid@odata.bind': `/cr5f6_fnc_assets(${a.id})`, tsk_requestdept: a.dept, tsk_requeststatus: 1, tsk_disposalreason: reason, tsk_disposalmethod: method }) });
  LOG.disposal.push((await r.json()).cr5f6_fnc_assetdisposalid);
  if (SET_ASSET_STATUS) { LOG.statusBefore[c] = a.st; await api(`cr5f6_fnc_assets(${a.id})`, { method: 'PATCH', headers: { 'If-Match': '*' }, body: JSON.stringify({ tsk_status: 6 }) }); }
}
for (const [c, pos, mr, md] of DETAILS) {
  const b = { 'tsk_stocktakeid@odata.bind': `/cr5f6_fnc_stocktakes(${HD[A[c].dept]})`, 'tsk_assetid@odata.bind': `/cr5f6_fnc_assets(${A[c].id})`, cr5f6_fnc_scannedcode: c, tsk_possession: pos };
  if (mr) b.tsk_missingreason = mr; if (md) b.tsk_missingreasondetail = md;
  LOG.detail.push((await (await api('cr5f6_fnc_stocktake_details', { method: 'POST', body: JSON.stringify(b) })).json()).cr5f6_fnc_stocktake_detailid);
}
console.log(JSON.stringify(LOG)); // → 파일로 저장

// ── 지우기: 저장해 둔 LOG를 붙여넣고 실행
async function cleanup(LOG) {
  for (const id of LOG.disposal) console.log('disp', (await api(`cr5f6_fnc_assetdisposals(${id})`, { method: 'DELETE' })).status);
  for (const id of LOG.detail) console.log('det', (await api(`cr5f6_fnc_stocktake_details(${id})`, { method: 'DELETE' })).status);
  for (const [c, st] of Object.entries(LOG.statusBefore)) console.log(c, (await api(`cr5f6_fnc_assets(${A[c].id})`, { method: 'PATCH', headers: { 'If-Match': '*' }, body: JSON.stringify({ tsk_status: st }) })).status);
}
