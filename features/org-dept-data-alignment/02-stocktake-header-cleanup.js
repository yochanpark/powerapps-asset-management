// 실사 헤더를 현재 보유부서 기준으로 맞추기 — 브라우저 콘솔용 (탭: https://{ORG}.crm.dynamics.com/api/data/v9.2/)
// 순서: 점검 → 백업 → 새 헤더 만들기(넣는 쪽 먼저) → 상세 0건 재확인 후 옛 헤더 삭제 → 헤더 없는 상세 삭제
// 삭제는 되돌릴 수 없다. 점검 출력을 파일로 저장한 뒤에만 ③④를 돌린다

const api = (u, o = {}) => fetch('/api/data/v9.2/' + u, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...o.headers }, ...o });
const get = async u => (await (await api(u)).json()).value;
const YEAR = String(new Date().getFullYear());

// ① 점검
const depts = [...new Set((await get("cr5f6_fnc_assets?$select=tsk_owndept&$filter=tsk_owndept ne null")).map(a => a.tsk_owndept))];
const headers = await get(`cr5f6_fnc_stocktakes?$select=cr5f6_fnc_stocktakename,tsk_dept,tsk_stockyear,tsk_submitstatus&$filter=tsk_stockyear eq '${YEAR}'`);
const details = await get('cr5f6_fnc_stocktake_details?$select=cr5f6_fnc_scannedcode,_tsk_stocktakeid_value,_tsk_assetid_value,tsk_possession');
const cnt = {}; details.forEach(d => { const k = d._tsk_stocktakeid_value || 'none'; cnt[k] = (cnt[k] || 0) + 1; });
const stale = headers.filter(h => !depts.includes(h.tsk_dept));                 // 자산 보유부서에 없는 헤더
const missing = depts.filter(d => !headers.some(h => h.tsk_dept === d));       // 헤더가 없는 보유부서
const orphans = details.filter(d => !d._tsk_stocktakeid_value);                // 헤더 없는 상세
console.log({ stale: stale.map(h => [h.cr5f6_fnc_stocktakeid, h.tsk_dept, cnt[h.cr5f6_fnc_stocktakeid] || 0]), missing, orphans: orphans.map(o => [o.cr5f6_fnc_stocktake_detailid, o.cr5f6_fnc_scannedcode]) });
// → 이 출력을 파일로 저장(복원용)

// ② 새 헤더 — 앱의 [부서 실사 개시] 버튼과 같은 형식
for (const d of missing) {
  const r = await api('cr5f6_fnc_stocktakes', { method: 'POST', body: JSON.stringify({ cr5f6_fnc_stocktakename: `[${d}] 자산실사 ${YEAR}년`, tsk_dept: d, tsk_stockyear: YEAR, tsk_submitstatus: 1 }) });
  console.log('create', d, r.status); // 204/201
}

// ③ 옛 헤더 삭제 — 삭제 직전에 상세 0건을 다시 확인한다
for (const h of stale) {
  const n = (await get(`cr5f6_fnc_stocktake_details?$select=cr5f6_fnc_stocktake_detailid&$filter=_tsk_stocktakeid_value eq ${h.cr5f6_fnc_stocktakeid}`)).length;
  if (n) { console.log('SKIP (상세 있음)', h.tsk_dept, n); continue; }
  console.log('delete header', h.tsk_dept, (await api(`cr5f6_fnc_stocktakes(${h.cr5f6_fnc_stocktakeid})`, { method: 'DELETE' })).status);
}

// ④ 헤더 없는 상세 삭제 — 화면에는 안 나오지만 중복으로 쌓여 있던 것
for (const o of orphans) {
  console.log('delete detail', o.cr5f6_fnc_scannedcode, (await api(`cr5f6_fnc_stocktake_details(${o.cr5f6_fnc_stocktake_detailid})`, { method: 'DELETE' })).status);
}
