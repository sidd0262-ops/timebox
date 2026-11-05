'use strict';

/* =========================================================
   타임박스 — 나만 쓰는 노란 메모장 타임박스
   데이터는 이 기기 브라우저(localStorage)에만 저장됩니다.
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'timebox.v1';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_RANK = 10;

/* ---------- 저장 ---------- */
const DEFAULTS = {
  days: {},
  settings: { morningOn: true, morning: '07:00', deadlineOn: true, deadline: '21:00' },
  meta: {},
};
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.days) {
      s.settings = { ...DEFAULTS.settings, ...(s.settings || {}) };
      s.meta = s.meta || {};
      return s;
    }
  } catch (e) { /* 저장소를 못 쓰면 빈 상태로 시작 */ }
  return JSON.parse(JSON.stringify(DEFAULTS));
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장하지 못했어요 (저장 공간 확인)'); }
}

/* ---------- 날짜 ---------- */
const pad2 = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 86400000);
const todayKey = () => keyOf(new Date());
const fmtLong = k => { const d = parseKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`; };
const fmtShort = k => { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()} (${DOW[d.getDay()]})`; };

let T = todayKey();
const day = k => (S.days[k] ||= { dump: '', tasks: [] });
const tasksOf = k => (S.days[k]?.tasks || []);
const findTask = id => day(T).tasks.find(t => t.id === id);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.replace(/\s+/g, '').toLowerCase();

function addTask(k, text, extra = {}) {
  const id = uid();
  const t = { id, origin: id, text, rank: null, status: 'open', star: false, since: k, createdAt: Date.now(), ...extra };
  day(k).tasks.push(t);
  return t;
}

/* 다 못 한 일을 다른 날의 키워드로 옮기기 */
function carryInto(k, task, fromKey) {
  const origin = task.origin || task.id;
  if (tasksOf(k).some(x => (x.origin || x.id) === origin)) return;
  addTask(k, task.text, { origin, star: task.star, since: task.since || fromKey, from: fromKey });
}

/* 지난 날의 끝내지 못한 일 → 오늘 키워드로 자동 이동 */
function rollover() {
  Object.keys(S.days).filter(k => k < T).sort().forEach(k => {
    const d = S.days[k];
    if (d.rolled) return;
    d.tasks.forEach(t => {
      if (t.status === 'open') { t.status = 'carried'; t.carriedTo = T; carryInto(T, t, k); }
    });
    d.rolled = true;
  });
  save();
}

/* =========================================================
   키워드 뽑기 — 막 쏟은 생각에서 할 일만 골라내기
   ========================================================= */
const URGENT = /(꼭|반드시|무조건|마감|오늘\s?까지|오늘\s?안에|급하|급함|급해|중요|당장|잊지\s?말|까먹지\s?말|asap)/i;
const FEELING = /(피곤|졸려|졸리|졸음|힘들|귀찮|짜증|싫다|싫어|배고프|배고파|모르겠|불안|우울|심심|막막|하기\s?싫|머리\s?아프|잠\s?온다|잠\s?와)/;
const LEAD = /^(아+|음+|어+|흠+|으+|그+|근데|그런데|그리고|그래서|일단|우선|먼저|오늘은?|이따가?|이따|나중에|빨리|꼭|반드시|무조건|진짜|정말|좀|아\s?맞다|맞다|그리고\s?또|또|나는?|난|내가|제가|저는?|암튼|아무튼|이제)\s+/;
const TAILS = [
  /\s*[ㅋㅎㅠㅜ~^;!?.]+$/,
  /\s*(까먹지|잊지)\s?(말기|마|말자|말것|말 것)$/,
  /(해야\s?(돼|됨|된다|해|함|겠다|겠어|지|하는데|되는데|할\s?듯|할\s?것|할\s?거|할\s?일)?|해야겠다|하자|할\s?것|할\s?거|할거임|할\s?예정|하려고|하기|해줘|하는\s?거|할\s?일|해야지|하고\s?싶다|하고\s?싶어|해보자|해볼까)$/,
  /\s+\S+야\s?(돼|됨|된다|해|함|겠다|겠어|지|할\s?듯|하는데|되는데)$/,
  /\s*(필요(해|함|하다)?|있음|있다|있어|거든|이다|임|인데|인가|할까|하지|해서|하고)$/,
  /\s+(좀|꼭|빨리|해야|하는|할|오늘|까지|오늘\s?까지|오늘\s?안에|반드시|무조건)$/,
];

function extractKeywords(text) {
  const prepared = text
    .replace(/\s(그리고\s?나서|그리고|그\s?다음에?|그담에|또한?|아니면|다음엔?)\s/g, '\n')
    .replace(/(\S)(하고|하구)\s+(?!싶)/g, '$1\n');
  const parts = prepared.split(/[\n\r.!?,;·•\/]+|\s-\s/);
  const out = [];
  for (const raw of parts) {
    let c = raw.trim().replace(/^[-*•\d.)\s]+/, '');
    if (!c) continue;
    const star = URGENT.test(c);
    if (FEELING.test(c) && c.length < 14 && !star) continue; // 기분만 적은 줄은 건너뜀
    let prev;
    do { prev = c; c = c.replace(LEAD, '').trim(); } while (c !== prev);
    do { prev = c; for (const re of TAILS) c = c.replace(re, '').trim(); } while (c !== prev && c.length > 1);
    if (c.length > 2) c = c.replace(/(을|를)$/, '');
    if (c.length < 2) continue;
    if (c.length > 24) { const cut = c.slice(0, 24); c = (cut.lastIndexOf(' ') > 10 ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + '…'; }
    out.push({ text: c, star });
  }
  const seen = new Set();
  return out.filter(k => { const n = norm(k.text); if (seen.has(n)) return false; seen.add(n); return true; });
}

/* =========================================================
   화면 그리기
   ========================================================= */
function render() {
  renderHeader();
  renderChips();
  renderCells();
  renderExtra();
  renderHistory();
}

function renderHeader() {
  $('#todayDate').textContent = fmtLong(T);
  const live = tasksOf(T).filter(t => t.status === 'open' || t.status === 'done');
  const done = live.filter(t => t.status === 'done').length;
  $('#todayProgress').textContent = live.length ? `${parseKey(T).getFullYear()}년 · 끝낸 일 ${done} / ${live.length}` : `${parseKey(T).getFullYear()}년`;
}

function ageTag(t) {
  if (!t.from) return '';
  const n = diffDays(T, t.since || t.from);
  return n <= 1 ? '어제부터' : `${n}일째`;
}


/* 찢어진 한지 모양: 키워드마다 늘 같은 모양이 나오도록 id로 씨앗을 정함 */
function rng(seedStr) {
  let h = 2166136261;
  for (const ch of String(seedStr)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let x = h; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
function tornPath(rnd, amp) {
  const j = () => (rnd() * amp).toFixed(1);
  const pts = [];
  for (let x = 0; x <= 100; x += 5 + rnd() * 6) pts.push(`${x.toFixed(1)}% ${j()}px`);
  pts.push(`100% ${j()}px`);
  for (let y = 15; y < 100; y += 18 + rnd() * 14) pts.push(`calc(100% - ${j()}px) ${y.toFixed(1)}%`);
  for (let x = 100; x >= 0; x -= 5 + rnd() * 6) pts.push(`${x.toFixed(1)}% calc(100% - ${j()}px)`);
  pts.push(`0% calc(100% - ${j()}px)`);
  for (let y = 85; y > 0; y -= 18 + rnd() * 14) pts.push(`${j()}px ${y.toFixed(1)}%`);
  return `polygon(${pts.join(',')})`;
}

let freshIds = new Set();
function renderChips() {
  const box = $('#chips');
  const list = tasksOf(T).filter(t => t.status === 'open' && t.rank == null)
    .sort((a, b) => (!!b.star - !!a.star) || (!!b.from - !!a.from));
  box.innerHTML = list.length ? '' : '<p class="empty">아직 키워드가 없어요. 생각을 쏟아 보세요.</p>';
  list.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (t.star ? ' star' : '') + (freshIds.has(t.id) ? ' new' : '');
    if (freshIds.has(t.id)) b.style.animationDelay = `${i * 60}ms`;
    const rnd = rng(t.origin || t.id);
    b.style.setProperty('--rot', `${(rnd() * 4 - 2).toFixed(2)}deg`);
    b.innerHTML = `<span class="torn" style="clip-path:${tornPath(rnd, 5)}"><span class="torn-in" style="clip-path:${tornPath(rnd, 3.5)}">${t.star ? '<span class="s">★</span>' : ''}${esc(t.text)}${t.from ? `<em>${ageTag(t)}</em>` : ''}</span></span>`;
    b.onclick = () => openPicker(t.id);
    box.append(b);
  });
  freshIds = new Set();
}

function rankedAt(n) {
  return tasksOf(T).find(t => t.rank === n && (t.status === 'open' || t.status === 'done'));
}

function barsHTML(t) {
  if (t.status === 'done') {
    return `<div class="bars"><span class="donemark">✓ 끝냈어요</span><button class="bar b-undo" data-act="undo" data-id="${t.id}">되돌리기</button></div>`;
  }
  return `<div class="bars">
    <button class="bar b-done" data-act="done" data-id="${t.id}">끝</button>
    <button class="bar b-next" data-act="next" data-id="${t.id}">다음날로 넘기기</button>
    <button class="bar b-del" data-act="del" data-id="${t.id}">키워드 삭제</button>
  </div>`;
}

let flashRank = null;
function renderCells() {
  const ol = $('#cells');
  ol.innerHTML = '';
  for (let n = 1; n <= MAX_RANK; n++) {
    const t = rankedAt(n);
    const li = document.createElement('li');
    li.className = 'cell' + (t ? (t.status === 'done' ? ' done' : '') : ' empty') + (flashRank === n ? ' flash' : '');
    li.innerHTML = `<span class="num">${n}</span><div class="body">${
      t ? `<button class="ctext" data-pick="${t.id}">${t.star ? '<span class="s">★</span>' : ''}${esc(t.text)}</button>${barsHTML(t)}${t.status === 'done' ? '<span class="seal" aria-hidden="true">끝</span>' : ''}`
        : `<span class="placeholder">·</span>`
    }</div>`;
    ol.append(li);
  }
  flashRank = null;
}

function renderExtra() {
  const ts = tasksOf(T);
  const doneLoose = ts.filter(t => t.status === 'done' && t.rank == null);
  const carried = ts.filter(t => t.status === 'carried');
  let html = '';
  if (doneLoose.length) {
    html += `<h2>순위 없이 끝낸 일</h2><ul class="mini">${doneLoose.map(t =>
      `<li><b style="color:var(--done)">✓</b>${esc(t.text)} <button class="plain" data-act="undo" data-id="${t.id}">되돌리기</button></li>`).join('')}</ul>`;
  }
  if (carried.length) {
    html += `<h2 style="margin-top:var(--lh)">내일로 넘긴 일</h2><ul class="mini">${carried.map(t =>
      `<li><b style="color:var(--carry)">→</b>${esc(t.text)}</li>`).join('')}</ul>`;
  }
  $('#extra').innerHTML = html;
}

/* ---------- 동작: 끝 / 다음날로 / 삭제 ---------- */
function act(kind, id) {
  const t = findTask(id);
  if (!t) return;
  if (kind === 'done') { t.status = 'done'; t.doneAt = Date.now(); toast('끝! 잘했어요 ✓'); }
  else if (kind === 'undo') { t.status = 'open'; delete t.doneAt; }
  else if (kind === 'next') {
    t.status = 'carried'; t.carriedTo = addDays(T, 1);
    carryInto(addDays(T, 1), t, T);
    toast('내일 키워드로 넘겼어요 →');
  } else if (kind === 'del') {
    confirmSheet(`“${t.text}”을(를) 완전히 지울까요?`,
      '지우면 다음날로도 넘어가지 않고, 지난 기록에서도 사라져요.',
      '완전 삭제', () => { purge(t); save(); closeSheet(); render(); toast('키워드를 지웠어요'); });
    return;
  }
  save(); render();
}
function purge(t) {
  const origin = t.origin || t.id;
  for (const k in S.days) S.days[k].tasks = S.days[k].tasks.filter(x => (x.origin || x.id) !== origin);
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a) { act(a.dataset.act, a.dataset.id); if (!$('#sheet').hidden && a.closest('#sheet') && a.dataset.act !== 'del') afterSheetAct(); return; }
  const p = e.target.closest('[data-pick]');
  if (p) openPicker(p.dataset.pick);
});
let afterSheetAct = () => closeSheet();

/* =========================================================
   아래에서 올라오는 창
   ========================================================= */
function openSheet(title, html) {
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  $('#scrim').classList.add('on');
  afterSheetAct = () => closeSheet();
  return $('#sheetBody');
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#scrim').classList.remove('on');
}
$('#sheetClose').onclick = closeSheet;
$('#scrim').onclick = closeSheet;

function confirmSheet(title, note, okLabel, onOk) {
  const b = openSheet(title, `<p class="note">${esc(note)}</p>
    <div class="btn-row"><button class="btn light" data-no>취소</button><button class="btn red" data-ok>${esc(okLabel)}</button></div>`);
  $('[data-no]', b).onclick = closeSheet;
  $('[data-ok]', b).onclick = onOk;
}

/* 키워드를 누르면: 1~10 순위 고르기 */
function openPicker(id) {
  const t = findTask(id);
  if (!t) return;
  const nums = Array.from({ length: MAX_RANK }, (_, i) => {
    const n = i + 1;
    const occ = rankedAt(n);
    const cur = t.rank === n;
    const lock = occ && occ !== t && occ.status === 'done';
    return `<button data-n="${n}" class="${cur ? 'cur' : ''} ${occ && !cur ? 'taken' : ''}" ${lock ? 'disabled' : ''}>${n}${occ && !cur ? `<small>${esc(occ.text)}</small>` : ''}</button>`;
  }).join('');
  const b = openSheet(t.rank ? `${t.rank}순위 · 순위 바꾸기` : '몇 순위로 할까요?', `
    <input class="kwedit" value="${esc(t.text)}" aria-label="키워드 고치기">
    <p class="sheet-label">우선순위 (이미 있는 칸을 고르면 서로 자리를 바꿔요)</p>
    <div class="nums">${nums}</div>
    ${t.rank ? '<button class="plain" data-unrank>순위 빼고 키워드로 돌려놓기</button>' : ''}
    ${t.status === 'open' ? `<div class="sheet-bars">
      <button class="bar b-done" data-act="done" data-id="${t.id}">끝</button>
      <button class="bar b-next" data-act="next" data-id="${t.id}">다음날로 넘기기</button>
      <button class="bar b-del" data-act="del" data-id="${t.id}">키워드 삭제</button>
    </div>` : ''}`);
  const input = $('.kwedit', b);
  const commitText = () => { const v = input.value.trim(); if (v && v !== t.text) { t.text = v; save(); render(); } };
  input.addEventListener('change', commitText);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  $$('.nums button', b).forEach(btn => btn.onclick = () => {
    commitText();
    setRank(t, +btn.dataset.n);
    save(); closeSheet(); flashRank = t.rank; render();
    const cell = $$('#cells .cell')[t.rank - 1];
    cell?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('[data-unrank]', b)?.addEventListener('click', () => { t.rank = null; save(); closeSheet(); render(); });
}
function setRank(t, n) {
  const occ = rankedAt(n);
  if (occ && occ !== t) occ.rank = t.rank ?? null; // 자리 바꾸기 (없던 키워드면 원래 칸 키워드는 다시 키워드로)
  t.rank = n;
}

/* 직접 추가 */
$('#addKw').onclick = () => {
  const b = openSheet('키워드 직접 추가', `
    <input class="kwedit" placeholder="예) 은행 들르기" aria-label="새 키워드">
    <label class="setting"><span class="lbl">★ 중요 표시</span><input type="checkbox" class="switch" data-star></label>
    <button class="btn" data-add>추가</button>`);
  const input = $('.kwedit', b);
  setTimeout(() => input.focus(), 50);
  const add = () => {
    const v = input.value.trim();
    if (!v) return;
    const t = addTask(T, v, { star: $('[data-star]', b).checked });
    freshIds.add(t.id); save(); closeSheet(); render();
  };
  $('[data-add]', b).onclick = add;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
};

/* =========================================================
   1단계 시 → 2단계 생각 쏟기
   ========================================================= */
function pickPoem() {
  const P = window.POEMS || [];
  let i = Math.floor(Math.random() * P.length);
  if (P.length > 1 && i === S.meta.poemIdx) i = (i + 1) % P.length;
  S.meta.poemIdx = i; save();
  return P[i];
}
function showPoem() {
  const p = pickPoem();
  if (!p) return showDump();
  $('#poemTitle').textContent = p.title;
  $('#poemPoet').textContent = p.poet;
  $('#poemBody').innerHTML = p.text.split('\n').map((l, i) => `<span style="animation-delay:${0.3 + i * 0.22}s">${esc(l)}</span>`).join('');
  $('#dumpScreen').hidden = true;
  $('#poemScreen').hidden = false;
  $('#poemScreen').scrollTop = 0;
}
function showDump() {
  $('#poemScreen').hidden = true;
  $('#dumpScreen').hidden = false;
  const ta = $('#dumpText');
  ta.value = '';
  setTimeout(() => ta.focus(), 80);
}
function closeScreens() {
  $('#poemScreen').hidden = true;
  $('#dumpScreen').hidden = true;
  maybeDeadlineCheck();
}
$('#poemNext').onclick = showDump;
$('#poemOther').onclick = showPoem;
$$('[data-skip]').forEach(b => b.onclick = closeScreens);
$('#moreDump').onclick = showDump;

$('#dumpGo').onclick = () => {
  const text = $('#dumpText').value.trim();
  if (!text) { closeScreens(); return; }
  const d = day(T);
  d.dump = d.dump ? `${d.dump}\n\n${text}` : text;
  const existing = new Set(d.tasks.map(t => norm(t.text)));
  let added = 0;
  extractKeywords(text).forEach(k => {
    if (existing.has(norm(k.text))) return;
    const t = addTask(T, k.text, { star: k.star });
    freshIds.add(t.id); added++;
  });
  save();
  closeScreens();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(added ? `키워드 ${added}개를 골랐어요 ✎` : '새 키워드가 없어요 · 직접 추가할 수 있어요');
};

/* =========================================================
   알림: 아침 알림 · 마감 확인 알림
   ========================================================= */
const timers = [];
function minutesOf(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

function scheduleAlarms() {
  timers.splice(0).forEach(clearTimeout);
  const plan = (on, hhmm, fn) => {
    if (!on) return;
    const now = new Date();
    const at = new Date(); const [h, m] = hhmm.split(':').map(Number);
    at.setHours(h, m, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    timers.push(setTimeout(() => { fn(); scheduleAlarms(); }, at - now));
  };
  plan(S.settings.morningOn, S.settings.morning, () =>
    notify('☀️ 좋은 아침이에요', '시 한 편 읽고, 오늘 머릿속을 쏟아내 볼까요?'));
  plan(S.settings.deadlineOn, S.settings.deadline, () => {
    const left = openTasks().length;
    notify('🌙 오늘 마감 확인', left ? `남은 일이 ${left}개 있어요. 끝 / 다음날로 / 삭제로 정리해요.` : '오늘 일을 모두 끝냈어요!');
    maybeDeadlineCheck(true);
  });
}
async function notify(title, body) {
  toast(title);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title });
    else new Notification(title, { body, icon: 'icons/icon-192.png' });
  } catch (e) { /* 알림 실패는 조용히 넘어감 */ }
}
const openTasks = () => tasksOf(T).filter(t => t.status === 'open').sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

/* 마감 시간이 지나 앱을 열면 남은 일 정리 창 */
function maybeDeadlineCheck(force) {
  if (!S.settings.deadlineOn) return;
  if (!$('#poemScreen').hidden || !$('#dumpScreen').hidden) return;
  if (!force && (nowMinutes() < minutesOf(S.settings.deadline) || S.meta.deadlineSeen === T)) return;
  if (!openTasks().length) return;
  S.meta.deadlineSeen = T; save();
  showDeadlineSheet();
}
function showDeadlineSheet() {
  const list = openTasks();
  if (!list.length) { closeSheet(); toast('오늘 일 정리 끝! 🌙'); return; }
  openSheet('🌙 오늘 마감 확인', `
    <p class="note">아직 남은 일이 ${list.length}개 있어요. 하나씩 정리해 볼까요? 정리하지 않은 일은 내일 키워드로 자동으로 넘어가요.</p>
    ${list.map(t => `<div class="check-item"><div class="t">${t.rank ? `<b>${t.rank}</b>` : ''}${esc(t.text)}</div>${barsHTML(t)}</div>`).join('')}
    <button class="btn light" data-close>나중에 할게요</button>`);
  $('#sheetBody [data-close]').onclick = closeSheet;
  afterSheetAct = () => showDeadlineSheet();
}

/* ---------- 설정 ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

function permLabel() {
  if (!('Notification' in window)) return '이 브라우저는 알림을 지원하지 않아요';
  return { granted: '알림 허용됨 ✓', denied: '알림이 막혀 있어요 (브라우저 설정에서 허용)', default: '알림 허용하기' }[Notification.permission];
}

$('#settingsOpen').onclick = openSettings;
function openSettings() {
  const st = S.settings;
  const b = openSheet('설정', `
    <label class="setting"><span class="lbl">☀️ 아침 알림<small>시 한 편 + 생각 쏟기로 하루 시작</small></span>
      <input type="checkbox" class="switch" data-k="morningOn" ${st.morningOn ? 'checked' : ''}>
      <input type="time" data-k="morning" value="${st.morning}"></label>
    <label class="setting"><span class="lbl">🌙 마감 확인 알림<small>남은 일을 끝 / 다음날로 / 삭제로 정리</small></span>
      <input type="checkbox" class="switch" data-k="deadlineOn" ${st.deadlineOn ? 'checked' : ''}>
      <input type="time" data-k="deadline" value="${st.deadline}"></label>
    <button class="btn" data-perm ${'Notification' in window && Notification.permission !== 'default' ? 'disabled' : ''}>${permLabel()}</button>
    <button class="btn light" data-ics>📅 휴대폰 달력에 매일 알림 넣기</button>
    <p class="note">앱이 꺼져 있을 때도 확실히 울리게 하려면 위 버튼으로 달력에 매일 반복 알림을 넣어 두세요. (앱 안의 알림은 앱이 열려 있거나 백그라운드에 있을 때 울려요.)</p>

    <p class="sheet-label">앱 설치</p>
    ${isStandalone() ? '<p class="note">이미 앱으로 설치되어 있어요 ✓</p>'
      : installEvt ? '<button class="btn" data-install>홈 화면에 앱으로 설치</button>'
      : `<p class="note">${isIOS ? 'Chrome(또는 Safari) 주소창 옆 공유 버튼(⬆) → “홈 화면에 추가”를 누르세요.' : 'Chrome 메뉴(⋮) → “앱 설치” 또는 “홈 화면에 추가”를 누르세요.'}</p>`}

    <p class="sheet-label">기록 백업 (기록은 이 기기에만 저장돼요)</p>
    <div class="btn-row"><button class="btn light" data-export>내보내기</button><button class="btn light" data-import>불러오기</button></div>
    <input type="file" accept="application/json,.json" data-file hidden>`);

  $$('[data-k]', b).forEach(inp => inp.addEventListener('change', () => {
    S.settings[inp.dataset.k] = inp.type === 'checkbox' ? inp.checked : inp.value;
    save(); scheduleAlarms(); toast('저장했어요');
  }));
  $('[data-perm]', b).onclick = async () => {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
    openSettings();
    if (Notification.permission === 'granted') notify('알림이 켜졌어요', '아침과 마감 시간에 알려 드릴게요.');
  };
  $('[data-ics]', b).onclick = downloadIcs;
  $('[data-install]', b)?.addEventListener('click', async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; openSettings(); });
  $('[data-export]', b).onclick = () => {
    download(`타임박스-백업-${T}.json`, JSON.stringify(S, null, 1), 'application/json');
  };
  const file = $('[data-file]', b);
  $('[data-import]', b).onclick = () => file.click();
  file.onchange = async () => {
    try {
      const data = JSON.parse(await file.files[0].text());
      if (!data.days) throw 0;
      confirmSheet('백업을 불러올까요?', '지금 이 기기의 기록이 백업 파일 내용으로 바뀌어요.', '불러오기', () => {
        S = data; S.settings = { ...DEFAULTS.settings, ...(S.settings || {}) }; S.meta = S.meta || {};
        save(); rollover(); closeSheet(); render(); scheduleAlarms(); toast('불러왔어요');
      });
    } catch (e) { toast('백업 파일이 아니에요'); }
  };
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadIcs() {
  const st = S.settings;
  if (!st.morningOn && !st.deadlineOn) { toast('켜진 알림이 없어요'); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const start = addDays(T, 1).replace(/-/g, '');
  const link = location.href.split('#')[0];
  const ev = (id, hhmm, title, desc) => [
    'BEGIN:VEVENT', `UID:timebox-${id}-${stamp}@timebox`, `DTSTAMP:${stamp}`,
    `DTSTART:${start}T${hhmm.replace(':', '')}00`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
    `SUMMARY:${title}`, `DESCRIPTION:${desc}\\n${link}`, `URL:${link}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT',
  ];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//timebox//KO', 'CALSCALE:GREGORIAN'];
  if (st.morningOn) lines.push(...ev('morning', st.morning, '☀️ 타임박스 · 오늘 생각 쏟기', '시 한 편 읽고 머릿속을 쏟아내 보세요'));
  if (st.deadlineOn) lines.push(...ev('deadline', st.deadline, '🌙 타임박스 · 마감 확인', '남은 일을 끝 · 다음날로 · 삭제로 정리하세요'));
  lines.push('END:VCALENDAR');
  download('타임박스-매일알림.ics', lines.join('\r\n'), 'text/calendar');
  toast('달력 파일을 열어 “추가”를 눌러 주세요');
}

/* =========================================================
   왼쪽 기록 바: 하루 · 7일 · 30일 · 1년
   ========================================================= */
const H = { mode: 'day', anchor: null };
const statsOf = k => {
  const ts = tasksOf(k);
  return { total: ts.length, done: ts.filter(t => t.status === 'done') };
};
const level = n => n === 0 ? '' : n <= 2 ? 'lv1' : n <= 4 ? 'lv2' : n <= 6 ? 'lv3' : 'lv4';

function renderHistory() {
  const a = H.anchor || T;
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === H.mode));
  const d = parseKey(a), y = d.getFullYear(), m = d.getMonth();
  const label = $('#histLabel');
  const body = $('#histBody');

  if (H.mode === 'day') {
    label.textContent = a === T ? `오늘 · ${fmtShort(a)}` : `${y}년 ${fmtShort(a)}`;
    const dd = S.days[a];
    const ts = (dd?.tasks || []).slice().sort((p, q) => (p.rank ?? 99) - (q.rank ?? 99));
    if (!ts.length && !dd?.dump) { body.innerHTML = '<p class="h-empty">이 날의 기록이 없어요</p>'; return; }
    const done = ts.filter(t => t.status === 'done').length;
    const icon = { done: '✓', carried: '→', open: a < T ? '·' : '○' };
    body.innerHTML = `<p class="h-sum">끝낸 일 ${done} / ${ts.length}</p><ul class="h-list">${ts.map(t => `
      <li class="s-${t.status}"><span class="ic">${icon[t.status] || '·'}</span>
      <span class="tx">${t.rank ? `${t.rank}. ` : ''}${esc(t.text)}</span>
      <span class="tg">${t.status === 'done' ? '끝' : t.status === 'carried' ? '다음날로' : a > T ? '예정' : '진행 중'}</span></li>`).join('')}</ul>
      ${dd?.dump ? `<details class="dump"><summary>이 날 쏟아낸 생각</summary><pre>${esc(dd.dump)}</pre></details>` : ''}`;
  }

  if (H.mode === 'week') {
    const start = addDays(a, -6);
    label.textContent = `${fmtShort(start)} – ${fmtShort(a)}`;
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const k = addDays(a, -i);
      const s = statsOf(k);
      html += `<button class="wk ${k === T ? 'today' : ''}" data-goday="${k}">
        <div class="top"><b>${fmtShort(k)}${k === T ? ' · 오늘' : ''}</b><span>${s.total ? `끝 ${s.done.length} / ${s.total}` : '—'}</span></div>
        <div class="names">${s.done.length ? s.done.map(t => '✓ ' + esc(t.text)).join('  ') : (s.total ? '끝낸 일 없음' : '기록 없음')}</div></button>`;
    }
    body.innerHTML = html;
  }

  if (H.mode === 'month') {
    label.textContent = `${y}년 ${m + 1}월`;
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    let html = '<div class="cal">' + DOW.map(w => `<div class="dw">${w}</div>`).join('');
    for (let i = 0; i < first; i++) html += '<div></div>';
    let sum = 0;
    for (let n = 1; n <= days; n++) {
      const k = `${y}-${pad2(m + 1)}-${pad2(n)}`;
      const c = statsOf(k).done.length; sum += c;
      html += `<button class="${level(c)} ${k === T ? 'is-today' : ''}" data-goday="${k}">${n}${c ? `<small>✓${c}</small>` : ''}</button>`;
    }
    body.innerHTML = html + `</div><p class="h-sum" style="margin-top:12px">이번 달 끝낸 일 ${sum}개 · 날짜를 누르면 그날 기록을 봐요</p>`;
  }

  if (H.mode === 'year') {
    label.textContent = `${y}년`;
    let total = 0;
    const cells = Array.from({ length: 12 }, (_, i) => {
      let c = 0;
      const prefix = `${y}-${pad2(i + 1)}-`;
      for (const k in S.days) if (k.startsWith(prefix)) c += statsOf(k).done.length;
      total += c;
      const lv = c === 0 ? '' : c <= 10 ? 'lv1' : c <= 30 ? 'lv2' : c <= 60 ? 'lv3' : 'lv4';
      return `<button class="${lv}" data-gomonth="${prefix}01">${i + 1}월<b>${c}</b><small>끝낸 일</small></button>`;
    }).join('');
    body.innerHTML = `<div class="months">${cells}</div><p class="h-sum" style="margin-top:12px">${y}년에 끝낸 일 ${total}개</p>`;
  }
}

$$('.tabs button').forEach(b => b.onclick = () => { H.mode = b.dataset.mode; renderHistory(); });
$('#histLabel').onclick = () => { H.anchor = T; renderHistory(); };
const step = dir => {
  const a = H.anchor || T;
  if (H.mode === 'day') H.anchor = addDays(a, dir);
  if (H.mode === 'week') H.anchor = addDays(a, 7 * dir);
  if (H.mode === 'month') { const d = parseKey(a); H.anchor = keyOf(new Date(d.getFullYear(), d.getMonth() + dir, 1)); }
  if (H.mode === 'year') { const d = parseKey(a); H.anchor = keyOf(new Date(d.getFullYear() + dir, d.getMonth(), 1)); }
  renderHistory();
};
$('#histPrev').onclick = () => step(-1);
$('#histNext').onclick = () => step(1);
$('#histBody').addEventListener('click', e => {
  const g = e.target.closest('[data-goday]');
  if (g) { H.mode = 'day'; H.anchor = g.dataset.goday; renderHistory(); return; }
  const mo = e.target.closest('[data-gomonth]');
  if (mo) { H.mode = 'month'; H.anchor = mo.dataset.gomonth; renderHistory(); }
});
const setDrawer = on => { document.body.classList.toggle('drawer-open', on); $('#scrimDrawer').classList.toggle('on', on); };
$('#histOpen').onclick = () => setDrawer(true);
$('#histClose').onclick = () => setDrawer(false);
$('#scrimDrawer').onclick = () => setDrawer(false);

/* ---------- 토스트 ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

/* =========================================================
   시작
   ========================================================= */
function startOfDay() {
  T = todayKey();
  H.anchor = null;
  rollover();
  render();
  if (S.meta.flowDate !== T) {   // 오늘 처음 열면: 시 → 생각 쏟기
    S.meta.flowDate = T; save();
    showPoem();
  } else {
    maybeDeadlineCheck();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (todayKey() !== T) startOfDay(); else maybeDeadlineCheck();
  scheduleAlarms();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

startOfDay();
scheduleAlarms();
